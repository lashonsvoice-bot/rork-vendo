/**
 * SQLite Database Client
 * Provides SQL database operations for the backend
 */

import * as SQLite from 'expo-sqlite';

export interface SQLiteResult {
  success: boolean;
  data?: any;
  error?: string;
  insertId?: number;
  rowsAffected?: number;
}

export interface QueryResult<T = any> {
  rows: T[];
  rowsAffected: number;
  insertId?: number;
}

class SQLiteClient {
  private db: SQLite.SQLiteDatabase | null = null;
  private dbName: string = 'revovend.db';

  constructor() {
    console.log('🗄️ SQLite client initializing...');
  }

  async initialize(): Promise<void> {
    try {
      this.db = await SQLite.openDatabaseAsync(this.dbName);
      console.log('✅ SQLite database opened successfully');
      await this.runMigrations();
    } catch (error) {
      console.error('❌ Failed to initialize SQLite:', error);
      throw error;
    }
  }

  private async runMigrations(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    console.log('🔄 Running database migrations...');

    // Enable foreign keys
    await this.db.execAsync('PRAGMA foreign_keys = ON;');

    // Users table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT,
        role TEXT NOT NULL DEFAULT 'user',
        is_verified BOOLEAN DEFAULT FALSE,
        is_suspended BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Profiles table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS profiles (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        business_name TEXT,
        contact_name TEXT,
        phone TEXT,
        address TEXT,
        city TEXT,
        state TEXT,
        zip_code TEXT,
        business_type TEXT,
        description TEXT,
        website TEXT,
        social_media TEXT, -- JSON string
        profile_image_url TEXT,
        is_verified BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `);

    // Events table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        host_id TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        event_type TEXT NOT NULL,
        date TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        location TEXT NOT NULL,
        address TEXT,
        city TEXT,
        state TEXT,
        zip_code TEXT,
        expected_attendance INTEGER,
        vendor_spots_available INTEGER,
        vendor_fee REAL,
        requirements TEXT, -- JSON string
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (host_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `);

    // Messages table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY,
        sender_id TEXT NOT NULL,
        recipient_id TEXT NOT NULL,
        subject TEXT,
        content TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        message_type TEXT DEFAULT 'direct',
        related_event_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (sender_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (recipient_id) REFERENCES users (id) ON DELETE CASCADE,
        FOREIGN KEY (related_event_id) REFERENCES events (id) ON DELETE SET NULL
      );
    `);

    // Subscriptions table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        plan_type TEXT NOT NULL,
        status TEXT NOT NULL,
        stripe_subscription_id TEXT,
        current_period_start DATETIME,
        current_period_end DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `);

    // Wallets table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS wallets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        balance REAL DEFAULT 0.0,
        pending_balance REAL DEFAULT 0.0,
        stripe_account_id TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `);

    // Wallet transactions table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS wallet_transactions (
        id TEXT PRIMARY KEY,
        wallet_id TEXT NOT NULL,
        amount REAL NOT NULL,
        transaction_type TEXT NOT NULL,
        description TEXT,
        related_event_id TEXT,
        stripe_payment_intent_id TEXT,
        status TEXT DEFAULT 'completed',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (wallet_id) REFERENCES wallets (id) ON DELETE CASCADE,
        FOREIGN KEY (related_event_id) REFERENCES events (id) ON DELETE SET NULL
      );
    `);

    // Business directory table
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS business_directory (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        business_name TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT,
        services TEXT, -- JSON string
        location TEXT,
        contact_info TEXT, -- JSON string
        rating REAL DEFAULT 0.0,
        review_count INTEGER DEFAULT 0,
        is_verified BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
      );
    `);

    // Create indexes for better performance
    await this.db.execAsync('CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);');
    await this.db.execAsync('CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles (user_id);');
    await this.db.execAsync('CREATE INDEX IF NOT EXISTS idx_events_host_id ON events (host_id);');
    await this.db.execAsync('CREATE INDEX IF NOT EXISTS idx_events_date ON events (date);');
    await this.db.execAsync('CREATE INDEX IF NOT EXISTS idx_messages_recipient ON messages (recipient_id);');
    await this.db.execAsync('CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages (sender_id);');
    await this.db.execAsync('CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions (user_id);');
    await this.db.execAsync('CREATE INDEX IF NOT EXISTS idx_wallets_user ON wallets (user_id);');
    await this.db.execAsync('CREATE INDEX IF NOT EXISTS idx_transactions_wallet ON wallet_transactions (wallet_id);');

    console.log('✅ Database migrations completed');
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    if (!this.db) {
      await this.initialize();
    }

    try {
      const result = await this.db!.getAllAsync(sql, params);
      return {
        rows: result as T[],
        rowsAffected: result.length,
      };
    } catch (error) {
      console.error('SQLite query error:', error);
      throw error;
    }
  }

  async execute(sql: string, params: any[] = []): Promise<SQLiteResult> {
    if (!this.db) {
      await this.initialize();
    }

    try {
      const result = await this.db!.runAsync(sql, params);
      return {
        success: true,
        insertId: result.lastInsertRowId,
        rowsAffected: result.changes,
      };
    } catch (error) {
      console.error('SQLite execute error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async transaction(operations: () => Promise<void>): Promise<SQLiteResult> {
    if (!this.db) {
      await this.initialize();
    }

    try {
      await this.db!.withTransactionAsync(operations);
      return { success: true };
    } catch (error) {
      console.error('SQLite transaction error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Utility methods
  async insert(table: string, data: Record<string, any>): Promise<SQLiteResult> {
    const columns = Object.keys(data).join(', ');
    const placeholders = Object.keys(data).map(() => '?').join(', ');
    const values = Object.values(data);

    const sql = `INSERT INTO ${table} (${columns}) VALUES (${placeholders})`;
    return this.execute(sql, values);
  }

  async update(table: string, data: Record<string, any>, where: string, whereParams: any[] = []): Promise<SQLiteResult> {
    const setClause = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const values = [...Object.values(data), ...whereParams];

    const sql = `UPDATE ${table} SET ${setClause} WHERE ${where}`;
    return this.execute(sql, values);
  }

  async delete(table: string, where: string, whereParams: any[] = []): Promise<SQLiteResult> {
    const sql = `DELETE FROM ${table} WHERE ${where}`;
    return this.execute(sql, whereParams);
  }

  async findById<T = any>(table: string, id: string): Promise<T | null> {
    const result = await this.query<T>(`SELECT * FROM ${table} WHERE id = ?`, [id]);
    return result.rows[0] || null;
  }

  async findAll<T = any>(table: string, where?: string, params: any[] = []): Promise<T[]> {
    const sql = where ? `SELECT * FROM ${table} WHERE ${where}` : `SELECT * FROM ${table}`;
    const result = await this.query<T>(sql, params);
    return result.rows;
  }

  // Health check
  async ping(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch (error) {
      console.error('SQLite ping failed:', error);
      return false;
    }
  }

  // Database info
  async getTableInfo(tableName: string): Promise<any[]> {
    const result = await this.query(`PRAGMA table_info(${tableName})`);
    return result.rows;
  }

  async getTables(): Promise<string[]> {
    const result = await this.query(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `);
    return result.rows.map((row: any) => row.name);
  }

  // Close database connection
  async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
      console.log('🔒 SQLite database connection closed');
    }
  }
}

// Singleton instance
let sqliteClient: SQLiteClient | null = null;

export function getSQLiteClient(): SQLiteClient {
  if (!sqliteClient) {
    sqliteClient = new SQLiteClient();
  }
  return sqliteClient;
}

export { SQLiteClient };

// Helper functions for common patterns
export async function withTransaction<T>(
  operation: (client: SQLiteClient) => Promise<T>
): Promise<T> {
  const client = getSQLiteClient();
  let result: T;
  
  await client.transaction(async () => {
    result = await operation(client);
  });
  
  return result!;
}

// Type-safe document operations
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

// Allow any entity shape while guaranteeing base fields are added
export type WithOptionalBase = { id?: string; created_at?: string; updated_at?: string };

export function createEntity<T extends WithOptionalBase>(
  data: Omit<T, 'created_at' | 'updated_at'>
): Omit<T, 'id' | 'created_at' | 'updated_at'> & BaseEntity {
  const now = new Date().toISOString();
  
  const providedId = (data as WithOptionalBase).id;

  return {
    ...(data as Omit<T, 'id' | 'created_at' | 'updated_at'>),
    id: providedId ?? (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`),
    created_at: now,
    updated_at: now,
  };
}

export function updateEntity<T extends BaseEntity>(
  entity: T, 
  updates: Partial<Omit<T, 'id' | 'created_at'>>
): T {
  return {
    ...entity,
    ...updates,
    updated_at: new Date().toISOString()
  };
}