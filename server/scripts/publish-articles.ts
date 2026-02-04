// Stub - publish articles script disabled
export async function publishPendingArticles(): Promise<number> {
  return 0;
}
export async function publishAllArticles(): Promise<{
  count: number;
  errors: string[];
  articles: number;
  hotels: number;
}> {
  return { count: 0, errors: [], articles: 0, hotels: 0 };
}
