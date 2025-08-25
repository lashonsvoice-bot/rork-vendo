#!/usr/bin/env node

console.log('Testing backend server import...');

try {
  // Try to import the main backend file
  require('./backend/hono.ts');
  console.log('✅ Backend imports successfully!');
} catch (error) {
  console.error('❌ Backend import failed:', error.message);
  console.error('Stack trace:', error.stack);
}