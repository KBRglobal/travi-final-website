/**
 * Base Agent - Foundation for all octypo agents
 * Ported from octypo-main Python patterns
 */

import { AgentPersona, AgentMessage } from '../types';
import { EngineRegistry, EngineConfig, generateWithEngine } from '../../services/engine-registry';

export abstract class BaseAgent {
  protected persona: AgentPersona;
  protected memory: Map<string, any> = new Map();
  protected messageHistory: AgentMessage[] = [];
  
  constructor(persona: AgentPersona) {
    this.persona = persona;
  }

  get id(): string {
    return this.persona.id;
  }

  get name(): string {
    return this.persona.name;
  }

  get specialty(): string {
    return this.persona.specialty;
  }

  /**
   * TRUE QUEUE SYSTEM: Get next engine using round-robin
   * Each call gets the NEXT engine in the queue, not the first available
   * This ensures all API keys are used evenly
   */
  protected getPreferredEngine(excludeIds: Set<string> = new Set()): EngineConfig | null {
    // Use the new round-robin method that distributes load across ALL matching engines
    const engine = EngineRegistry.getNextByProviderPreference(
      this.persona.preferredEngines,
      excludeIds
    );
    
    if (engine) {
      return engine;
    }
    
    // Fallback to global queue if no preferred engines available
    return EngineRegistry.getNextFromQueue(excludeIds);
  }

  protected async callLLM(systemPrompt: string, userPrompt: string, timeoutMs: number = 45000): Promise<string> {
    const MAX_ENGINE_RETRIES = 3;
    const triedEngines = new Set<string>();
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < MAX_ENGINE_RETRIES; attempt++) {
      const engine = this.getPreferredEngine(triedEngines);
      if (!engine) {
        const healthyCount = EngineRegistry.getAllEngines().filter(e => e.isHealthy).length;
        throw new Error(`No available engine for agent ${this.name} (tried ${triedEngines.size}, healthy: ${healthyCount}). Last error: ${lastError?.message}`);
      }

      triedEngines.add(engine.id);

      // Health check RIGHT BEFORE API call - prevents concurrent workers from hitting suspended engine
      if (!engine.isHealthy) {
        continue;
      }

      try {
        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(() => reject(new Error(`LLM call timeout after ${timeoutMs}ms`)), timeoutMs);
        });
        
        const response = await Promise.race([
          generateWithEngine(engine, systemPrompt, userPrompt),
          timeoutPromise
        ]);
        
        EngineRegistry.reportSuccess(engine.id);
        return response;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        lastError = error instanceof Error ? error : new Error(errorMsg);
        EngineRegistry.reportError(engine.id, errorMsg);
        
        const isRateLimit = errorMsg.includes('429') || errorMsg.includes('rate limit') || errorMsg.includes('RATELIMIT');
        if (isRateLimit) {
          continue;
        }
        
        console.log(`[${this.name}] Engine ${engine.name} failed: ${errorMsg}, trying next engine...`);
      }
    }

    throw lastError || new Error(`Failed after ${MAX_ENGINE_RETRIES} engine attempts`);
  }

  protected remember(key: string, value: any): void {
    this.memory.set(key, value);
  }

  protected recall(key: string): any {
    return this.memory.get(key);
  }

  protected log(message: string): void {
    console.log(`[${this.name}] ${message}`);
  }

  abstract execute(task: any): Promise<any>;
}

export class AgentRegistry {
  private static agents: Map<string, BaseAgent> = new Map();

  static register(agent: BaseAgent): void {
    this.agents.set(agent.id, agent);
    console.log(`[AgentRegistry] Registered agent: ${agent.name} (${agent.specialty})`);
  }

  static get(agentId: string): BaseAgent | undefined {
    return this.agents.get(agentId);
  }

  static getBySpecialty(specialty: string): BaseAgent | undefined {
    for (const agent of this.agents.values()) {
      if (agent.specialty.toLowerCase().includes(specialty.toLowerCase())) {
        return agent;
      }
    }
    return undefined;
  }

  static getAllWriters(): BaseAgent[] {
    return Array.from(this.agents.values()).filter(a => 
      a.id.startsWith('writer-')
    );
  }

  static getAllValidators(): BaseAgent[] {
    return Array.from(this.agents.values()).filter(a => 
      a.id.startsWith('validator-')
    );
  }

  static getAll(): BaseAgent[] {
    return Array.from(this.agents.values());
  }
}

export class MessageBus {
  private static subscribers: Map<string, ((message: AgentMessage) => void)[]> = new Map();

  static subscribe(agentId: string, handler: (message: AgentMessage) => void): void {
    if (!this.subscribers.has(agentId)) {
      this.subscribers.set(agentId, []);
    }
    this.subscribers.get(agentId)!.push(handler);
  }

  static publish(message: AgentMessage): void {
    const handlers = this.subscribers.get(message.to) || [];
    handlers.forEach(handler => handler(message));
  }

  static broadcast(fromAgent: string, type: AgentMessage['type'], content: any): void {
    const allAgents = AgentRegistry.getAll();
    for (const agent of allAgents) {
      if (agent.id !== fromAgent) {
        this.publish({
          from: fromAgent,
          to: agent.id,
          type,
          content,
          timestamp: new Date(),
        });
      }
    }
  }
}
