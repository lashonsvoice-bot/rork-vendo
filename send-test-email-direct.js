#!/usr/bin/env node

// Direct test email sender - bypasses tRPC and sends email directly
const sgMail = require('@sendgrid/mail');
const { Buffer } = require('buffer');
require('dotenv').config();

console.log('🚀 Direct Test Email Sender');
console.log('📧 Configuring SendGrid...');

// Configure SendGrid
const apiKey = process.env.SENDGRID_API_KEY;
const fromEmail = process.env.SENDGRID_FROM || 'Revovend1@gmail.com';

if (!apiKey || !apiKey.startsWith('SG.')) {
  console.error('❌ Invalid or missing SENDGRID_API_KEY in .env file');
  process.exit(1);
}

sgMail.setApiKey(apiKey);

// Email configuration
const emailConfig = {
  to: 'Revovend1@gmail.com',
  from: fromEmail,
  subject: 'test',
  text: 'Test for body no attachment',
  html: 'Test for body no attachment',
  // Add the attachment from your app
  attachments: [{
    content: '', // Will be populated by fetching the image
    filename: 'quote.jpg',
    type: 'image/jpeg',
    disposition: 'attachment'
  }]
};

async function fetchAttachment() {
  try {
    console.log('📎 Fetching attachment...');
    const response = await fetch('https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/v4dvo6k5wc0d1ff9pko68');
    if (!response.ok) {
      console.warn('⚠️  Failed to fetch attachment, sending without it');
      delete emailConfig.attachments;
      return;
    }
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    emailConfig.attachments[0].content = base64;
    console.log('✅ Attachment fetched successfully');
  } catch (error) {
    console.warn('⚠️  Error fetching attachment:', error.message);
    console.warn('📧 Sending email without attachment');
    delete emailConfig.attachments;
  }
}

async function sendTestEmail() {
  try {
    console.log('\n📧 Preparing to send test email...');
    console.log('📬 To:', emailConfig.to);
    console.log('📝 Subject:', emailConfig.subject);
    console.log('💬 Body:', emailConfig.text);
    
    // Fetch attachment if needed
    await fetchAttachment();
    
    console.log('📎 Attachments:', emailConfig.attachments ? emailConfig.attachments.length : 0);
    
    console.log('\n🚀 Sending email via SendGrid...');
    const result = await sgMail.send(emailConfig);
    
    console.log('\n✅ Email sent successfully!');
    console.log('📧 Message ID:', result[0].headers['x-message-id']);
    console.log('🎯 Status Code:', result[0].statusCode);
    console.log('\n🎉 Test email has been delivered to', emailConfig.to);
    
  } catch (error) {
    console.error('\n❌ Failed to send email:');
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Body:', error.response.body);
    }
    process.exit(1);
  }
}

// Run the email sender
sendTestEmail();