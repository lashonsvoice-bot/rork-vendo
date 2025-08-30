#!/bin/bash

echo "🚀 Setting up Ambassador Account for lashonsvoice@gmail.com"
echo "=================================================="

# Navigate to the project directory
cd "$(dirname "$0")"

# Run the setup script
echo "📝 Creating/updating ambassador account..."
node backend/scripts/setup-ambassador-account.js

echo ""
echo "✅ Setup complete!"
echo ""
echo "📱 How to access the Ambassador Portal:"
echo "1. Open the app"
echo "2. On the role selection screen, choose 'Ambassador Program'"
echo "3. You'll be redirected to the Ambassador Login page"
echo "4. Use these credentials:"
echo "   📧 Email: lashonsvoice@gmail.com"
echo "   🔑 Password: Welcome123!"
echo ""
echo "🎯 Once logged in, you can:"
echo "- View your earnings dashboard"
echo "- Generate referral links for different roles"
echo "- Track your referrals and commissions"
echo "- Share referral links via social media"
echo ""