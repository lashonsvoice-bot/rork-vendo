# Backend Development Setup

## Quick Start - IMPORTANT!

**To fix the tRPC "Failed to fetch" errors, you MUST run the backend server locally:**

```bash
# In a separate terminal, run:
bun run backend/server.ts
```

This will start the backend server on `http://localhost:3000` which the tRPC client is now configured to connect to in development mode.

## What this fixes

The tRPC client was trying to connect to `https://dev-lm89fhyj7iesktu5ur785.rorktest.dev` but there was no backend server running there. The updated configuration now:

1. **Detects development mode** (NODE_ENV=development)
2. **Automatically uses localhost:3000** for the backend
3. **Provides all necessary API endpoints:**
   - tRPC API endpoints at `/api/trpc`
   - Authentication routes at `/auth`
   - File upload routes at `/uploads`
   - Profile management routes at `/profile`

## Development Workflow

1. **Start the backend server:** `bun run backend/server.ts`
2. **In another terminal, start the Expo app:** `bun run start-web`
3. **The app should now connect successfully** to the local backend

## Troubleshooting Network Errors

If you still see tRPC connection errors:

1. **Verify backend is running:**
   - Check console shows: "✅ Backend server is running on http://localhost:3000"
   - Visit http://localhost:3000/api in browser (should show {"status":"ok","message":"API is running"})

2. **Check environment:**
   - Ensure NODE_ENV=development in .env file
   - Check browser console for tRPC logs showing "Using local development backend"

3. **Port conflicts:**
   - Make sure no other service is using port 3000
   - Kill any existing processes: `lsof -ti:3000 | xargs kill -9`

4. **Browser cache:**
   - Clear browser cache and reload
   - Try incognito/private browsing mode

## Environment Configuration

The tRPC client now automatically:
- **Development:** Uses http://localhost:3000 when NODE_ENV=development
- **Production:** Uses environment variables or current origin

No manual configuration needed for local development!