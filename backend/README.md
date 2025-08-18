# Backend Server

## Quick Start

To fix the tRPC connection errors, you need to run the backend server locally:

```bash
# In a separate terminal, run:
bun run backend/server.ts
```

This will start the backend server on `http://localhost:3000` which the tRPC client is configured to connect to.

## What this fixes

The tRPC client was trying to connect to a remote URL but there was no backend server running. This local server provides:

- tRPC API endpoints at `/api/trpc`
- Authentication routes at `/auth`
- File upload routes at `/uploads`
- Profile management routes at `/profile`

## Development Workflow

1. Start the backend server: `bun run backend/server.ts`
2. In another terminal, start the Expo app: `bun run start-web`
3. The app should now connect successfully to the local backend

## Troubleshooting

If you still see connection errors:
1. Make sure the backend server is running on port 3000
2. Check that no other service is using port 3000
3. Verify the console shows "Backend server is running on http://localhost:3000"