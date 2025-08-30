# Ambassador Login Setup Guide

## Quick Fix Instructions

To enable ambassador login with the credentials `lashonsvoice@gmail.com` / `Welcome123!`, follow these steps:

### Step 1: Ensure Backend is Running

First, make sure your backend server is running on port 3000:

```bash
# In a separate terminal window
cd backend
bun run server.ts
# OR
node server.ts
```

You should see:
```
✅ Backend server is running on http://localhost:3000
📡 tRPC endpoint: http://localhost:3000/api/trpc
```

### Step 2: Create/Fix Ambassador Account

Run the setup script to ensure the ambassador account exists with the correct password:

```bash
node backend/scripts/ensure-ambassador-account.js
```

This script will:
- Create the SQLite database if it doesn't exist
- Create all necessary ambassador tables
- Create or update the ambassador account for `lashonsvoice@gmail.com`
- Set the password to `Welcome123!`
- Activate the account

You should see output like:
```
✅ AMBASSADOR ACCOUNT READY!
==============================
📧 Email: lashonsvoice@gmail.com
🔑 Password: Welcome123!
👤 Name: Lashon
🎫 Referral Code: AMB-LASHON####
📌 Status: active
🔐 Password Valid: YES ✅
==============================
```

### Step 3: Login to Ambassador Portal

1. Open the app
2. On the role selection screen, choose "Ambassador Program"
3. Click "Go to Ambassador Login"
4. Enter the credentials:
   - Email: `lashonsvoice@gmail.com`
   - Password: `Welcome123!`
5. Click "Login to Dashboard"

## Troubleshooting

### If Login Still Fails

1. **Check Backend Connection**
   - Ensure backend is running on port 3000
   - Check that no firewall is blocking the connection
   - Try accessing http://localhost:3000/api in your browser

2. **Verify Database**
   Run the verification script:
   ```bash
   node backend/scripts/verify-ambassador-login.js
   ```

3. **Test Connection**
   - In the app, navigate to `/test-ambassador-auth`
   - This page will show detailed error messages
   - Click "Test Login" to see the exact error

4. **Check Logs**
   - Backend logs will show authentication attempts
   - Look for messages like:
     ```
     [Ambassador Auth] Login attempt for: lashonsvoice@gmail.com
     [Ambassador Auth] Login successful for: lashonsvoice@gmail.com
     ```

### Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| "Cannot connect to server" | Ensure backend is running on port 3000 |
| "Invalid email or password" | Run `node backend/scripts/ensure-ambassador-account.js` |
| "Account suspended" | The script above will reactivate the account |
| Database not found | The setup script will create it automatically |

### Alternative Testing

If you need to test the authentication flow directly:

1. Navigate to `/test-ambassador-auth` in the app
2. The credentials are pre-filled
3. Click "Test Login" to see detailed results
4. Check the console logs for debugging information

## Technical Details

### Database Location
- Path: `backend/data/revovend.db`
- Type: SQLite with WAL mode enabled

### Tables Created
- `ambassadors` - Stores ambassador accounts
- `ambassador_referrals` - Tracks referrals
- `ambassador_payouts` - Manages commission payouts

### Password Security
- Passwords are hashed using bcrypt with 10 rounds
- The plain text password `Welcome123!` is never stored

### API Endpoints
- Login: `POST /api/trpc/ambassador.auth.login`
- Signup: `POST /api/trpc/ambassador.auth.signup`

## Need Help?

If you continue to experience issues:

1. Check the backend console for error messages
2. Run the test authentication page at `/test-ambassador-auth`
3. Ensure all dependencies are installed:
   ```bash
   bun install
   # or
   npm install
   ```

The ambassador login system is now configured and ready to use!