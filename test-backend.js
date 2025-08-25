#!/usr/bin/env node

const { spawn } = require('child_process');

console.log('Testing backend server startup...');

const backend = spawn('bun', ['backend/server.ts'], {
  cwd: '/home/user/rork-app',
  stdio: 'pipe'
});

backend.stdout.on('data', (data) => {
  console.log('STDOUT:', data.toString());
});

backend.stderr.on('data', (data) => {
  console.error('STDERR:', data.toString());
});

backend.on('close', (code) => {
  console.log(`Backend process exited with code ${code}`);
});

backend.on('error', (error) => {
  console.error('Failed to start backend:', error);
});

// Kill after 5 seconds to prevent hanging
setTimeout(() => {
  console.log('Killing backend process...');
  backend.kill('SIGTERM');
}, 5000);