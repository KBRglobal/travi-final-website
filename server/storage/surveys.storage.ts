import {
  eq,
  desc,
  sql,
  and,
  db,
  surveys,
  surveyResponses,
  type Survey,
  type InsertSurvey,
  type SurveyResponse,
  type InsertSurveyResponse,
} from "./base";

/** Analyze responses for a single question */
function analyzeQuestionResponses(
  questionId: string,
  responses: SurveyResponse[]
): { totalAnswers: number; answerDistribution: Record<string, number> } {
  const answerDistribution: Record<string, number> = {};
  let totalAnswers = 0;

  for (const response of responses) {
    const answer = response.answers[questionId];
    if (answer === undefined || answer === null || answer === "") continue;
    totalAnswers++;
    const answers = Array.isArray(answer) ? answer : [answer];
    for (const a of answers) {
      answerDistribution[a] = (answerDistribution[a] || 0) + 1;
    }
  }

  return { totalAnswers, answerDistribution };
}

export class SurveysStorage {
  async getSurveys(filters?: { status?: string }): Promise<Survey[]> {
    const conditions = [];
    if (filters?.status) {
      conditions.push(eq(surveys.status, filters.status as any));
    }

    return await db
      .select()
      .from(surveys)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(surveys.createdAt));
  }

  async getSurvey(id: string): Promise<Survey | undefined> {
    const [survey] = await db.select().from(surveys).where(eq(surveys.id, id));
    return survey;
  }

  async getSurveyBySlug(slug: string): Promise<Survey | undefined> {
    const [survey] = await db.select().from(surveys).where(eq(surveys.slug, slug));
    return survey;
  }

  async createSurvey(data: InsertSurvey): Promise<Survey> {
    const [survey] = await db
      .insert(surveys)
      .values(data as any)
      .returning();
    return survey;
  }

  async updateSurvey(id: string, data: Partial<InsertSurvey>): Promise<Survey | undefined> {
    const [survey] = await db
      .update(surveys)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(surveys.id, id))
      .returning();
    return survey;
  }

  async deleteSurvey(id: string): Promise<boolean> {
    await db.delete(surveys).where(eq(surveys.id, id));
    return true;
  }

  // Survey Response Methods
  async getSurveyResponses(surveyId: string): Promise<SurveyResponse[]> {
    return await db
      .select()
      .from(surveyResponses)
      .where(eq(surveyResponses.surveyId, surveyId))
      .orderBy(desc(surveyResponses.createdAt));
  }

  async getSurveyResponse(id: string): Promise<SurveyResponse | undefined> {
    const [response] = await db.select().from(surveyResponses).where(eq(surveyResponses.id, id));
    return response;
  }

  async createSurveyResponse(data: InsertSurveyResponse): Promise<SurveyResponse> {
    const [response] = await db
      .insert(surveyResponses)
      .values(data as any)
      .returning();

    // Increment response count on survey
    await db
      .update(surveys)
      .set({
        responseCount: sql`${surveys.responseCount} + 1`,
        updatedAt: new Date(),
      } as any)
      .where(eq(surveys.id, (data as any).surveyId));

    return response;
  }

  async updateSurveyResponse(
    id: string,
    data: Partial<InsertSurveyResponse>
  ): Promise<SurveyResponse | undefined> {
    const [response] = await db
      .update(surveyResponses)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(surveyResponses.id, id))
      .returning();
    return response;
  }

  async deleteSurveyResponse(id: string): Promise<boolean> {
    const [response] = await db.select().from(surveyResponses).where(eq(surveyResponses.id, id));
    if (response) {
      await db.delete(surveyResponses).where(eq(surveyResponses.id, id));
      // Decrement response count
      await db
        .update(surveys)
        .set({
          responseCount: sql`GREATEST(${surveys.responseCount} - 1, 0)`,
        } as any)
        .where(eq(surveys.id, response.surveyId));
    }
    return true;
  }

  async getSurveyAnalytics(surveyId: string): Promise<{
    totalResponses: number;
    completedResponses: number;
    questionAnalytics: Record<
      string,
      {
        totalAnswers: number;
        answerDistribution: Record<string, number>;
      }
    >;
  }> {
    const responses = await this.getSurveyResponses(surveyId);
    const survey = await this.getSurvey(surveyId);

    const questionAnalytics: Record<
      string,
      { totalAnswers: number; answerDistribution: Record<string, number> }
    > = {};

    if (survey?.definition?.questions) {
      for (const question of survey.definition.questions) {
        questionAnalytics[question.id] = analyzeQuestionResponses(question.id, responses);
      }
    }

    return {
      totalResponses: responses.length,
      completedResponses: responses.filter(r => r.isComplete).length,
      questionAnalytics,
    };
  }
}

export const surveysStorage = new SurveysStorage();
