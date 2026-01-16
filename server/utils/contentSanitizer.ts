export function sanitizeContentForDatabase(text: string | null | undefined): string {
  if (!text) return "";
  
  let sanitized = text;
  
  sanitized = sanitized.replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{1F900}-\u{1F9FF}]|[\u{1FA00}-\u{1FA6F}]|[\u{1FA70}-\u{1FAFF}]|[\u{231A}-\u{231B}]|[\u{23E9}-\u{23F3}]|[\u{23F8}-\u{23FA}]|[\u{25AA}-\u{25AB}]|[\u{25B6}]|[\u{25C0}]|[\u{25FB}-\u{25FE}]|[\u{2614}-\u{2615}]|[\u{2648}-\u{2653}]|[\u{267F}]|[\u{2693}]|[\u{26A1}]|[\u{26AA}-\u{26AB}]|[\u{26BD}-\u{26BE}]|[\u{26C4}-\u{26C5}]|[\u{26CE}]|[\u{26D4}]|[\u{26EA}]|[\u{26F2}-\u{26F3}]|[\u{26F5}]|[\u{26FA}]|[\u{26FD}]|[\u{2702}]|[\u{2705}]|[\u{2708}-\u{270D}]|[\u{270F}]|[\u{2712}]|[\u{2714}]|[\u{2716}]|[\u{271D}]|[\u{2721}]|[\u{2728}]|[\u{2733}-\u{2734}]|[\u{2744}]|[\u{2747}]|[\u{274C}]|[\u{274E}]|[\u{2753}-\u{2755}]|[\u{2757}]|[\u{2763}-\u{2764}]|[\u{2795}-\u{2797}]|[\u{27A1}]|[\u{27B0}]|[\u{27BF}]|[\u{2934}-\u{2935}]|[\u{2B05}-\u{2B07}]|[\u{2B1B}-\u{2B1C}]|[\u{2B50}]|[\u{2B55}]|[\u{3030}]|[\u{303D}]|[\u{3297}]|[\u{3299}]/gu, "");
  
  sanitized = sanitized.replace(/—/g, " - ");
  sanitized = sanitized.replace(/–/g, " - ");
  
  sanitized = sanitized.replace(/[^\S\n\r]{2,}/g, " ");
  
  sanitized = sanitized.trim();
  
  return sanitized;
}

export function sanitizeArrayContent(items: string[] | null | undefined): string[] {
  if (!items || !Array.isArray(items)) return [];
  return items.map(item => sanitizeContentForDatabase(item));
}

export function sanitizeOctypoOutput(output: {
  introduction?: string;
  whatToExpect?: string[];
  visitorTips?: string[];
  highlights?: string[];
  howToGetThere?: string;
  faqs?: Array<{ question: string; answer: string }>;
  [key: string]: unknown;
}): typeof output {
  return {
    ...output,
    introduction: output.introduction ? sanitizeContentForDatabase(output.introduction) : output.introduction,
    whatToExpect: output.whatToExpect ? sanitizeArrayContent(output.whatToExpect) : output.whatToExpect,
    visitorTips: output.visitorTips ? sanitizeArrayContent(output.visitorTips) : output.visitorTips,
    highlights: output.highlights ? sanitizeArrayContent(output.highlights) : output.highlights,
    howToGetThere: output.howToGetThere ? sanitizeContentForDatabase(output.howToGetThere) : output.howToGetThere,
    faqs: output.faqs ? output.faqs.map(faq => ({
      question: sanitizeContentForDatabase(faq.question),
      answer: sanitizeContentForDatabase(faq.answer)
    })) : output.faqs,
  };
}
