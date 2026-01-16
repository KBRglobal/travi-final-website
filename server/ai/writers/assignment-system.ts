/**
 * Assignment System
 * 
 * Automatically assigns the best writer for each content type/topic
 */

import type { AIWriter } from "./writer-registry";
import { 
  getWriterById, 
  getWritersByContentType, 
  getActiveWriters,
  searchWritersByExpertise 
} from "./writer-registry";

export interface AssignmentRequest {
  contentType: string;
  topic: string;
  keywords: string[];
  targetAudience?: string;
  priority?: 'low' | 'normal' | 'high' | 'urgent';
}

export interface Assignment {
  id: string;
  writerId: string;
  writer: AIWriter;
  contentType: string;
  topic: string;
  status: 'pending' | 'in_progress' | 'review' | 'completed' | 'published';
  matchScore: number;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: Date;
  dueDate?: Date;
}

/**
 * Assign the best writer for a content request
 */
export async function assignWriter(request: AssignmentRequest): Promise<Assignment> {
  const optimalWriter = await getOptimalWriter(request.contentType, request.topic);
  
  if (!optimalWriter) {
    throw new Error('No suitable writer found for this content type');
  }

  const matchScore = calculateMatchScore(optimalWriter, request);
  const dueDate = calculateDueDate(request.priority || 'normal');

  const assignment: Assignment = {
    id: generateAssignmentId(),
    writerId: optimalWriter.id,
    writer: optimalWriter,
    contentType: request.contentType,
    topic: request.topic,
    status: 'pending',
    matchScore,
    priority: request.priority || 'normal',
    createdAt: new Date(),
    dueDate,
  };

  return assignment;
}

/**
 * Get the optimal writer for a content type and topic
 */
export async function getOptimalWriter(
  contentType: string,
  topic: string
): Promise<AIWriter | null> {
  // Get writers who can handle this content type
  const eligibleWriters = getWritersByContentType(contentType);
  
  if (eligibleWriters.length === 0) {
    return null;
  }

  // Score each writer based on topic match
  const scoredWriters = eligibleWriters.map(writer => ({
    writer,
    score: scoreWriterForTopic(writer, topic, contentType),
  }));

  // Sort by score descending
  scoredWriters.sort((a, b) => b.score - a.score);

  // Return the best match
  return scoredWriters[0]?.writer || null;
}

/**
 * Get best writers for a content type (ranked)
 */
export async function getBestWriters(
  contentType: string,
  limit: number = 3
): Promise<AIWriter[]> {
  const eligibleWriters = getWritersByContentType(contentType);
  
  // Sort by expertise relevance and article count
  const rankedWriters = eligibleWriters
    .sort((a, b) => {
      // Primary sort: expertise match
      const aExpertiseMatch = a.expertise.length;
      const bExpertiseMatch = b.expertise.length;
      
      if (aExpertiseMatch !== bExpertiseMatch) {
        return bExpertiseMatch - aExpertiseMatch;
      }
      
      // Secondary sort: experience (article count)
      return b.articleCount - a.articleCount;
    });

  return rankedWriters.slice(0, limit);
}

/**
 * Create a collaborative assignment with multiple writers
 */
export async function createCollaboration(
  writerIds: string[],
  topic: string
): Promise<Assignment> {
  // For now, use the primary writer (first in list)
  const primaryWriter = getWriterById(writerIds[0]);
  
  if (!primaryWriter) {
    throw new Error('Primary writer not found');
  }

  const assignment: Assignment = {
    id: generateAssignmentId(),
    writerId: primaryWriter.id,
    writer: primaryWriter,
    contentType: 'article', // Default for collaborations
    topic,
    status: 'pending',
    matchScore: 95, // High score for manual collaborations
    priority: 'normal',
    createdAt: new Date(),
  };

  return assignment;
}

/**
 * Score a writer's suitability for a specific topic
 */
function scoreWriterForTopic(
  writer: AIWriter,
  topic: string,
  contentType: string
): number {
  let score = 0;
  const topicLower = topic.toLowerCase();
  
  // Base score for handling the content type (40 points)
  if (writer.contentTypes.includes(contentType)) {
    score += 40;
  }

  // Expertise match (up to 40 points)
  const expertiseMatches = writer.expertise.filter(exp => 
    topicLower.includes(exp.toLowerCase()) || 
    exp.toLowerCase().includes(topicLower)
  );
  score += Math.min(expertiseMatches.length * 10, 40);

  // Experience bonus (up to 10 points)
  const experienceScore = Math.min(writer.articleCount / 10, 10);
  score += experienceScore;

  // Activity status (10 points)
  if (writer.isActive) {
    score += 10;
  }

  return Math.min(score, 100);
}

/**
 * Calculate match score for an assignment
 */
function calculateMatchScore(writer: AIWriter, request: AssignmentRequest): number {
  let score = 0;
  const topicLower = request.topic.toLowerCase();
  
  // Content type match (30 points)
  if (writer.contentTypes.includes(request.contentType)) {
    score += 30;
  }

  // Expertise match (40 points)
  const expertiseMatches = writer.expertise.filter(exp =>
    topicLower.includes(exp.toLowerCase()) ||
    request.keywords.some(kw => 
      exp.toLowerCase().includes(kw.toLowerCase())
    )
  );
  score += Math.min(expertiseMatches.length * 10, 40);

  // Keyword match (20 points)
  const keywordMatches = request.keywords.filter(kw =>
    writer.expertise.some(exp =>
      exp.toLowerCase().includes(kw.toLowerCase())
    )
  );
  score += Math.min(keywordMatches.length * 5, 20);

  // Experience (10 points)
  score += Math.min(writer.articleCount / 10, 10);

  return Math.min(score, 100);
}

/**
 * Calculate due date based on priority
 */
function calculateDueDate(priority: 'low' | 'normal' | 'high' | 'urgent'): Date {
  const now = new Date();
  const dueDateMap = {
    urgent: 1,    // 1 day
    high: 2,      // 2 days
    normal: 5,    // 5 days
    low: 10,      // 10 days
  };

  const daysToAdd = dueDateMap[priority];
  const dueDate = new Date(now);
  dueDate.setDate(dueDate.getDate() + daysToAdd);

  return dueDate;
}

/**
 * Generate unique assignment ID
 */
function generateAssignmentId(): string {
  return `assgn_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Get writer recommendations for a topic
 */
export async function getWriterRecommendations(
  topic: string,
  contentType?: string
): Promise<Array<{ writer: AIWriter; score: number; reason: string }>> {
  const activeWriters = getActiveWriters();
  
  const recommendations = activeWriters
    .map(writer => {
      const score = contentType 
        ? scoreWriterForTopic(writer, topic, contentType)
        : scoreWriterForGeneral(writer, topic);
      
      const reason = generateRecommendationReason(writer, topic, score);
      
      return { writer, score, reason };
    })
    .filter(rec => rec.score > 30) // Only return decent matches
    .sort((a, b) => b.score - a.score)
    .slice(0, 5); // Top 5 recommendations

  return recommendations;
}

/**
 * Score writer for general topic (no specific content type)
 */
function scoreWriterForGeneral(writer: AIWriter, topic: string): number {
  let score = 0;
  const topicLower = topic.toLowerCase();
  
  // Expertise match (up to 60 points)
  const expertiseMatches = writer.expertise.filter(exp =>
    topicLower.includes(exp.toLowerCase()) ||
    exp.toLowerCase().includes(topicLower)
  );
  score += Math.min(expertiseMatches.length * 15, 60);

  // Versatility (content types handled) (up to 20 points)
  score += Math.min(writer.contentTypes.length * 4, 20);

  // Experience (up to 20 points)
  score += Math.min(writer.articleCount / 5, 20);

  return Math.min(score, 100);
}

/**
 * Generate explanation for why a writer was recommended
 */
function generateRecommendationReason(
  writer: AIWriter,
  topic: string,
  score: number
): string {
  const topicLower = topic.toLowerCase();
  const matchingExpertise = writer.expertise.filter(exp =>
    topicLower.includes(exp.toLowerCase()) ||
    exp.toLowerCase().includes(topicLower)
  );

  if (score >= 80) {
    return `Perfect match! ${writer.name} specializes in ${matchingExpertise.join(', ') || writer.expertise[0]}.`;
  } else if (score >= 60) {
    return `Great fit. ${writer.name}'s expertise in ${writer.expertise[0]} aligns well with this topic.`;
  } else if (score >= 40) {
    return `Good option. ${writer.name} can bring a unique ${writer.nationality} perspective.`;
  } else {
    return `Alternative choice. ${writer.name} has broad experience across ${writer.contentTypes.length} content types.`;
  }
}

/**
 * Assignment system interface for easy imports
 */
export const assignmentSystem = {
  assignWriter,
  getOptimalWriter,
  getBestWriters,
  createCollaboration,
  getWriterRecommendations,
};
