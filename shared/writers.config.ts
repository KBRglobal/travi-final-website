// Stub - writer personalities removed
export interface VoiceCharacteristics {
  personality?: string;
  tone?: string;
}

export interface WritingStyle {
  tone?: string;
}

export interface WriterPersonality {
  id: string;
  name: string;
  voice: VoiceCharacteristics;
  avatar?: string;
  nationality?: string;
  age?: number;
  expertise?: string[];
  personality?: string;
  writingStyle: WritingStyle;
  background: string;
  category: string;
}

export const WRITERS: WriterPersonality[] = [];
export const EDITOR_IN_CHIEF: WriterPersonality = {
  id: "editor",
  name: "Editor",
  voice: { personality: "Professional", tone: "Professional" },
  writingStyle: { tone: "Professional" },
  background: "Editorial",
  category: "general",
};
export const CATEGORY_LABELS: Record<string, string> = {};
export function getWriterPrompt(_writer: WriterPersonality): string {
  return "";
}
