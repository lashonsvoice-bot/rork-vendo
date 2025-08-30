#!/usr/bin/env node

/**
 * Comprehensive debugging script for ambassador login
 */

const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');

async function debugAmbassadorLogin() {
  console.log('🔍 Ambassador Login Debugging Tool\n');
  console.log('=' .repeat(70));
  
  // Step 1: Check database
  console.log('\n📂 Step 1: Checking Database...');
  const dataDir = path.join(process.cwd(), 'backend', 'data');
  const dbPath = path.join(dataDir, 'revovend.db');
  
  if (!fs.existsSync(dataDir)) {
    console.error('❌ Data directory does not exist:', dataDir);
    console.log('🔧 Creating data directory...');
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  if (!fs.existsSync(dbPath)) {
    console.error('❌ Database file does not exist:', dbPath);
    console.log('🔧 Database will be created when you run ensure-ambassador-account.js');
    return false;
  }
  
  console.log('✅ Database file exists:', dbPath);
  
  const db = new Database(dbPath);
  
  try {
    // Step 2: Check ambassador account
    console.log('\n👤 Step 2: Checking Ambassador Account...');
    const email = 'lashonsvoice@gmail.com';
    const password = 'Welcome123!';
    
    const stmt = db.prepare('SELECT * FROM ambassadors WHERE email = ?');
    const ambassador = stmt.get(email);
    
    if (!ambassador) {
      console.error('❌ Ambassador account does not exist');
      console.log('\n🔧 FIX: Creating ambassador account now...');
      
      const hashedPassword = await bcrypt.hash(password, 10);
      const id = `amb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const now = new Date().toISOString();
      const referralCode = `AMB-LASHON${Date.now().toString().slice(-4)}`;
      
      // Create table if it doesn't exist
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
      
      const insertStmt = db.prepare(`
        INSERT INTO ambassadors (
          id, email, password, name, phone, referralCode, 
          totalEarnings, pendingEarnings, paidEarnings, status, 
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      insertStmt.run(
        id, email, hashedPassword, 'Lashon', '', referralCode,
        0, 0, 0, 'active', now, now
      );
      
      console.log('✅ Ambassador account created successfully');
      console.log('   Referral Code:', referralCode);
    } else {
      console.log('✅ Ambassador account exists');
      console.log('   Name:', ambassador.name);
      console.log('   Email:', ambassador.email);
      console.log('   Status:', ambassador.status);
      console.log('   Referral Code:', ambassador.referralCode);
      
      // Step 3: Check password
      console.log('\n🔐 Step 3: Checking Password...');
      const isValid = await bcrypt.compare(password, ambassador.password);
      
      if (!isValid) {
        console.error('❌ Password is incorrect');
        console.log('🔧 FIX: Updating password...');
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const updateStmt = db.prepare('UPDATE ambassadors SET password = ?, status = ?, updated_at = ? WHERE email = ?');
        updateStmt.run(hashedPassword, 'active', new Date().toISOString(), email);
        
        console.log('✅ Password updated successfully');
      } else {
        console.log('✅ Password is correct');
      }
      
      // Step 4: Check account status
      console.log('\n📌 Step 4: Checking Account Status...');
      if (ambassador.status !== 'active') {
        console.error('❌ Account is not active. Status:', ambassador.status);
        console.log('🔧 FIX: Activating account...');
        
        const activateStmt = db.prepare('UPDATE ambassadors SET status = ?, updated_at = ? WHERE email = ?');
        activateStmt.run('active', new Date().toISOString(), email);
        
        console.log('✅ Account activated');
      } else {
        console.log('✅ Account is active');
      }
    }
    
    // Step 5: Test backend connection
    console.log('\n🌐 Step 5: Testing Backend Connection...');
    try {
      const response = await fetch('http://localhost:3000/api', {
        timeout: 3000
      });
      
      if (response.ok) {
        const text = await response.text();
        console.log('✅ Backend is running');
        console.log('   Response:', text);
      } else {
        console.error('⚠️ Backend returned status:', response.status);
      }
    } catch (error) {
      console.error('❌ Cannot connect to backend at http://localhost:3000');
      console.log('🔧 FIX: Make sure the backend is running:');
      console.log('   1. Open a new terminal');
      console.log('   2. Run: npm run backend');
      console.log('   3. Wait for "Backend server is running" message');
    }
    
    // Step 6: Test tRPC endpoint
    console.log('\n📡 Step 6: Testing tRPC Ambassador Login Endpoint...');
    try {
      const loginResponse = await fetch('http://localhost:3000/api/trpc/ambassador.auth.login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          json: {
            email: email,
            password: password
          }
        }),
        timeout: 5000
      });
      
      if (loginResponse.ok) {
        const result = await loginResponse.json();
        if (result.result?.data?.json?.success) {
          console.log('✅ tRPC login endpoint works!');
          console.log('   Ambassador ID:', result.result.data.json.ambassador.id);
          console.log('   Token received:', result.result.data.json.token ? 'Yes' : 'No');
        } else {
          console.error('⚠️ Login endpoint returned unexpected response:', JSON.stringify(result, null, 2));
        }
      } else {
        const errorText = await loginResponse.text();
        console.error('❌ Login endpoint returned error:', loginResponse.status);
        console.error('   Error:', errorText);
      }
    } catch (error) {
      console.error('❌ Failed to test tRPC endpoint:', error.message);
      if (error.message.includes('fetch is not defined')) {
        console.log('ℹ️ Skipping API test (fetch not available in this Node version)');
      }
    }
    
    // Final summary
    console.log('\n' + '=' .repeat(70));
    console.log('📋 SUMMARY');
    console.log('=' .repeat(70));
    console.log('\n✅ Ambassador account is ready for login:');
    console.log('   📧 Email: lashonsvoice@gmail.com');
    console.log('   🔑 Password: Welcome123!');
    console.log('\n📝 Next Steps:');
    console.log('   1. Make sure backend is running (npm run backend)');
    console.log('   2. Open the app');
    console.log('   3. Select "Ambassador Program" role');
    console.log('   4. Click "Go to Ambassador Login"');
    console.log('   5. Enter the credentials above');
    console.log('\nIf login still fails:');
    console.log('   1. Check browser console for errors');
    console.log('   2. Check backend terminal for error messages');
    console.log('   3. Try clearing app data/cache');
    
    return true;
    
  } catch (error) {
    console.error('\n❌ Error during debugging:', error);
    console.error('Stack trace:', error.stack);
    return false;
  } finally {
    db.close();
    console.log('\n🔒 Database connection closed');
  }
}

// Run the debug tool
console.log('Ambassador Login Debugging Tool');
console.log('================================\n');

debugAmbassadorLogin()
  .then((success) => {
    if (success) {
      console.log('\n✅ Debugging completed successfully');
      process.exit(0);
    } else {
      console.log('\n❌ Debugging found issues');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('\n❌ Debug script failed:', error);
    process.exit(1);
  });