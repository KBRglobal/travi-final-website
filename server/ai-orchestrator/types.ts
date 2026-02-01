/**
 * AI Orchestrator Types (Stub)
 */

export type AIProvider = 'openai' | 'anthropic' | 'google' | 'deepseek';

export type TaskCategory = 
  | 'content-generation'
  | 'translation'
  | 'analysis'
  | 'summarization'
  | 'other';

export interface AITask {
  id: string;
  category: TaskCategory;
  provider: AIProvider;
  status: 'pending' | 'running' | 'completed' | 'failed';
}
