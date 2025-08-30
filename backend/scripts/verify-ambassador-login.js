/**
 * Script to verify and fix ambassador login for lashonsvoice@gmail.com
 */

const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

async function verifyAndFixAmbassadorLogin() {
  // Ensure data directory exists
  const dataDir = path.join(process.cwd(), 'backend', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const dbPath = path.join(dataDir, 'revovend.db');
  console.log('📂 Database path:', dbPath);
  
  const db = new Database(dbPath);
  
  try {
    // Enable foreign keys
    db.pragma('foreign_keys = ON');
    db.pragma('journal_mode = WAL');
    
    // Create ambassadors table if it doesn't exist
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

    // Create indexes
    db.exec('CREATE INDEX IF NOT EXISTS idx_ambassadors_email ON ambassadors (email);');
    db.exec('CREATE INDEX IF NOT EXISTS idx_ambassadors_referralCode ON ambassadors (referralCode);');

    console.log('✅ Ambassadors table created/verified');
    
    // Check if ambassador already exists
    const existing = db.prepare('SELECT * FROM ambassadors WHERE email = ?').get('lashonsvoice@gmail.com');
    
    if (existing) {
      console.log('⚠️ Ambassador already exists. Details:');
      console.log('ID:', existing.id);
      console.log('Name:', existing.name);
      console.log('Email:', existing.email);
      console.log('Referral Code:', existing.referralCode);
      console.log('Status:', existing.status);
      
      // Test current password
      const testPassword = 'Welcome123!';
      const isValidPassword = await bcrypt.compare(testPassword, existing.password);
      console.log('\n🔐 Testing password "Welcome123!":', isValidPassword ? '✅ Valid' : '❌ Invalid');
      
      if (!isValidPassword) {
        console.log('\n🔧 Updating password to "Welcome123!"...');
        const hashedPassword = await bcrypt.hash('Welcome123!', 10);
        const updateStmt = db.prepare('UPDATE ambassadors SET password = ?, updated_at = ? WHERE email = ?');
        updateStmt.run(hashedPassword, new Date().toISOString(), 'lashonsvoice@gmail.com');
        console.log('✅ Password updated successfully!');
      }
      
      // Ensure status is active
      if (existing.status !== 'active') {
        console.log('\n🔧 Activating ambassador account...');
        const activateStmt = db.prepare('UPDATE ambassadors SET status = ?, updated_at = ? WHERE email = ?');
        activateStmt.run('active', new Date().toISOString(), 'lashonsvoice@gmail.com');
        console.log('✅ Account activated!');
      }
      
    } else {
      console.log('📝 Creating new ambassador account...');
      
      // Create new ambassador with correct password
      const hashedPassword = await bcrypt.hash('Welcome123!', 10);
      const id = `amb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();
      const referralCode = 'AMB-LASHON2024';
      
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
    }

    // Create referral tables if they don't exist
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

    console.log('✅ All ambassador tables verified');
    
    // Final verification
    const verifyStmt = db.prepare('SELECT id, email, name, referralCode, status FROM ambassadors WHERE email = ?');
    const ambassador = verifyStmt.get('lashonsvoice@gmail.com');
    
    if (ambassador) {
      // Test the password one more time
      const finalCheck = db.prepare('SELECT password FROM ambassadors WHERE email = ?').get('lashonsvoice@gmail.com');
      const finalPasswordValid = await bcrypt.compare('Welcome123!', finalCheck.password);
      
      console.log('\n' + '='.repeat(60));
      console.log('📊 FINAL ACCOUNT VERIFICATION');
      console.log('='.repeat(60));
      console.log('✅ Account exists and is ready!');
      console.log('📧 Email: lashonsvoice@gmail.com');
      console.log('🔑 Password: Welcome123!');
      console.log('🎫 Referral Code:', ambassador.referralCode);
      console.log('📌 Status:', ambassador.status);
      console.log('✔️ Password Valid:', finalPasswordValid ? 'YES' : 'NO');
      console.log('='.repeat(60));
      console.log('\n✅ You can now log in to the ambassador portal!');
      console.log('1. Go to the app home screen');
      console.log('2. Select "Ambassador Program" role');
      console.log('3. Click "Go to Ambassador Login"');
      console.log('4. Enter the credentials above');
    } else {
      console.error('❌ Failed to verify ambassador account');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    db.close();
    console.log('\n🔒 Database connection closed');
  }
}

// Run the verification
verifyAndFixAmbassadorLogin().catch(console.error);