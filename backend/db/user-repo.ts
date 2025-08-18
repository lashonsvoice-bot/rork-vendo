import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID, createHash } from "node:crypto";

export type SessionRole = "business_owner" | "contractor" | "event_host" | "admin" | "guest" | "local_vendor";
export type UserRecord = {
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
};

const DATA_DIR = path.join(process.cwd(), "backend", "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

async function ensureStorage(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {}
  try {
    await fs.access(USERS_FILE);
  } catch {
    await fs.writeFile(USERS_FILE, JSON.stringify([]), "utf8");
  }
  
  // Ensure default admin and test users exist
  await ensureDefaultAdmin();
}

async function ensureDefaultAdmin(): Promise<void> {
  const users = await readAllRaw();
  const adminExists = users.some(u => u.role === "admin");
  
  if (!adminExists) {
    const defaultAdmin: UserRecord = {
      id: randomUUID(),
      email: "admin@app.com",
      name: "System Administrator",
      role: "admin",
      passwordHash: hashPassword("admin123"),
      createdAt: new Date().toISOString(),
    };
    
    const updated = [...users, defaultAdmin];
    await writeAllRaw(updated);
    console.log("✅ Default admin created:");
    console.log("   Email: admin@app.com");
    console.log("   Password: admin123");
    console.log("   ⚠️  Please change the password after first login!");
  }
  
  // Add test users for each role if they don't exist
  await ensureTestUsers();
}

async function ensureTestUsers(): Promise<void> {
  const users = await readAllRaw();
  const testUsers = [
    {
      email: "business@test.com",
      name: "Test Business Owner",
      role: "business_owner" as SessionRole,
      password: "test123"
    },
    {
      email: "contractor@test.com",
      name: "Test Contractor",
      role: "contractor" as SessionRole,
      password: "test123"
    },
    {
      email: "host@test.com",
      name: "Test Event Host",
      role: "event_host" as SessionRole,
      password: "test123"
    }
  ];
  
  let hasNewUsers = false;
  const updatedUsers = [...users];
  
  for (const testUser of testUsers) {
    const exists = users.some(u => u.email.toLowerCase() === testUser.email.toLowerCase());
    if (!exists) {
      const newUser: UserRecord = {
        id: randomUUID(),
        email: testUser.email,
        name: testUser.name,
        role: testUser.role,
        passwordHash: hashPassword(testUser.password),
        createdAt: new Date().toISOString(),
      };
      updatedUsers.push(newUser);
      hasNewUsers = true;
    }
  }
  
  if (hasNewUsers) {
    await writeAllRaw(updatedUsers);
    console.log("✅ Test users created:");
    console.log("   Business Owner: business@test.com / test123");
    console.log("   Contractor: contractor@test.com / test123");
    console.log("   Event Host: host@test.com / test123");
  }
}

async function readAllRaw(): Promise<UserRecord[]> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {}
  try {
    const raw = await fs.readFile(USERS_FILE, "utf8");
    const data = JSON.parse(raw) as unknown;
    if (Array.isArray(data)) {
      return data as UserRecord[];
    }
    return [];
  } catch {
    return [];
  }
}

async function writeAllRaw(users: UserRecord[]): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {}
  const tmp = USERS_FILE + ".tmp";
  await fs.writeFile(tmp, JSON.stringify(users, null, 2), "utf8");
  await fs.rename(tmp, USERS_FILE);
}

async function readAll(): Promise<UserRecord[]> {
  await ensureStorage();
  return await readAllRaw();
}

async function writeAll(users: UserRecord[]): Promise<void> {
  await ensureStorage();
  await writeAllRaw(users);
}

async function findByEmail(email: string): Promise<UserRecord | null> {
  const all = await readAll();
  const target = email.toLowerCase();
  return all.find((u) => (u?.email ?? "").toLowerCase() === target) ?? null;
}

async function findById(id: string): Promise<UserRecord | null> {
  const all = await readAll();
  return all.find((u) => u?.id === id) ?? null;
}

async function insert(user: UserRecord): Promise<UserRecord> {
  const all = await readAll();
  const exists = all.some((u) => (u?.email ?? "").toLowerCase() === user.email.toLowerCase());
  if (exists) {
    throw new Error("Email already in use");
  }
  const next = [...all, user];
  await writeAll(next);
  return user;
}

async function update(user: UserRecord): Promise<UserRecord> {
  const all = await readAll();
  const index = all.findIndex((u) => u?.id === user.id);
  if (index === -1) {
    throw new Error("User not found");
  }
  const next = [...all];
  next[index] = user;
  await writeAll(next);
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
