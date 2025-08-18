#!/usr/bin/env bun
import { serve } from "@hono/node-server";
import app from "./hono";

const port = 3000;

console.log(`🚀 Starting backend server on port ${port}...`);
console.log(`📁 Working directory: ${process.cwd()}`);

serve({
  fetch: app.fetch,
  port,
}, (info) => {
  console.log(`✅ Backend server is running on http://localhost:${info.port}`);
  console.log(`📡 tRPC endpoint: http://localhost:${info.port}/api/trpc`);
  console.log(`🔗 API status: http://localhost:${info.port}/api`);
  console.log(`\n🎯 To test the connection, visit: http://localhost:${info.port}/api`);
  console.log(`\n💡 Run this in a separate terminal while your Expo app is running`);
});