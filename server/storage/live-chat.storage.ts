import {
  eq,
  desc,
  sql,
  and,
  db,
  liveChatConversations,
  liveChatMessages,
  type LiveChatConversation,
  type InsertLiveChatConversation,
  type LiveChatMessage,
  type InsertLiveChatMessage,
} from "./base";

export class LiveChatStorage {
  async getLiveChatConversations(
    status?: string
  ): Promise<(LiveChatConversation & { messages?: LiveChatMessage[] })[]> {
    const conditions = [];
    if (status) {
      conditions.push(eq(liveChatConversations.status, status as any));
    }

    const conversations = await db
      .select()
      .from(liveChatConversations)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(liveChatConversations.lastMessageAt));

    // Get the latest message for each conversation
    const conversationsWithMessages = await Promise.all(
      conversations.map(async conv => {
        const messages = await db
          .select()
          .from(liveChatMessages)
          .where(eq(liveChatMessages.conversationId, conv.id))
          .orderBy(desc(liveChatMessages.createdAt))
          .limit(1);
        return { ...conv, messages };
      })
    );

    return conversationsWithMessages;
  }

  async getLiveChatConversation(
    id: string
  ): Promise<(LiveChatConversation & { messages: LiveChatMessage[] }) | undefined> {
    const [conversation] = await db
      .select()
      .from(liveChatConversations)
      .where(eq(liveChatConversations.id, id));

    if (!conversation) return undefined;

    const messages = await db
      .select()
      .from(liveChatMessages)
      .where(eq(liveChatMessages.conversationId, id))
      .orderBy(liveChatMessages.createdAt);

    return { ...conversation, messages };
  }

  async getLiveChatConversationByVisitor(
    visitorId: string
  ): Promise<LiveChatConversation | undefined> {
    const [conversation] = await db
      .select()
      .from(liveChatConversations)
      .where(
        and(
          eq(liveChatConversations.visitorId, visitorId),
          eq(liveChatConversations.status, "open")
        )
      )
      .orderBy(desc(liveChatConversations.createdAt))
      .limit(1);

    return conversation;
  }

  async createLiveChatConversation(
    data: InsertLiveChatConversation
  ): Promise<LiveChatConversation> {
    const [conversation] = await db
      .insert(liveChatConversations)
      .values(data as any)
      .returning();
    return conversation;
  }

  async updateLiveChatConversation(
    id: string,
    data: Partial<InsertLiveChatConversation>
  ): Promise<LiveChatConversation | undefined> {
    const [conversation] = await db
      .update(liveChatConversations)
      .set({ ...data, updatedAt: new Date() } as any)
      .where(eq(liveChatConversations.id, id))
      .returning();
    return conversation;
  }

  async getLiveChatMessages(conversationId: string, since?: Date): Promise<LiveChatMessage[]> {
    const conditions = [eq(liveChatMessages.conversationId, conversationId)];
    if (since) {
      conditions.push(sql`${liveChatMessages.createdAt} > ${since}`);
    }

    return await db
      .select()
      .from(liveChatMessages)
      .where(and(...conditions))
      .orderBy(liveChatMessages.createdAt);
  }

  async createLiveChatMessage(data: InsertLiveChatMessage): Promise<LiveChatMessage> {
    const [message] = await db
      .insert(liveChatMessages)
      .values(data as any)
      .returning();

    // Update conversation's lastMessageAt and unread count
    await db
      .update(liveChatConversations)
      .set({
        lastMessageAt: new Date(),
        unreadCount: sql`${liveChatConversations.unreadCount} + 1`,
        updatedAt: new Date(),
      } as any)
      .where(eq(liveChatConversations.id, (data as any).conversationId));

    return message;
  }

  async markMessagesAsRead(conversationId: string, senderType: string): Promise<void> {
    // Mark messages from the opposite sender as read
    const oppositeType = senderType === "admin" ? "visitor" : "admin";

    await db
      .update(liveChatMessages)
      .set({ isRead: true } as any)
      .where(
        and(
          eq(liveChatMessages.conversationId, conversationId),
          eq(liveChatMessages.senderType, oppositeType),
          eq((liveChatMessages as any).isRead, false)
        )
      );

    // Reset unread count
    await db
      .update(liveChatConversations)
      .set({ unreadCount: 0 } as any)
      .where(eq(liveChatConversations.id, conversationId));
  }
}

export const liveChatStorage = new LiveChatStorage();
