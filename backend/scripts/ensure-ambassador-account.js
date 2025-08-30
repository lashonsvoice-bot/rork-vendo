#!/usr/bin/env node

/**
 * Script to ensure ambassador account exists with correct credentials
 * Run this to create/fix the lashonsvoice@gmail.com account
 */

const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

async function ensureAmbassadorAccount() {
  console.log('🚀 Ensuring ambassador account setup...\n');
  
  // Ensure data directory exists
  const dataDir = path.join(process.cwd(), 'backend', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    console.log('📁 Created data directory');
  }

  const dbPath = path.join(dataDir, 'revovend.db');
  console.log('📂 Database path:', dbPath);
  
  const db = new Database(dbPath);
  
  try {
    // Enable foreign keys and WAL mode for better performance
    db.pragma('foreign_keys = ON');
    db.pragma('journal_mode = WAL');
    
    // Create ambassadors table if it doesn't exist
    console.log('📋 Creating/verifying ambassadors table...');
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

    // Create indexes for better performance
    db.exec('CREATE INDEX IF NOT EXISTS idx_ambassadors_email ON ambassadors (email);');
    db.exec('CREATE INDEX IF NOT EXISTS idx_ambassadors_referralCode ON ambassadors (referralCode);');

    // Create related tables
    console.log('📋 Creating/verifying related tables...');
    db.exec(`
      CREATE TABLE IF NOT EXISTS ambassador_referrals (
        id TEXT PRIMARY KEY,
        ambassadorId TEXT NOT NULL,
        referredEmail TEXT NOT NULL,
        referredRole TEXT NOT NULL,
        referralLink TEXT,
        status TEXT DEFAULT 'pending',
        conversionDate TEXT,
        subscriptionId TEXT,
        commissionRate REAL DEFAULT 0.20,
        commissionEarned REAL DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ambassadorId) REFERENCES ambassadors(id)
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS ambassador_payouts (
        id TEXT PRIMARY KEY,
        ambassadorId TEXT NOT NULL,
        amount REAL NOT NULL,
        status TEXT DEFAULT 'pending',
        paymentMethod TEXT,
        paymentDetails TEXT,
        processedAt TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ambassadorId) REFERENCES ambassadors(id)
      )
    `);

    console.log('✅ All tables created/verified\n');
    
    // Check if ambassador already exists
    const existing = db.prepare('SELECT * FROM ambassadors WHERE email = ?').get('lashonsvoice@gmail.com');
    
    if (existing) {
      console.log('⚠️  Ambassador account already exists');
      console.log('📧 Email:', existing.email);
      console.log('👤 Name:', existing.name);
      console.log('🎫 Referral Code:', existing.referralCode);
      console.log('📌 Status:', existing.status);
      
      // Always update the password to ensure it's correct
      console.log('\n🔧 Updating password to ensure it matches...');
      const hashedPassword = await bcrypt.hash('Welcome123!', 10);
      const updateStmt = db.prepare('UPDATE ambassadors SET password = ?, status = ?, updated_at = ? WHERE email = ?');
      updateStmt.run(hashedPassword, 'active', new Date().toISOString(), 'lashonsvoice@gmail.com');
      console.log('✅ Password updated and account activated!');
      
    } else {
      console.log('📝 Creating new ambassador account...');
      
      // Create new ambassador with correct password
      const hashedPassword = await bcrypt.hash('Welcome123!', 10);
      const id = `amb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();
      const referralCode = `AMB-LASHON${Date.now().toString().slice(-4)}`;
      
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
        'Lashon',
        '',
        referralCode,
        0,
        0,
        0,
        'active',
        now,
        now
      );
      
      console.log('✅ Ambassador account created successfully!');
      console.log('🎫 Referral Code:', referralCode);
    }
    
    // Final verification
    console.log('\n🔍 Verifying account...');
    const verifyStmt = db.prepare('SELECT id, email, name, referralCode, status, password FROM ambassadors WHERE email = ?');
    const ambassador = verifyStmt.get('lashonsvoice@gmail.com');
    
    if (ambassador) {
      // Test the password
      const passwordValid = await bcrypt.compare('Welcome123!', ambassador.password);
      
      console.log('\n' + '='.repeat(60));
      console.log('✅ AMBASSADOR ACCOUNT READY!');
      console.log('='.repeat(60));
      console.log('📧 Email: lashonsvoice@gmail.com');
      console.log('🔑 Password: Welcome123!');
      console.log('👤 Name:', ambassador.name);
      console.log('🎫 Referral Code:', ambassador.referralCode);
      console.log('📌 Status:', ambassador.status);
      console.log('🔐 Password Valid:', passwordValid ? 'YES ✅' : 'NO ❌');
      console.log('='.repeat(60));
      
      if (passwordValid) {
        console.log('\n✅ Account is ready for login!');
        console.log('\nYou can now:');
        console.log('1. Go to the app and select "Ambassador Program" role');
        console.log('2. Click "Go to Ambassador Login"');
        console.log('3. Enter the credentials above');
        console.log('4. Access the ambassador dashboard');
      } else {
        console.error('\n❌ Password validation failed! Please run this script again.');
      }
    } else {
      console.error('❌ Failed to verify ambassador account');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
    console.error('\nStack trace:', error.stack);
  } finally {
    db.close();
    console.log('\n🔒 Database connection closed');
  }
}

// Run the script
console.log('Ambassador Account Setup Script');
console.log('================================\n');

ensureAmbassadorAccount()
  .then(() => {
    console.log('\n✅ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });