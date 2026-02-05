import { eq, desc, sql, db, users, type User, type InsertUser, type UpsertUser } from "./base";

export class UsersStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(sql`LOWER(${users.email}) = LOWER(${email})`);
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(sql`LOWER(${users.username}) = LOWER(${username})`);
    return user;
  }

  async createUserWithPassword(userData: {
    username: string;
    passwordHash: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: "admin" | "editor" | "author" | "contributor" | "viewer";
    isActive?: boolean;
  }): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        username: userData.username,
        passwordHash: userData.passwordHash,
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email || `${userData.username}@local.admin`,
        role: userData.role || "editor",
        isActive: userData.isActive !== false,
      })
      .returning();
    return user;
  }

  async getUsers(): Promise<User[]> {
    return await db.select().from(users).orderBy(desc(users.createdAt));
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser as any)
      .returning();
    return user;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set(data as any)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return true;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData as any)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          email: (userData as any).email,
          firstName: (userData as any).firstName,
          lastName: (userData as any).lastName,
          profileImageUrl: (userData as any).profileImageUrl,
          ...((userData as any).role && { role: (userData as any).role }),
          updatedAt: new Date(),
        } as any,
      })
      .returning();
    return user;
  }
}

export const usersStorage = new UsersStorage();
