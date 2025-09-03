#!/bin/bash

# 🔑 Bitbucket API Token Setup Script for RL Player
# Run this script after generating your API token

echo "🔑 Setting up Bitbucket API Token for RL Player..."
echo ""

# Current configuration
echo "📋 Current git remote configuration:"
git remote -v
echo ""

# Get user input
echo "🎯 Please provide your Bitbucket API token:"
echo "   (Generate at: https://bitbucket.org/account/settings/app-passwords/)"
echo ""
read -s -p "Enter your API token: " API_TOKEN
echo ""

if [ -z "$API_TOKEN" ]; then
    echo "❌ No token provided. Exiting."
    exit 1
fi

# Username is already known from current config
USERNAME="punchcreative"

echo ""
echo "🔧 Updating git remote configuration..."

# Update the remote URL
git remote set-url origin https://$USERNAME:$API_TOKEN@bitbucket.org/punchcreative/rl-player.git

if [ $? -eq 0 ]; then
    echo "✅ Remote URL updated successfully"
else
    echo "❌ Failed to update remote URL"
    exit 1
fi

echo ""
echo "🧪 Testing authentication..."

# Test the connection
git fetch --dry-run

if [ $? -eq 0 ]; then
    echo "✅ Authentication successful!"
    echo ""
    echo "🎉 Setup complete! Your benefits:"
    echo "   ✅ No more app password deprecation warnings"
    echo "   ✅ More secure authentication"
    echo "   ✅ Future-proof setup"
    echo ""
    echo "📋 Next steps:"
    echo "   1. Update SourceTree with the same token"
    echo "   2. Save your token securely (password manager)"
    echo "   3. Continue working normally"
    echo ""
    echo "🚀 Your RL Player repository is ready!"
else
    echo "❌ Authentication test failed"
    echo "   Please check your token and try again"
    echo ""
    echo "🔄 Reverting to original configuration..."
    git remote set-url origin https://punchcreative@bitbucket.org/punchcreative/rl-player.git
    echo "   Original configuration restored"
fi

echo ""
echo "🔗 Current remote URL (token hidden for security):"
git remote -v | sed 's/:.*@/:***@/g'
