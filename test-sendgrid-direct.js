#!/usr/bin/env node

// Direct SendGrid test script
// Run with: node test-sendgrid-direct.js

require('dotenv').config();
const sgMail = require('@sendgrid/mail');

const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_FROM = process.env.SENDGRID_FROM;

if (!SENDGRID_API_KEY) {
  console.error('❌ SENDGRID_API_KEY not found in environment variables');
  process.exit(1);
}

if (!SENDGRID_FROM) {
  console.error('❌ SENDGRID_FROM not found in environment variables');
  process.exit(1);
}

console.log('🔧 Testing SendGrid configuration...');
console.log('📧 From email:', SENDGRID_FROM);
console.log('🔑 API Key:', SENDGRID_API_KEY.substring(0, 10) + '...');

sgMail.setApiKey(SENDGRID_API_KEY);

const msg = {
  to: SENDGRID_FROM, // Send to yourself for testing
  from: SENDGRID_FROM,
  subject: 'RevoVend SendGrid Test Email',
  text: 'This is a test email from your RevoVend app to verify SendGrid is working correctly.',
  html: '<p>This is a <strong>test email</strong> from your RevoVend app to verify SendGrid is working correctly.</p>',
};

sgMail
  .send(msg)
  .then((response) => {
    console.log('✅ Email sent successfully!');
    console.log('📧 Message ID:', response[0].headers['x-message-id']);
    console.log('📊 Status Code:', response[0].statusCode);
    console.log('\n🎉 SendGrid is working correctly!');
    console.log('💡 Check your email inbox for the test message.');
  })
  .catch((error) => {
    console.error('❌ Failed to send email:');
    console.error(error.response?.body || error.message);
    
    if (error.code === 401) {
      console.log('\n💡 This is likely an API key issue. Please check:');
      console.log('   1. Your API key is correct');
      console.log('   2. Your API key has "Mail Send" permissions');
      console.log('   3. Your SendGrid account is active');
    }
  });