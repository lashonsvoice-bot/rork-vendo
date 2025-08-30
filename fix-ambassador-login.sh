#!/bin/bash

echo "🔧 Fixing Ambassador Login Setup"
echo "================================"
echo ""

# Step 1: Ensure backend dependencies are installed
echo "📦 Step 1: Installing backend dependencies..."
cd backend
npm install bcryptjs better-sqlite3
cd ..

# Step 2: Create/fix ambassador account
echo ""
echo "👤 Step 2: Setting up ambassador account..."
node backend/scripts/ensure-ambassador-account.js

# Step 3: Test the credentials
echo ""
echo "🔍 Step 3: Testing credentials..."
node backend/scripts/test-ambassador-credentials.js

echo ""
echo "✅ Setup complete!"
echo ""
echo "📝 Instructions:"
echo "1. Make sure backend is running: npm run backend"
echo "2. Go to the app and navigate to Ambassador Login"
echo "3. Use these credentials:"
echo "   Email: lashonsvoice@gmail.com"
echo "   Password: Welcome123!"
echo ""
echo "⚠️  IMPORTANT: Make sure there are NO SPACES before or after the email!"
echo "The email should be exactly: lashonsvoice@gmail.com"