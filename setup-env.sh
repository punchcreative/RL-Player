#!/bin/bash

# RL Player - Environment Setup Script
# This script helps you set up environment variables

echo "🌍 RL Player - Environment Setup"
echo "================================="
echo ""

# Check if .env already exists
if [ -f ".env" ]; then
    echo "⚠️  .env file already exists!"
    echo ""
    read -p "Do you want to overwrite it? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Setup cancelled."
        exit 0
    fi
fi

# Copy template
if [ -f ".env.example" ]; then
    cp .env.example .env
    echo "✅ Created .env from template"
else
    echo "❌ .env.example not found!"
    exit 1
fi

echo ""
echo "📋 Please customize your .env file with the following information:"
echo ""

# Get station name
read -p "🎵 Radio Station Name: " STATION_NAME
if [ ! -z "$STATION_NAME" ]; then
    sed -i.bak "s/VITE_STATION_NAME=.*/VITE_STATION_NAME=$STATION_NAME/" .env
fi

# Get stream URL
read -p "📡 Stream URL: " STREAM_URL
if [ ! -z "$STREAM_URL" ]; then
    sed -i.bak "s|VITE_STREAM_URL=.*|VITE_STREAM_URL=$STREAM_URL|" .env
fi

# Get app URL
read -p "🌐 App URL: " APP_URL
if [ ! -z "$APP_URL" ]; then
    sed -i.bak "s|VITE_APP_URL=.*|VITE_APP_URL=$APP_URL|" .env
fi

# Get theme color
read -p "🎨 Theme Color (hex, e.g., #031521): " THEME_COLOR
if [ ! -z "$THEME_COLOR" ]; then
    sed -i.bak "s/VITE_THEME_COLOR=.*/VITE_THEME_COLOR=$THEME_COLOR/" .env
    sed -i.bak "s/VITE_BACKGROUND_COLOR=.*/VITE_BACKGROUND_COLOR=$THEME_COLOR/" .env
fi

# Clean up backup files
rm -f .env.bak

echo ""
echo "🔐 PASSWORD HASH SETUP"
echo "====================="
echo ""
echo "To set up your password hash:"
echo "1. Open your radio player in a browser"
echo "2. Open Developer Tools (F12) → Console"
echo "3. Run: await hashString(\"your-password-here\")"
echo "4. Copy the hash and update VITE_PASSWORD_HASH in .env"
echo ""

echo "✅ Basic setup complete!"
echo ""
echo "📁 Files created:"
echo "   ✓ .env (your configuration)"
echo ""
echo "🔒 Security:"
echo "   ✓ .env is automatically ignored by Git"
echo "   ✓ Your settings are kept private"
echo ""
echo "🚀 Next steps:"
echo "   1. Set your password hash in .env"
echo "   2. Test your radio player"
echo "   3. Upload to your web server"
echo ""
echo "📖 For help, see README.md"
