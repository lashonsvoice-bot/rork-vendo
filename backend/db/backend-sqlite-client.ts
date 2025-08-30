/**
 * Backend SQLite Database Client
 * Provides SQL database operations for the backend using better-sqlite3
 */

import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

export interface QueryResult<T = any> {
  rows: T[];
  rowsAffected: number;
  insertId?: number;
}

export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

export function createEntity<T extends BaseEntity>(data: Omit<T, 'id' | 'created_at' | 'updated_at'>): T {
  const now = new Date().toISOString();
  return {
    ...data,
    id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    created_at: now,
    updated_at: now
  } as T;
}

class BackendSQLiteClient {
  private db: Database.Database | null = null;
  private dbPath: string;

  constructor() {
    const dataDir = path.join(process.cwd(), 'backend', 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.dbPath = path.join(dataDir, 'revovend.db');
    console.log('🗄️ Backend SQLite client initializing...');
    this.initialize();
  }

  private initialize(): void {
    try {
      this.db = new Database(this.dbPath);
      this.db.pragma('journal_mode = WAL');
      this.db.pragma('foreign_keys = ON');
      console.log('✅ Backend SQLite database opened successfully');
    } catch (error) {
      console.error('❌ Failed to initialize Backend SQLite:', error);
      throw error;
    }
  }

  async execute(sql: string, params?: any[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    try {
      const stmt = this.db.prepare(sql);
      if (params) {
        stmt.run(...params);
      } else {
        stmt.run();
      }
    } catch (error) {
      console.error('Execute error:', error);
      throw error;
    }
  }

  async query<T = any>(sql: string, params?: any[]): Promise<QueryResult<T>> {
    if (!this.db) throw new Error('Database not initialized');
    try {
      const stmt = this.db.prepare(sql);
      const rows = params ? stmt.all(...params) : stmt.all();
      return {
        rows: rows as T[],
        rowsAffected: 0
      };
    } catch (error) {
      console.error('Query error:', error);
      throw error;
    }
  }

  async insert<T extends BaseEntity>(table: string, data: T): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const columns = Object.keys(data);
    const placeholders = columns.map(() => '?').join(', ');
    const values = columns.map(col => (data as any)[col]);
    
    const sql = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})`;
    
    try {
      const stmt = this.db.prepare(sql);
      stmt.run(...values);
    } catch (error) {
      console.error('Insert error:', error);
      throw error;
    }
  }

  async update(table: string, data: any, where: string, whereParams: any[]): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');
    
    const updates = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const values = Object.values(data);
    
    const sql = `UPDATE ${table} SET ${updates}, updated_at = CURRENT_TIMESTAMP WHERE ${where}`;
    
    try {
      const stmt = this.db.prepare(sql);
      stmt.run(...values, ...whereParams);
    } catch (error) {
      console.error('Update error:', error);
      throw error;
    }
  }

  async findById<T = any>(table: string, id: string): Promise<T | null> {
    const result = await this.query<T>(`SELECT * FROM ${table} WHERE id = ?`, [id]);
    return result.rows[0] || null;
  }

  async findAll<T = any>(table: string, where?: string, whereParams?: any[]): Promise<T[]> {
    let sql = `SELECT * FROM ${table}`;
    if (where) {
      sql += ` WHERE ${where}`;
    }
    const result = await this.query<T>(sql, whereParams);
    return result.rows;
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Singleton instance
let backendSQLiteClient: BackendSQLiteClient | null = null;

export function getSQLiteClient(): BackendSQLiteClient {
  if (!backendSQLiteClient) {
    backendSQLiteClient = new BackendSQLiteClient();
  }
  return backendSQLiteClient;
}