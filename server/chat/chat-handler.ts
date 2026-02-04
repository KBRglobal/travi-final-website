/**
 * Chat Handler - Stateless Contextual Chat System
 *
 * Processes chat requests using the AI Orchestrator for all AI operations.
 * This ensures proper rate limiting, credit tracking, and provider failover.
 *
 * ARCHITECTURE:
 * 1. Receives chat request with message and context
 * 2. Detects intent using keyword matching (no AI call)
 * 3. Submits task to AI Orchestrator for validation/routing
 * 4. If accepted, executes the AI call using the routed provider
 * 5. Resolves all entity links via entity-resolver
 * 6. Returns structured response with validated actions
 *
 * SEARCH ↔ CHAT SYMBIOSIS:
 * - Integrates with unified cognitive layer for intent-aware suggestions
 * - Uses search ranking to enhance entity suggestions
 * - Passes search context to chat for better responses
 *
 * HARD CONSTRAINTS:
 * - All AI requests go through getAIOrchestrator().submitTask()
 * - Category is 'content' for chat tasks
 * - Intent detection is keyword-based (no AI calls)
 * - All entity links must be validated before returning
 * - Graceful fallback if AI unavailable
 */

import { log } from "../lib/logger";
import { getAIOrchestrator } from "../ai-orchestrator";
import { getAllUnifiedProviders, type UnifiedAIProvider } from "../ai/providers";
import {
  getSystemPrompt,
  describeContext,
  type ChatContext,
  type PageContext,
} from "./chat-prompts";
import { detectIntent, describeIntent, type Intent, type IntentResult } from "./intent-detector";
import { resolveEntityLink, type EntityType } from "../navigation/entity-resolver";
import {
  recordChatIntent,
  getDominantIntent,
  getRecentIntents,
  type IntentType,
} from "../session/intent-memory";
import {
  type UnifiedIntentType,
  type SearchResultForChat,
  type SearchEnhancedChatContext,
} from "../../shared/intent-schema";
import {
  getUnifiedIntent,
  applySearchToChat,
  recordIntentSignal,
  getIntentBasedEntitySuggestions,
  describeSearchContextForChat,
} from "../cognitive/unified-layer";
import { publicSearch, type SearchServiceOptions } from "../search/search-service";
import { recordLoopEntry, recordLoopStep } from "../analytics";

/**
 * Chat Request Timeout (30 seconds)
 * Used to cap latency and return safe fallback if exceeded
 */
const CHAT_REQUEST_TIMEOUT_MS = 30000;

/**
 * In-memory metrics tracking for chat fallback rate
 */
interface ChatMetrics {
  totalChatRequests: number;
  fallbacksUsed: number;
  fallbackReasons: Record<string, number>;
  lastReset: Date;
}

const chatMetrics: ChatMetrics = {
  totalChatRequests: 0,
  fallbacksUsed: 0,
  fallbackReasons: {},
  lastReset: new Date(),
};

/**
 * Fallback reason types for tracking
 */
export type FallbackReason =
  | "timeout"
  | "provider_unavailable"
  | "orchestrator_rejected"
  | "credits_low"
  | "provider_error"
  | "unknown_error";

/**
 * Record a fallback usage for metrics
 */
function recordFallback(reason: FallbackReason): void {
  chatMetrics.fallbacksUsed++;
  chatMetrics.fallbackReasons[reason] = (chatMetrics.fallbackReasons[reason] || 0) + 1;
  log.warn(`[Chat] Fallback response used: ${reason}`);
}

/**
 * Increment total chat request counter
 */
function recordChatRequest(): void {
  chatMetrics.totalChatRequests++;
}

/**
 * Get current chat metrics
 */
export function getChatMetrics(): {
  totalChatRequests: number;
  fallbacksUsed: number;
  fallbackRate: number;
  fallbackReasons: Record<string, number>;
  lastReset: string;
} {
  const fallbackRate =
    chatMetrics.totalChatRequests > 0
      ? chatMetrics.fallbacksUsed / chatMetrics.totalChatRequests
      : 0;

  return {
    totalChatRequests: chatMetrics.totalChatRequests,
    fallbacksUsed: chatMetrics.fallbacksUsed,
    fallbackRate: Math.round(fallbackRate * 10000) / 100, // percentage with 2 decimals
    fallbackReasons: { ...chatMetrics.fallbackReasons },
    lastReset: chatMetrics.lastReset.toISOString(),
  };
}

/**
 * Reset chat metrics (for testing or periodic resets)
 */
export function resetChatMetrics(): void {
  chatMetrics.totalChatRequests = 0;
  chatMetrics.fallbacksUsed = 0;
  chatMetrics.fallbackReasons = {};
  chatMetrics.lastReset = new Date();
}

const logger = {
  info: (msg: string, data?: Record<string, unknown>) => log.info(`[ChatHandler] ${msg}`, data),
  warn: (msg: string, data?: Record<string, unknown>) => log.warn(`[ChatHandler] ${msg}`, data),
  error: (msg: string, data?: Record<string, unknown>) =>
    log.error(`[ChatHandler] ${msg}`, undefined, data),
};

/**
 * Chat request input
 */
export interface ChatRequest {
  message: string;
  context: {
    page: PageContext;
    entityId?: string;
    entityName?: string;
  };
  sessionId?: string;
}

/**
 * Resolved entity with validated slug and URL
 */
export interface ResolvedEntity {
  type: EntityType;
  slug: string;
  url: string;
  name?: string;
}

/**
 * Action types for chat responses
 * - navigate: Direct user to a specific page
 * - suggest_destinations: Suggest destination cards to explore
 * - suggest_articles: Suggest article cards to read
 * - next_action: Suggest follow-up actions/questions
 * - summarize: Provide a summary of information
 */
export type ChatActionType =
  | "navigate"
  | "suggest_destinations"
  | "suggest_articles"
  | "next_action"
  | "summarize";

/**
 * Action that the frontend can execute based on AI response
 */
export interface ChatAction {
  type: ChatActionType;
  payload: {
    destination?: ResolvedEntity;
    destinations?: ResolvedEntity[];
    articles?: ResolvedEntity[];
    url?: string;
    suggestions?: string[];
    summary?: string;
    nextActions?: string[];
  };
}

/**
 * Legacy next best action type for backward compatibility
 */
export type NextBestAction = "navigate" | "read_more" | "explore";

/**
 * Unified suggestion type per requirements
 * All entity links are resolved via entity-resolver before returning
 */
export interface Suggestion {
  type: "destination" | "article" | "attraction";
  id: string;
  name: string;
  slug: string;
}

/**
 * Next action type per requirements
 * - navigate: Direct user to a specific entity page
 * - search: Trigger a search action
 * - compare: Show comparison view
 */
export interface NextAction {
  type: "navigate" | "search" | "compare";
  payload: {
    url?: string;
    slug?: string;
    query?: string;
    items?: string[];
  };
}

/**
 * Chat response output with structured suggestions for engagement
 */
export interface ChatResponse {
  answer: string;
  intent?: Intent;
  suggestions?: Suggestion[];
  nextAction?: NextAction | null;
  actions?: ChatAction[];
  suggestedDestinations?: ResolvedEntity[];
  suggestedArticles?: ResolvedEntity[];
  nextBestAction?: NextBestAction;
  isFallback?: boolean;
  fallbackReason?: FallbackReason;
  metadata?: {
    provider?: string;
    taskId?: string;
    latencyMs?: number;
    intentConfidence?: number;
  };
}

/**
 * Fallback messages for different scenarios
 */
const FALLBACK_MESSAGES = {
  timeout:
    "This is taking longer than expected. For faster results, try searching for your question.",
  provider_unavailable:
    "I'm having trouble connecting right now. You can try using the search feature instead.",
  orchestrator_rejected:
    "I'm experiencing high demand right now. Please try again in a few moments, or use the search feature.",
  credits_low:
    "I'm having trouble connecting right now. You can try using the search feature instead.",
  provider_error:
    "I'm having trouble connecting right now. You can try using the search feature instead.",
  unknown_error:
    "I apologize, but I'm currently unable to process your request. Please try using the search feature instead.",
} as const;

/**
 * Create a fallback response with the specified reason
 */
function createFallbackResponse(
  reason: FallbackReason,
  intent: Intent = "browse",
  message?: string
): ChatResponse {
  recordFallback(reason);

  return {
    answer: message || FALLBACK_MESSAGES[reason],
    intent,
    isFallback: true,
    fallbackReason: reason,
    nextBestAction: "explore",
    actions: [
      {
        type: "next_action",
        payload: {
          nextActions: [
            "Use the search feature",
            "Browse popular destinations",
            "Explore our travel guides",
          ],
        },
      },
    ],
  };
}

/**
 * Fallback response when AI is unavailable (legacy constant for compatibility)
 */
const FALLBACK_RESPONSE: ChatResponse = {
  answer: "I'm having trouble connecting right now. You can try using the search feature instead.",
  intent: "browse",
  isFallback: true,
  fallbackReason: "provider_unavailable",
  nextBestAction: "explore",
  actions: [
    {
      type: "next_action",
      payload: {
        nextActions: [
          "Use the search feature",
          "Browse popular destinations",
          "Explore our travel guides",
        ],
      },
    },
  ],
};

/**
 * Determine the next best action based on intent and actions
 */
function determineNextBestAction(intent: Intent, actions: ChatAction[]): NextBestAction {
  // If there's a navigate action, suggest navigation
  const hasNavigate = actions.some(a => a.type === "navigate");
  if (hasNavigate) {
    return "navigate";
  }

  // If there are article suggestions, suggest reading
  const hasArticles = actions.some(a => a.type === "suggest_articles");
  if (hasArticles) {
    return "read_more";
  }

  // Based on intent
  switch (intent) {
    case "learn":
      return "read_more";
    case "browse":
    case "compare":
    case "plan":
    default:
      return "explore";
  }
}

/**
 * Extract suggested destinations from actions
 */
function extractSuggestedDestinations(actions: ChatAction[]): ResolvedEntity[] {
  const destinations: ResolvedEntity[] = [];

  for (const action of actions) {
    if (action.type === "suggest_destinations" && action.payload.destinations) {
      destinations.push(...action.payload.destinations);
    }
    if (action.type === "navigate" && action.payload.destination) {
      if (action.payload.destination.type === "destination") {
        destinations.push(action.payload.destination);
      }
    }
  }

  // Deduplicate by slug
  const seen = new Set<string>();
  return destinations.filter(d => {
    if (seen.has(d.slug)) return false;
    seen.add(d.slug);
    return true;
  });
}

/**
 * Extract suggested articles from actions
 */
function extractSuggestedArticles(actions: ChatAction[]): ResolvedEntity[] {
  const articles: ResolvedEntity[] = [];

  for (const action of actions) {
    if (action.type === "suggest_articles" && action.payload.articles) {
      articles.push(...action.payload.articles);
    }
  }

  // Deduplicate by slug
  const seen = new Set<string>();
  return articles.filter(a => {
    if (seen.has(a.slug)) return false;
    seen.add(a.slug);
    return true;
  });
}

/**
 * Default destination slugs to suggest when browsing
 */
const DEFAULT_DESTINATION_SLUGS = [
  "dubai",
  "paris",
  "tokyo",
  "london",
  "new-york",
  "singapore",
  "barcelona",
  "rome",
  "amsterdam",
  "istanbul",
  "bangkok",
  "hong-kong",
];

/**
 * Build unified suggestions array from resolved entities
 * Per requirements: Array<{ type, id, name, slug }>
 */
function buildUnifiedSuggestions(
  destinations: ResolvedEntity[],
  articles: ResolvedEntity[]
): Suggestion[] {
  const suggestions: Suggestion[] = [];

  for (const dest of destinations) {
    suggestions.push({
      type: "destination",
      id: dest.slug,
      name: dest.name || dest.slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      slug: dest.slug,
    });
  }

  for (const article of articles) {
    suggestions.push({
      type: "article",
      id: article.slug,
      name: article.name || article.slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      slug: article.slug,
    });
  }

  return suggestions;
}

/**
 * Build nextAction based on intent and actions
 * Per requirements: { type: 'navigate' | 'search' | 'compare', payload }
 */
function buildNextAction(
  intent: Intent,
  actions: ChatAction[],
  destinations: ResolvedEntity[]
): NextAction | null {
  const navigateAction = actions.find(a => a.type === "navigate");
  if (navigateAction && navigateAction.payload.url) {
    return {
      type: "navigate",
      payload: {
        url: navigateAction.payload.url,
        slug: navigateAction.payload.destination?.slug,
      },
    };
  }

  if (intent === "compare") {
    const comparisonItems = destinations.slice(0, 2).map(d => d.slug);
    if (comparisonItems.length >= 2) {
      return {
        type: "compare",
        payload: {
          items: comparisonItems,
        },
      };
    }
  }

  if (intent === "browse" && destinations.length > 0) {
    return {
      type: "navigate",
      payload: {
        url: destinations[0].url,
        slug: destinations[0].slug,
      },
    };
  }

  return null;
}

/**
 * Resolve a single entity and return ResolvedEntity if valid
 */
async function resolveEntity(
  type: EntityType,
  slug: string,
  name?: string
): Promise<ResolvedEntity | null> {
  const url = await resolveEntityLink(type, slug);
  if (!url) return null;

  return {
    type,
    slug,
    url,
    name: name || slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
  };
}

/**
 * Resolve multiple entities in parallel, filtering out invalid ones
 */
async function resolveEntities(
  entities: Array<{ type: EntityType; slug: string; name?: string }>
): Promise<ResolvedEntity[]> {
  const results = await Promise.all(entities.map(e => resolveEntity(e.type, e.slug, e.name)));
  return results.filter((e): e is ResolvedEntity => e !== null);
}

/**
 * Parse AI response to extract structured actions with entity resolution
 */
async function parseActionsFromResponse(
  content: string,
  intentResult: IntentResult
): Promise<ChatAction[]> {
  const actions: ChatAction[] = [];

  // Parse navigate markers: [NAVIGATE:destination:slug] or [NAVIGATE:slug]
  const navigatePattern = /\[NAVIGATE:(?:(\w+):)?([^\]]+)\]/gi;
  let match;

  while ((match = navigatePattern.exec(content)) !== null) {
    const entityType = (match[1] as EntityType) || "destination";
    const slug = match[2].trim().toLowerCase().replace(/\s+/g, "-");
    const resolved = await resolveEntity(entityType, slug);

    if (resolved) {
      actions.push({
        type: "navigate",
        payload: { destination: resolved, url: resolved.url },
      });
    }
  }

  // Parse destination suggestions: [DESTINATIONS:slug1,slug2,slug3]
  const destPattern = /\[DESTINATIONS:([^\]]+)\]/gi;
  while ((match = destPattern.exec(content)) !== null) {
    const slugs = match[1].split(",").map(s => s.trim().toLowerCase().replace(/\s+/g, "-"));
    const entities = slugs.map(slug => ({ type: "destination" as EntityType, slug }));
    const resolved = await resolveEntities(entities);

    if (resolved.length > 0) {
      actions.push({
        type: "suggest_destinations",
        payload: { destinations: resolved },
      });
    }
  }

  // Parse article suggestions: [ARTICLES:slug1,slug2,slug3]
  const articlePattern = /\[ARTICLES:([^\]]+)\]/gi;
  while ((match = articlePattern.exec(content)) !== null) {
    const slugs = match[1].split(",").map(s => s.trim().toLowerCase().replace(/\s+/g, "-"));
    const entities = slugs.map(slug => ({ type: "article" as EntityType, slug }));
    const resolved = await resolveEntities(entities);

    if (resolved.length > 0) {
      actions.push({
        type: "suggest_articles",
        payload: { articles: resolved },
      });
    }
  }

  // Parse next actions: [NEXT_ACTIONS:action1,action2,action3]
  const nextActionsPattern = /\[NEXT_ACTIONS:([^\]]+)\]/gi;
  while ((match = nextActionsPattern.exec(content)) !== null) {
    const nextActions = match[1].split(",").map(s => s.trim());
    actions.push({
      type: "next_action",
      payload: { nextActions },
    });
  }

  // Parse summarize: [SUMMARIZE:summary text]
  const summarizePattern = /\[SUMMARIZE:([^\]]+)\]/gi;
  while ((match = summarizePattern.exec(content)) !== null) {
    actions.push({
      type: "summarize",
      payload: { summary: match[1].trim() },
    });
  }

  // Legacy support: [SUGGEST:...] - treat as next_action
  const suggestPattern = /\[SUGGEST:([^\]]+)\]/gi;
  while ((match = suggestPattern.exec(content)) !== null) {
    const suggestions = match[1].split(",").map(s => s.trim());
    actions.push({
      type: "next_action",
      payload: { nextActions: suggestions },
    });
  }

  // Auto-generate destination suggestions based on intent and extracted entities
  if (intentResult.intent === "browse" && intentResult.extractedEntities.destinations?.length) {
    const existingDestActions = actions.filter(a => a.type === "suggest_destinations");
    if (existingDestActions.length === 0) {
      const entities = intentResult.extractedEntities.destinations.map(slug => ({
        type: "destination" as EntityType,
        slug,
      }));
      const resolved = await resolveEntities(entities);

      if (resolved.length > 0) {
        actions.push({
          type: "suggest_destinations",
          payload: { destinations: resolved },
        });
      }
    }
  }

  return actions;
}

/**
 * Clean response text by removing action markers
 */
function cleanResponseText(content: string): string {
  return content
    .replace(/\[NAVIGATE:(?:\w+:)?[^\]]+\]/gi, "")
    .replace(/\[DESTINATIONS:[^\]]+\]/gi, "")
    .replace(/\[ARTICLES:[^\]]+\]/gi, "")
    .replace(/\[NEXT_ACTIONS:[^\]]+\]/gi, "")
    .replace(/\[SUMMARIZE:[^\]]+\]/gi, "")
    .replace(/\[SUGGEST:[^\]]+\]/gi, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Get an AI provider based on orchestrator routing
 */
function getProviderByName(providerName: string): UnifiedAIProvider | null {
  const providers = getAllUnifiedProviders();
  return providers.find(p => p.name === providerName) || providers[0] || null;
}

/**
 * Generate intent-aware system prompt enhancement
 */
function getIntentPromptEnhancement(intentResult: IntentResult): string {
  const { intent, extractedEntities } = intentResult;

  let enhancement = `\n\nDETECTED USER INTENT: ${intent.toUpperCase()}\n`;

  if (extractedEntities.destinations?.length) {
    enhancement += `Mentioned destinations: ${extractedEntities.destinations.join(", ")}\n`;
  }

  if (extractedEntities.contentTypes?.length) {
    enhancement += `Looking for: ${extractedEntities.contentTypes.join(", ")}\n`;
  }

  if (extractedEntities.comparisonTerms?.length) {
    enhancement += `Comparing: ${extractedEntities.comparisonTerms.join(" vs ")}\n`;
  }

  switch (intent) {
    case "browse":
      enhancement += `\nProvide discovery-oriented response. If suggesting destinations, use [DESTINATIONS:slug1,slug2] format.`;
      break;
    case "compare":
      enhancement += `\nProvide balanced comparison. Highlight key differences and help user decide.`;
      break;
    case "plan":
      enhancement += `\nProvide actionable planning advice. Suggest itinerary elements and logistics.`;
      break;
    case "learn":
      enhancement += `\nProvide informative, educational response. Include interesting facts and context.`;
      break;
  }

  enhancement += `\n\nACTION MARKERS YOU CAN USE:
- [NAVIGATE:destination:slug] - Navigate to a specific entity page
- [DESTINATIONS:slug1,slug2,slug3] - Suggest destination cards
- [ARTICLES:slug1,slug2,slug3] - Suggest article cards  
- [NEXT_ACTIONS:action1,action2,action3] - Suggest follow-up questions
- [SUMMARIZE:key points] - Provide a summary

Only use valid slugs for destinations: dubai, paris, tokyo, london, new-york, singapore, barcelona, rome, amsterdam, istanbul, bangkok, hong-kong, abu-dhabi, las-vegas, los-angeles, miami.
`;

  return enhancement;
}

/**
 * Get search-enhanced suggestions based on intent and message
 * Uses search ranking from cognitive layer for better entity suggestions
 */
async function getSearchEnhancedSuggestions(
  message: string,
  intent: UnifiedIntentType,
  sessionId?: string
): Promise<{ results: SearchResultForChat[]; contextDescription: string }> {
  try {
    const preferredTypes = getIntentBasedEntitySuggestions(intent);

    const searchOptions: SearchServiceOptions = {
      query: message,
      limit: 5,
      types: preferredTypes as any,
      sessionId,
      intent,
    };

    const searchResponse = await publicSearch(searchOptions);

    const searchResults: SearchResultForChat[] = searchResponse.results.map(r => ({
      id: r.id,
      type: r.type as any,
      title: r.title,
      slug: r.slug,
      score: r.score,
    }));

    const intentSignals = sessionId ? (getUnifiedIntent(sessionId) as any) : [];
    const contextDescription = (describeSearchContextForChat as any)(searchResults, intentSignals);

    return { results: searchResults, contextDescription };
  } catch (error) {
    logger.warn("Failed to get search-enhanced suggestions", {
      error: error instanceof Error ? error.message : "Unknown",
    });
    return { results: [], contextDescription: "" };
  }
}

/**
 * Convert search results to unified suggestions
 */
async function convertSearchResultsToSuggestions(
  searchResults: SearchResultForChat[]
): Promise<Suggestion[]> {
  const suggestions: Suggestion[] = [];

  for (const result of searchResults) {
    if (
      result.type === "destination" ||
      result.type === "article" ||
      result.type === "attraction"
    ) {
      const url = await resolveEntityLink(result.type, result.slug);
      if (url) {
        suggestions.push({
          type: result.type,
          id: result.id,
          name: result.title,
          slug: result.slug,
        });
      }
    }
  }

  return suggestions;
}

/**
 * Handle a chat request
 *
 * This function:
 * 1. Validates the request
 * 2. Detects intent using keyword matching
 * 3. Gets search-enhanced suggestions via cognitive layer
 * 4. Submits to AI Orchestrator for routing/validation
 * 5. Executes the AI call if accepted (with timeout)
 * 6. Resolves all entity links
 * 7. Returns structured response with search-enhanced suggestions
 *
 * RELIABILITY GUARDRAILS:
 * - 30 second timeout on AI calls
 * - Fallback responses with tracking
 * - Never returns blank/undefined responses
 * - Wrapped in try-catch with guaranteed fallback
 */
export async function handleChatRequest(request: ChatRequest): Promise<ChatResponse> {
  const startTime = Date.now();

  // Always record total requests for metrics
  recordChatRequest();

  // OUTER TRY-CATCH: Ensures we NEVER return blank/throw to caller
  try {
    if (!request.message || !request.message.trim()) {
      logger.warn("Empty message received");
      return {
        answer: "I didn't receive a message. How can I help you with your travel plans?",
        intent: "browse",
        nextBestAction: "explore",
      };
    }

    if (!request.context?.page) {
      logger.warn("Missing page context");
      request.context = { page: "homepage" };
    }

    // Record chat loop entry for growth metrics
    const chatEntryPoint = request.context?.page || "unknown";
    recordLoopEntry("chat", { entryPoint: chatEntryPoint } as any);

    // Detect intent using keyword matching (no AI call)
    const intentResult = detectIntent(request.message);

    // Record intent to memory for future context (if sessionId provided)
    if (request.sessionId) {
      recordChatIntent(request.sessionId, intentResult.intent as IntentType);
      (recordIntentSignal as any)(
        request.sessionId,
        intentResult.intent as UnifiedIntentType,
        intentResult.confidence,
        "chat"
      );
    }

    // Get search-enhanced suggestions via cognitive layer
    const { results: searchResults, contextDescription: searchContext } =
      await getSearchEnhancedSuggestions(
        request.message,
        intentResult.intent as UnifiedIntentType,
        request.sessionId
      );

    // Get recent intents for enhanced context
    const intentMemoryData = request.sessionId
      ? getRecentIntents(request.sessionId)
      : { entities: [], intents: [] };
    const dominantIntent = request.sessionId
      ? getDominantIntent(request.sessionId)
      : intentResult.intent;

    const chatContext: ChatContext = {
      page: request.context.page,
      entityId: request.context.entityId,
      entityName: request.context.entityName,
    };

    logger.info("Processing chat request", {
      messageLength: request.message.length,
      context: describeContext(chatContext),
      intent: describeIntent(intentResult),
      dominantIntent,
      recentIntentsCount: (intentMemoryData as any).intents?.length ?? 0,
      recentEntitiesCount: (intentMemoryData as any).entities?.length ?? 0,
    });

    try {
      const orchestrator = getAIOrchestrator();
      await orchestrator.initialize();

      // Enhance system prompt with intent information and search context
      const baseSystemPrompt = getSystemPrompt(chatContext);
      const intentEnhancement = getIntentPromptEnhancement(intentResult);
      const searchContextEnhancement = searchContext
        ? `\n\nSEARCH CONTEXT:\n${searchContext}\n`
        : "";
      const enhancedSystemPrompt = baseSystemPrompt + intentEnhancement + searchContextEnhancement;

      const taskPayload = {
        type: "chat",
        message: request.message,
        context: chatContext,
        intent: intentResult.intent,
        systemPrompt: enhancedSystemPrompt,
      };

      const submitResponse = await orchestrator.submitTask({
        category: "content",
        priority: "normal",
        payload: taskPayload,
      });

      if (!submitResponse.accepted) {
        logger.warn("Task not accepted by orchestrator", {
          taskId: submitResponse.taskId,
          reason: submitResponse.reason,
        });

        // Check if rejection is due to credits/rate limiting
        const isCreditsIssue =
          submitResponse.reason?.toLowerCase().includes("credit") ||
          submitResponse.reason?.toLowerCase().includes("limit");
        const fallbackReason: FallbackReason = isCreditsIssue
          ? "credits_low"
          : "orchestrator_rejected";

        return createFallbackResponse(fallbackReason, intentResult.intent);
      }

      const providerName = submitResponse.routing?.provider || "anthropic";
      const provider = getProviderByName(providerName);

      if (!provider) {
        logger.error("No AI provider available", {
          requestedProvider: providerName,
        });
        return createFallbackResponse("provider_unavailable", intentResult.intent);
      }

      logger.info("Executing chat with provider", {
        taskId: submitResponse.taskId,
        provider: provider.name,
        intent: intentResult.intent,
      });

      // Execute AI call with timeout wrapper (30 seconds)
      // Use Promise.race with a timeout promise
      let completion: { content: string };
      let timedOut = false;

      const timeoutPromise = new Promise<null>(resolve => {
        setTimeout(() => {
          timedOut = true;
          resolve(null);
        }, CHAT_REQUEST_TIMEOUT_MS);
      });

      const completionPromise = provider.generateCompletion({
        messages: [
          { role: "system", content: enhancedSystemPrompt },
          { role: "user", content: request.message },
        ],
        temperature: 0.7,
        maxTokens: 1024,
      });

      const result = await Promise.race([completionPromise, timeoutPromise]);

      // Handle timeout case
      if (result === null || timedOut) {
        logger.warn("Chat request timed out", {
          taskId: submitResponse.taskId,
          provider: provider.name,
          timeoutMs: CHAT_REQUEST_TIMEOUT_MS,
        });
        return createFallbackResponse("timeout", intentResult.intent);
      }

      completion = result;

      const latencyMs = Date.now() - startTime;

      // Parse actions and resolve all entity links
      const actions = await parseActionsFromResponse(completion.content, intentResult);
      const cleanedAnswer = cleanResponseText(completion.content);

      // Extract structured suggestions from actions
      const suggestedDestinations = extractSuggestedDestinations(actions);
      const suggestedArticles = extractSuggestedArticles(actions);
      const nextBestAction = determineNextBestAction(intentResult.intent, actions);

      // Build unified suggestions and nextAction per requirements
      let suggestions = buildUnifiedSuggestions(suggestedDestinations, suggestedArticles);

      // Merge with search-based suggestions if AI didn't provide enough
      if (suggestions.length < 3 && searchResults.length > 0) {
        const searchBasedSuggestions = await convertSearchResultsToSuggestions(searchResults);
        const existingSlugs = new Set(suggestions.map(s => s.slug));
        for (const searchSugg of searchBasedSuggestions) {
          if (!existingSlugs.has(searchSugg.slug) && suggestions.length < 5) {
            suggestions.push(searchSugg);
            existingSlugs.add(searchSugg.slug);
          }
        }
      }

      const nextAction = buildNextAction(intentResult.intent, actions, suggestedDestinations);

      // Record chat loop exploration step for growth metrics
      (recordLoopStep as any)("chat", "chat_exploration");

      // If suggestions were provided, record deep dive step
      if (suggestions.length > 0 || suggestedDestinations.length > 0) {
        (recordLoopStep as any)("chat", "chat_deep_dive");
      }

      logger.info("Chat request completed", {
        taskId: submitResponse.taskId,
        provider: provider.name,
        latencyMs,
        intent: intentResult.intent,
        confidence: intentResult.confidence,
        hasActions: actions.length > 0,
        actionTypes: actions.map(a => a.type),
        suggestionsCount: suggestions.length,
        searchEnhancedCount: searchResults.length,
        hasNextAction: nextAction !== null,
      });

      return {
        answer: cleanedAnswer || completion.content,
        intent: intentResult.intent,
        suggestions: suggestions.length > 0 ? suggestions : undefined,
        nextAction,
        actions: actions.length > 0 ? actions : undefined,
        suggestedDestinations: suggestedDestinations.length > 0 ? suggestedDestinations : undefined,
        suggestedArticles: suggestedArticles.length > 0 ? suggestedArticles : undefined,
        nextBestAction,
        metadata: {
          provider: provider.name,
          taskId: submitResponse.taskId,
          latencyMs,
          intentConfidence: intentResult.confidence,
        },
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error("Chat request failed", {
        error: errorMessage,
        context: describeContext(chatContext),
        intent: intentResult.intent,
      });

      // Determine if this is a provider error or unknown error
      const isProviderError =
        errorMessage.toLowerCase().includes("provider") ||
        errorMessage.toLowerCase().includes("api") ||
        errorMessage.toLowerCase().includes("connection");

      return createFallbackResponse(
        isProviderError ? "provider_error" : "unknown_error",
        intentResult.intent
      );
    }
  } catch (outerError) {
    // OUTER CATCH: Absolute safety net - never let anything through without a response
    const errorMessage = outerError instanceof Error ? outerError.message : "Unknown error";
    logger.error("Chat handler outer error - returning safe fallback", {
      error: errorMessage,
    });

    return createFallbackResponse("unknown_error", "browse");
  }
}

/**
 * Validate a chat request before processing
 */
export function validateChatRequest(body: unknown): {
  valid: boolean;
  error?: string;
  request?: ChatRequest;
} {
  if (!body || typeof body !== "object") {
    return { valid: false, error: "Request body must be an object" };
  }

  const { message, context } = body as Record<string, unknown>;

  if (typeof message !== "string") {
    return { valid: false, error: "Message must be a string" };
  }

  if (message.length > 2000) {
    return { valid: false, error: "Message too long (max 2000 characters)" };
  }

  if (!context || typeof context !== "object") {
    return { valid: false, error: "Context must be an object" };
  }

  const { page, entityId, entityName } = context as Record<string, unknown>;

  if (!page || !["homepage", "destination", "article"].includes(page as string)) {
    return { valid: false, error: "Context page must be homepage, destination, or article" };
  }

  if (entityId !== undefined && typeof entityId !== "string") {
    return { valid: false, error: "Entity ID must be a string" };
  }

  if (entityName !== undefined && typeof entityName !== "string") {
    return { valid: false, error: "Entity name must be a string" };
  }

  return {
    valid: true,
    request: {
      message: message.trim(),
      context: {
        page: page as PageContext,
        entityId: entityId as string | undefined,
        entityName: entityName as string | undefined,
      },
    },
  };
}

/**
 * Get suggested destinations based on intent (for fallback/default suggestions)
 */
export async function getSuggestedDestinations(limit: number = 6): Promise<ResolvedEntity[]> {
  const entities = DEFAULT_DESTINATION_SLUGS.slice(0, limit).map(slug => ({
    type: "destination" as EntityType,
    slug,
  }));

  return resolveEntities(entities);
}
