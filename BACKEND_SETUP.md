# RevoVend Backend Setup

## Quick Start

To fix the tRPC network errors, you need to start the backend server:

### Option 1: Using the startup script
```bash
node start-backend.js
```

### Option 2: Direct command
```bash
bun run backend/server.ts
```

### Option 3: With auto-restart (development)
```bash
bun --watch run backend/server.ts
```

## What this fixes

The tRPC errors you're seeing:
```
[tRPC] Network error: TypeError: Failed to fetch
[tRPC] Attempted URL: http://localhost:3000/api/trpc/...
```

These occur because the frontend is trying to connect to `http://localhost:3000` but no backend server is running on that port.

## Verification

Once the backend is running, you should see:
```
✅ Backend server is running on http://localhost:3000
📡 tRPC endpoint: http://localhost:3000/api/trpc
🔗 API status: http://localhost:3000/api
```

You can test the connection by visiting: http://localhost:3000/api

## Development Workflow

1. **Terminal 1**: Start the backend server
   ```bash
   node start-backend.js
   ```

2. **Terminal 2**: Start the Expo development server
   ```bash
   npm start
   ```

Both servers need to run simultaneously for the app to work properly.

## Environment Variables

The backend uses environment variables from `.env`. Key settings:
- `API_BASE_URL=http://localhost:3000` (for development)
- `NODE_ENV=development`

## Troubleshooting

If you still get network errors:
1. Make sure both servers are running
2. Check that no other service is using port 3000
3. Verify the `.env` file exists and has correct settings
4. Try restarting both servers