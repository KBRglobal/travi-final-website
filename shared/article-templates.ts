// Stub - article templates removed
export interface TemplateSection {
  id: string;
  heading: string;
  prompt: string;
}

export interface ArticleTemplate {
  id: string;
  name: string;
  structure: string[];
  sections: TemplateSection[];
  metaTitleFormat?: string;
  metaTitleMaxLength?: number;
  metaDescriptionMaxLength?: number;
}

export const SEO_AEO_TOURISM_TEMPLATE: ArticleTemplate = {
  id: "default",
  name: "Default Template",
  structure: [],
  sections: [],
  metaTitleFormat: "{topic} | Travi",
  metaTitleMaxLength: 60,
  metaDescriptionMaxLength: 160,
};

export const ALL_TEMPLATES: ArticleTemplate[] = [SEO_AEO_TOURISM_TEMPLATE];
export function getTemplateById(_id: string): ArticleTemplate | undefined {
  return SEO_AEO_TOURISM_TEMPLATE;
}
export function getTemplatesForContentType(_type: string): ArticleTemplate[] {
  return ALL_TEMPLATES;
}
export function substituteVariables(text: string, _vars: Record<string, string>): string {
  return text;
}
export function generateTemplatePrompt(
  _template: ArticleTemplate,
  _vars: Record<string, string>
): string {
  return "";
}
