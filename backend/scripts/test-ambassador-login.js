#!/usr/bin/env node

/**
 * Test script to verify ambassador login works correctly
 */

const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

async function testAmbassadorLogin() {
  console.log('🔍 Testing Ambassador Login\n');
  console.log('=' .repeat(60));
  
  const dbPath = path.join(process.cwd(), 'backend', 'data', 'revovend.db');
  console.log('📂 Database path:', dbPath);
  
  const db = new Database(dbPath);
  
  try {
    // Test credentials
    const email = 'lashonsvoice@gmail.com';
    const password = 'Welcome123!';
    
    console.log('\n📧 Testing with email:', email);
    console.log('🔑 Testing with password:', password);
    
    // Find ambassador
    const stmt = db.prepare('SELECT * FROM ambassadors WHERE email = ?');
    const ambassador = stmt.get(email);
    
    if (!ambassador) {
      console.error('\n❌ Ambassador not found with email:', email);
      console.log('\n📋 All ambassadors in database:');
      const allStmt = db.prepare('SELECT email, name, status FROM ambassadors');
      const all = allStmt.all();
      if (all.length === 0) {
        console.log('   (No ambassadors found in database)');
      } else {
        all.forEach(a => {
          console.log(`   - ${a.email} (${a.name}) - Status: ${a.status}`);
        });
      }
      return false;
    }
    
    console.log('\n✅ Ambassador found:');
    console.log('   ID:', ambassador.id);
    console.log('   Name:', ambassador.name);
    console.log('   Email:', ambassador.email);
    console.log('   Status:', ambassador.status);
    console.log('   Referral Code:', ambassador.referralCode);
    
    // Check status
    if (ambassador.status !== 'active') {
      console.error('\n⚠️ Ambassador account is not active. Status:', ambassador.status);
      return false;
    }
    
    // Test password
    console.log('\n🔐 Testing password...');
    const isValid = await bcrypt.compare(password, ambassador.password);
    
    if (isValid) {
      console.log('✅ Password is VALID!');
      console.log('\n' + '='.repeat(60));
      console.log('🎉 LOGIN TEST SUCCESSFUL!');
      console.log('='.repeat(60));
      console.log('\nThe ambassador can login with:');
      console.log('📧 Email:', email);
      console.log('🔑 Password:', password);
      return true;
    } else {
      console.error('❌ Password is INVALID!');
      
      // Try to fix it
      console.log('\n🔧 Attempting to fix password...');
      const hashedPassword = await bcrypt.hash(password, 10);
      const updateStmt = db.prepare('UPDATE ambassadors SET password = ?, updated_at = ? WHERE email = ?');
      updateStmt.run(hashedPassword, new Date().toISOString(), email);
      
      // Verify fix
      const verifyStmt = db.prepare('SELECT password FROM ambassadors WHERE email = ?');
      const updated = verifyStmt.get(email);
      const nowValid = await bcrypt.compare(password, updated.password);
      
      if (nowValid) {
        console.log('✅ Password has been fixed!');
        console.log('\n' + '='.repeat(60));
        console.log('🎉 LOGIN TEST SUCCESSFUL (after fix)!');
        console.log('='.repeat(60));
        return true;
      } else {
        console.error('❌ Failed to fix password');
        return false;
      }
    }
    
  } catch (error) {
    console.error('\n❌ Error during test:', error);
    console.error('Stack trace:', error.stack);
    return false;
  } finally {
    db.close();
    console.log('\n🔒 Database connection closed');
  }
}

// Run the test
console.log('Ambassador Login Test Script');
console.log('============================\n');

testAmbassadorLogin()
  .then((success) => {
    if (success) {
      console.log('\n✅ Test completed successfully');
      console.log('\nNext steps:');
      console.log('1. Make sure the backend is running (npm run backend)');
      console.log('2. Open the app');
      console.log('3. Select "Ambassador Program" role');
      console.log('4. Click "Go to Ambassador Login"');
      console.log('5. Enter the credentials shown above');
      process.exit(0);
    } else {
      console.log('\n❌ Test failed');
      console.log('\nTroubleshooting:');
      console.log('1. Run: node backend/scripts/ensure-ambassador-account.js');
      console.log('2. Then run this test again');
      process.exit(1);
    }
  })
  .catch((error) => {
    console.error('\n❌ Test script failed:', error);
    process.exit(1);
  });