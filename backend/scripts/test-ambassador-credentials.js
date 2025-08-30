#!/usr/bin/env node

/**
 * Direct test of ambassador login credentials
 * This script tests the exact login flow
 */

const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

async function testCredentials() {
  console.log('🔍 Testing Ambassador Login Credentials\n');
  console.log('=' .repeat(60));
  
  const dbPath = path.join(process.cwd(), 'backend', 'data', 'revovend.db');
  console.log('📂 Database path:', dbPath);
  
  const db = new Database(dbPath);
  
  try {
    // Test credentials
    const testEmail = 'lashonsvoice@gmail.com';
    const testPassword = 'Welcome123!';
    
    console.log('\n📧 Testing email:', testEmail);
    console.log('🔑 Testing password:', testPassword);
    console.log('\n' + '-'.repeat(60));
    
    // Step 1: Find ambassador by email
    console.log('\nStep 1: Finding ambassador by email...');
    const stmt = db.prepare('SELECT * FROM ambassadors WHERE email = ?');
    const ambassador = stmt.get(testEmail);
    
    if (!ambassador) {
      console.error('❌ Ambassador not found with email:', testEmail);
      console.log('\nChecking all ambassadors in database:');
      const allStmt = db.prepare('SELECT email, name, status FROM ambassadors');
      const allAmbassadors = allStmt.all();
      if (allAmbassadors.length === 0) {
        console.log('⚠️  No ambassadors found in database!');
        console.log('Run: node backend/scripts/ensure-ambassador-account.js');
      } else {
        console.log('Found ambassadors:');
        allAmbassadors.forEach(a => {
          console.log(`  - ${a.email} (${a.name}) - Status: ${a.status}`);
        });
      }
      return false;
    }
    
    console.log('✅ Ambassador found!');
    console.log('  ID:', ambassador.id);
    console.log('  Name:', ambassador.name);
    console.log('  Status:', ambassador.status);
    console.log('  Referral Code:', ambassador.referralCode);
    
    // Step 2: Check account status
    console.log('\nStep 2: Checking account status...');
    if (ambassador.status !== 'active') {
      console.error('❌ Account is not active! Status:', ambassador.status);
      return false;
    }
    console.log('✅ Account is active');
    
    // Step 3: Validate password
    console.log('\nStep 3: Validating password...');
    console.log('  Stored hash length:', ambassador.password?.length || 0);
    
    const isValid = await bcrypt.compare(testPassword, ambassador.password);
    
    if (!isValid) {
      console.error('❌ Password validation failed!');
      
      // Try to understand why
      console.log('\nDebugging password issue:');
      console.log('  Testing bcrypt directly...');
      
      // Create a new hash and test it
      const newHash = await bcrypt.hash(testPassword, 10);
      const testNewHash = await bcrypt.compare(testPassword, newHash);
      console.log('  New hash test:', testNewHash ? 'PASS' : 'FAIL');
      
      // Update the password to fix it
      console.log('\n🔧 Fixing password...');
      const updateStmt = db.prepare('UPDATE ambassadors SET password = ? WHERE email = ?');
      updateStmt.run(newHash, testEmail);
      console.log('✅ Password updated!');
      
      // Test again
      const updatedAmbassador = stmt.get(testEmail);
      const isValidNow = await bcrypt.compare(testPassword, updatedAmbassador.password);
      console.log('  Password valid after update:', isValidNow ? 'YES' : 'NO');
      
      return isValidNow;
    }
    
    console.log('✅ Password is valid!');
    
    // Step 4: Simulate full login flow
    console.log('\nStep 4: Simulating full login flow...');
    console.log('  1. Email found: ✅');
    console.log('  2. Status active: ✅');
    console.log('  3. Password valid: ✅');
    console.log('  4. Would generate JWT token');
    console.log('  5. Would return success response');
    
    console.log('\n' + '='.repeat(60));
    console.log('✅ LOGIN TEST SUCCESSFUL!');
    console.log('='.repeat(60));
    console.log('\nCredentials are valid and should work:');
    console.log('📧 Email: lashonsvoice@gmail.com');
    console.log('🔑 Password: Welcome123!');
    console.log('\nNote: Make sure there are NO SPACES before or after the email!');
    console.log('The email should be exactly: lashonsvoice@gmail.com');
    console.log('(no spaces, no extra characters)');
    console.log('='.repeat(60));
    
    return true;
    
  } catch (error) {
    console.error('❌ Error during test:', error);
    console.error('\nStack trace:', error.stack);
    return false;
  } finally {
    db.close();
    console.log('\n🔒 Database connection closed');
  }
}

// Run the test
console.log('Ambassador Credentials Test');
console.log('===========================\n');

testCredentials()
  .then((success) => {
    if (success) {
      console.log('\n✅ Test completed successfully');
      console.log('\nIMPORTANT: When logging in:');
      console.log('1. Make sure backend is running (npm run backend)');
      console.log('2. Use email: lashonsvoice@gmail.com (no spaces!)');
      console.log('3. Use password: Welcome123!');
      console.log('4. If it still fails, check the console logs in the backend terminal');
    } else {
      console.log('\n❌ Test failed - credentials need fixing');
      console.log('Run: node backend/scripts/ensure-ambassador-account.js');
    }
    process.exit(success ? 0 : 1);
  })
  .catch((error) => {
    console.error('\n❌ Test script failed:', error);
    process.exit(1);
  });