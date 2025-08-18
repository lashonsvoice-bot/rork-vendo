#!/usr/bin/env node

const { spawn } = require('child_process');

console.log('🚀 Starting RevoVend Backend Server...');
console.log('📁 Working directory:', process.cwd());

// Start the backend server using bun
const backend = spawn('bun', ['run', 'backend/server.ts'], {
  stdio: 'inherit',
  cwd: process.cwd()
});

backend.on('error', (error) => {
  console.error('❌ Failed to start backend server:', error.message);
  console.log('\n💡 Make sure you have Bun installed:');
  console.log('   curl -fsSL https://bun.sh/install | bash');
  console.log('\n💡 Or try with Node.js:');
  console.log('   node backend/server.ts');
  process.exit(1);
});

backend.on('close', (code) => {
  console.log(`\n🛑 Backend server exited with code ${code}`);
  process.exit(code);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down backend server...');
  backend.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down backend server...');
  backend.kill('SIGTERM');
});