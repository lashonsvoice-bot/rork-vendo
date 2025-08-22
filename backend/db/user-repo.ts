import { randomUUID, createHash } from "node:crypto";
import { getSQLiteClient, createEntity, updateEntity, BaseEntity } from './sqlite-client';

export type SessionRole = "business_owner" | "contractor" | "event_host" | "admin" | "guest" | "local_vendor";

export interface UserRecord extends BaseEntity {
  email: string;
  password_hash: string;
  role: SessionRole;
  is_verified: boolean;
  is_suspended: boolean;
  suspended_at?: string;
  suspended_reason?: string;
  last_login_at?: string;
}

// Legacy interface for backward compatibility
export interface LegacyUserRecord {
  id: string;
  email: string;
  name: string;
  role: SessionRole;
  passwordHash: string;
  createdAt: string;
  suspended?: boolean;
  suspendedAt?: string;
  suspendedReason?: string;
  lastLoginAt?: string;
}

const db = getSQLiteClient();

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

async function ensureStorage(): Promise<void> {
  await db.initialize();
  await ensureDefaultAdmin();
}

async function ensureDefaultAdmin(): Promise<void> {
  const adminExists = await db.query<UserRecord>('SELECT * FROM users WHERE role = ? LIMIT 1', ['admin']);
  
  if (adminExists.rows.length === 0) {
    const defaultAdmin = createEntity<UserRecord>({
      id: randomUUID(),
      email: "admin@app.com",
      role: "admin",
      password_hash: hashPassword("admin123"),
      is_verified: true,
      is_suspended: false,
    });
    
    await db.insert('users', defaultAdmin);
    console.log("✅ Default admin created:");
    console.log("   Email: admin@app.com");
    console.log("   Password: admin123");
    console.log("   ⚠️  Please change the password after first login!");
  }
  
  // Add test users for each role if they don't exist
  await ensureTestUsers();
}

async function ensureTestUsers(): Promise<void> {
  const testUsers = [
    {
      email: "business@test.com",
      role: "business_owner" as SessionRole,
      password: "test123"
    },
    {
      email: "contractor@test.com",
      role: "contractor" as SessionRole,
      password: "test123"
    },
    {
      email: "host@test.com",
      role: "event_host" as SessionRole,
      password: "test123"
    }
  ];
  
  let hasNewUsers = false;
  
  for (const testUser of testUsers) {
    const exists = await db.query<UserRecord>('SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1', [testUser.email.toLowerCase()]);
    if (exists.rows.length === 0) {
      const newUser = createEntity<UserRecord>({
        id: randomUUID(),
        email: testUser.email,
        role: testUser.role,
        password_hash: hashPassword(testUser.password),
        is_verified: true,
        is_suspended: false,
      });
      await db.insert('users', newUser);
      hasNewUsers = true;
    }
  }
  
  if (hasNewUsers) {
    console.log("✅ Test users created:");
    console.log("   Business Owner: business@test.com / test123");
    console.log("   Contractor: contractor@test.com / test123");
    console.log("   Event Host: host@test.com / test123");
  }
}

// Convert new UserRecord to legacy format for backward compatibility
function toLegacyFormat(user: UserRecord): LegacyUserRecord {
  return {
    id: user.id,
    email: user.email,
    name: user.email.split('@')[0], // Use email prefix as name fallback
    role: user.role,
    passwordHash: user.password_hash,
    createdAt: user.created_at,
    suspended: user.is_suspended,
    suspendedAt: user.suspended_at,
    suspendedReason: user.suspended_reason,
    lastLoginAt: user.last_login_at,
  };
}

// Convert legacy format to new UserRecord
function fromLegacyFormat(legacy: LegacyUserRecord): UserRecord {
  return {
    id: legacy.id,
    email: legacy.email,
    password_hash: legacy.passwordHash,
    role: legacy.role,
    is_verified: true, // Default to verified for legacy users
    is_suspended: legacy.suspended || false,
    suspended_at: legacy.suspendedAt,
    suspended_reason: legacy.suspendedReason,
    last_login_at: legacy.lastLoginAt,
    created_at: legacy.createdAt,
    updated_at: legacy.createdAt,
  };
}

async function readAll(): Promise<LegacyUserRecord[]> {
  await ensureStorage();
  const result = await db.query<UserRecord>('SELECT * FROM users ORDER BY created_at DESC');
  return result.rows.map(toLegacyFormat);
}

async function writeAll(users: LegacyUserRecord[]): Promise<void> {
  await ensureStorage();
  // This is a destructive operation - clear and repopulate
  await db.execute('DELETE FROM users');
  for (const user of users) {
    const userRecord = fromLegacyFormat(user);
    await db.insert('users', userRecord);
  }
}

async function findByEmail(email: string): Promise<LegacyUserRecord | null> {
  await ensureStorage();
  const result = await db.query<UserRecord>('SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1', [email.toLowerCase()]);
  return result.rows.length > 0 ? toLegacyFormat(result.rows[0]) : null;
}

async function findById(id: string): Promise<LegacyUserRecord | null> {
  await ensureStorage();
  const result = await db.query<UserRecord>('SELECT * FROM users WHERE id = ? LIMIT 1', [id]);
  return result.rows.length > 0 ? toLegacyFormat(result.rows[0]) : null;
}

async function insert(user: LegacyUserRecord): Promise<LegacyUserRecord> {
  await ensureStorage();
  const exists = await db.query<UserRecord>('SELECT * FROM users WHERE LOWER(email) = ? LIMIT 1', [user.email.toLowerCase()]);
  if (exists.rows.length > 0) {
    throw new Error("Email already in use");
  }
  
  const userRecord = fromLegacyFormat(user);
  const result = await db.insert('users', userRecord);
  if (!result.success) {
    throw new Error(result.error || 'Failed to insert user');
  }
  
  return user;
}

async function update(user: LegacyUserRecord): Promise<LegacyUserRecord> {
  await ensureStorage();
  const userRecord = fromLegacyFormat(user);
  const updatedUser = updateEntity(userRecord, userRecord);
  
  const result = await db.update('users', updatedUser, 'id = ?', [user.id]);
  if (!result.success) {
    throw new Error(result.error || 'Failed to update user');
  }
  
  if (result.rowsAffected === 0) {
    throw new Error("User not found");
  }
  
  return user;
}

export async function initializeDatabase(): Promise<void> {
  await ensureStorage();
  console.log('✅ Database initialized');
}

export const userRepo = {
  readAll,
  writeAll,
  findByEmail,
  findById,
  insert,
  update,
};
