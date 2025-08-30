/**
 * Script to create an ambassador account for testing
 */

const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

async function createAmbassador() {
  const dbPath = path.join(process.cwd(), 'backend', 'data', 'revovend.db');
  const db = new Database(dbPath);
  
  try {
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    
    // Create tables if they don't exist
    db.exec(`
      CREATE TABLE IF NOT EXISTS ambassadors (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT,
        referralCode TEXT UNIQUE NOT NULL,
        totalEarnings REAL DEFAULT 0,
        pendingEarnings REAL DEFAULT 0,
        paidEarnings REAL DEFAULT 0,
        status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Check if ambassador already exists
    const existing = db.prepare('SELECT * FROM ambassadors WHERE email = ?').get('lashonsvoice@gmail.com');
    
    if (existing) {
      console.log('Ambassador already exists:', existing);
      return;
    }
    
    // Create new ambassador
    const hashedPassword = await bcrypt.hash('Test123!', 10);
    const id = `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();
    
    const stmt = db.prepare(`
      INSERT INTO ambassadors (
        id, email, password, name, phone, referralCode, 
        totalEarnings, pendingEarnings, paidEarnings, status, 
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id,
      'lashonsvoice@gmail.com',
      hashedPassword,
      'Test Ambassador',
      '',
      'AMB-TEST2024',
      0,
      0,
      0,
      'active',
      now,
      now
    );
    
    console.log('✅ Ambassador created successfully!');
    console.log('Email: lashonsvoice@gmail.com');
    console.log('Password: Test123!');
    console.log('Referral Code: AMB-TEST2024');
    
  } catch (error) {
    console.error('Error creating ambassador:', error);
  } finally {
    db.close();
  }
}

createAmbassador();