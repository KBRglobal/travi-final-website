import type { ReactNode } from "react";

interface AnswerAuthoritySectionProps {
  questionH2: ReactNode | null;
  answerCapsuleSlot: ReactNode | null;
}

export function AnswerAuthoritySection({ questionH2, answerCapsuleSlot }: AnswerAuthoritySectionProps) {
  return (
    <section 
      className="container mx-auto px-4 md:px-6 lg:px-8 py-10 md:py-14 border-b border-border/40"
      data-testid="section-answer-authority"
    >
      <div className="max-w-4xl mx-auto">
        <h2 
          className="text-xl sm:text-2xl md:text-3xl font-bold mb-6 md:mb-8 tracking-tight"
          style={{ fontFamily: "'Chillax', var(--font-sans)" }}
        >
          {questionH2}
        </h2>
        <div className="bg-gradient-to-br from-muted/50 to-muted/30 rounded-xl p-6 md:p-8 border border-border/40">
          <div className="prose prose-lg max-w-none dark:prose-invert">
            {answerCapsuleSlot}
          </div>
        </div>
      </div>
    </section>
  );
}
