/**
 * Simulation Scenarios - Pre-defined "What If" Scenarios
 * 
 * TASK 9: Simulation Mode
 * 
 * Defines pre-configured simulation scenarios:
 * - 10x traffic: Simulate 10x normal request rate
 * - Provider outage: Simulate specific provider unavailable
 * - Content explosion: Simulate 10x content volume
 * 
 * HARD CONSTRAINTS:
 * - All scenarios are read-only
 * - No production side effects
 * - In-memory calculations only
 */

import type { AIProvider } from '../ai-orchestrator/types';

export type ScenarioType = 'traffic-spike' | 'provider-outage' | 'content-explosion';

export interface BaseScenario {
  id: string;
  name: string;
  description: string;
  type: ScenarioType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  estimatedDuration: string;
}

export interface TrafficSpikeScenario extends BaseScenario {
  type: 'traffic-spike';
  params: {
    multiplier: number;
  };
}

export interface ProviderOutageScenario extends BaseScenario {
  type: 'provider-outage';
  params: {
    provider: AIProvider;
  };
}

export interface ContentExplosionScenario extends BaseScenario {
  type: 'content-explosion';
  params: {
    contentCount: number;
  };
}

export type SimulationScenario = 
  | TrafficSpikeScenario 
  | ProviderOutageScenario 
  | ContentExplosionScenario;

export const PREDEFINED_SCENARIOS: Record<string, SimulationScenario> = {
  'traffic-10x': {
    id: 'traffic-10x',
    name: '10x Traffic Spike',
    description: 'Simulates a sudden 10x increase in request rate, such as during a viral marketing moment or breaking news event.',
    type: 'traffic-spike',
    severity: 'critical',
    estimatedDuration: '~30 minutes to stabilize',
    params: {
      multiplier: 10,
    },
  },

  'traffic-2x': {
    id: 'traffic-2x',
    name: '2x Traffic Increase',
    description: 'Simulates a moderate traffic increase, typical of a successful marketing campaign launch.',
    type: 'traffic-spike',
    severity: 'low',
    estimatedDuration: '~5 minutes to absorb',
    params: {
      multiplier: 2,
    },
  },

  'traffic-5x': {
    id: 'traffic-5x',
    name: '5x Traffic Surge',
    description: 'Simulates a significant traffic surge, such as seasonal peak or major announcement.',
    type: 'traffic-spike',
    severity: 'high',
    estimatedDuration: '~15 minutes to stabilize',
    params: {
      multiplier: 5,
    },
  },

  'outage-anthropic': {
    id: 'outage-anthropic',
    name: 'Anthropic Outage',
    description: 'Simulates complete unavailability of Anthropic (Claude) API, the primary content generation provider.',
    type: 'provider-outage',
    severity: 'critical',
    estimatedDuration: 'Until provider recovers',
    params: {
      provider: 'anthropic',
    },
  },

  'outage-openai': {
    id: 'outage-openai',
    name: 'OpenAI Outage',
    description: 'Simulates complete unavailability of OpenAI API, a secondary content generation provider.',
    type: 'provider-outage',
    severity: 'high',
    estimatedDuration: 'Until provider recovers',
    params: {
      provider: 'openai',
    },
  },

  'outage-gemini': {
    id: 'outage-gemini',
    name: 'Gemini Outage',
    description: 'Simulates unavailability of Google Gemini API.',
    type: 'provider-outage',
    severity: 'medium',
    estimatedDuration: 'Until provider recovers',
    params: {
      provider: 'gemini',
    },
  },

  'outage-freepik': {
    id: 'outage-freepik',
    name: 'Freepik/Image Outage',
    description: 'Simulates unavailability of Freepik image generation API. No alternative image provider available.',
    type: 'provider-outage',
    severity: 'high',
    estimatedDuration: 'Until provider recovers',
    params: {
      provider: 'freepik',
    },
  },

  'content-10x': {
    id: 'content-10x',
    name: '10x Content Volume',
    description: 'Simulates creation of 10x normal content volume (1000 items), such as bulk import or automated content expansion.',
    type: 'content-explosion',
    severity: 'critical',
    estimatedDuration: '~4-6 hours to process',
    params: {
      contentCount: 1000,
    },
  },

  'content-100': {
    id: 'content-100',
    name: 'Bulk Content Import (100)',
    description: 'Simulates importing 100 new content items at once.',
    type: 'content-explosion',
    severity: 'medium',
    estimatedDuration: '~30-60 minutes to process',
    params: {
      contentCount: 100,
    },
  },

  'content-500': {
    id: 'content-500',
    name: 'Large Content Batch (500)',
    description: 'Simulates creating 500 content items, such as a new destination launch with all categories.',
    type: 'content-explosion',
    severity: 'high',
    estimatedDuration: '~2-3 hours to process',
    params: {
      contentCount: 500,
    },
  },

  'multi-provider-outage': {
    id: 'multi-provider-outage',
    name: 'Multiple Provider Outage',
    description: 'Simulates simultaneous outage of Anthropic and OpenAI, testing fallback to tertiary providers.',
    type: 'provider-outage',
    severity: 'critical',
    estimatedDuration: 'Until providers recover',
    params: {
      provider: 'anthropic',
    },
  },
};

export function getScenarioById(id: string): SimulationScenario | undefined {
  return PREDEFINED_SCENARIOS[id];
}

export function getScenariosByType(type: ScenarioType): SimulationScenario[] {
  return Object.values(PREDEFINED_SCENARIOS).filter(s => s.type === type);
}

export function getScenariosBySeverity(severity: SimulationScenario['severity']): SimulationScenario[] {
  return Object.values(PREDEFINED_SCENARIOS).filter(s => s.severity === severity);
}

export function getAllScenarios(): SimulationScenario[] {
  return Object.values(PREDEFINED_SCENARIOS);
}

export function createCustomTrafficScenario(
  id: string,
  name: string,
  multiplier: number
): TrafficSpikeScenario {
  const severity = multiplier <= 2 ? 'low' 
    : multiplier <= 5 ? 'medium' 
    : multiplier <= 10 ? 'high' 
    : 'critical';

  return {
    id,
    name,
    description: `Custom traffic spike scenario with ${multiplier}x multiplier`,
    type: 'traffic-spike',
    severity,
    estimatedDuration: `~${Math.ceil(multiplier * 3)} minutes to stabilize`,
    params: { multiplier },
  };
}

export function createCustomProviderOutageScenario(
  id: string,
  name: string,
  provider: AIProvider
): ProviderOutageScenario {
  const severity = provider === 'anthropic' ? 'critical'
    : provider === 'openai' ? 'high'
    : provider === 'freepik' ? 'high'
    : 'medium';

  return {
    id,
    name,
    description: `Custom provider outage scenario for ${provider}`,
    type: 'provider-outage',
    severity,
    estimatedDuration: 'Until provider recovers',
    params: { provider },
  };
}

export function createCustomContentScenario(
  id: string,
  name: string,
  contentCount: number
): ContentExplosionScenario {
  const severity = contentCount <= 50 ? 'low'
    : contentCount <= 200 ? 'medium'
    : contentCount <= 500 ? 'high'
    : 'critical';

  return {
    id,
    name,
    description: `Custom content explosion scenario with ${contentCount} items`,
    type: 'content-explosion',
    severity,
    estimatedDuration: `~${Math.ceil(contentCount / 100) * 30} minutes to process`,
    params: { contentCount },
  };
}
