#!/bin/bash

# RL Player - Environment Configuration Test
# This script verifies your .env setup

echo "🧪 RL Player - Environment Test"
echo "==============================="
echo ""

# Check if .env exists
if [ -f ".env" ]; then
    echo "✅ .env file found"
    
    # Check for required variables
    REQUIRED_VARS=(
        "VITE_PASSWORD_HASH"
        "VITE_STATION_NAME" 
        "VITE_STREAM_URL"
        "VITE_APP_URL"
    )
    
    MISSING_VARS=()
    DEFAULT_VARS=()
    
    for var in "${REQUIRED_VARS[@]}"; do
        if grep -q "^$var=" .env; then
            VALUE=$(grep "^$var=" .env | cut -d'=' -f2)
            
            if [ -z "$VALUE" ] || [[ "$VALUE" == *"your-"* ]] || [[ "$VALUE" == "your-password-hash-here" ]]; then
                DEFAULT_VARS+=("$var")
            else
                echo "✅ $var configured"
            fi
        else
            MISSING_VARS+=("$var")
        fi
    done
    
    # Report missing variables
    if [ ${#MISSING_VARS[@]} -gt 0 ]; then
        echo ""
        echo "❌ Missing variables:"
        for var in "${MISSING_VARS[@]}"; do
            echo "   - $var"
        done
    fi
    
    # Report default variables
    if [ ${#DEFAULT_VARS[@]} -gt 0 ]; then
        echo ""
        echo "⚠️  Variables using default values:"
        for var in "${DEFAULT_VARS[@]}"; do
            echo "   - $var"
        done
        echo ""
        echo "📋 Please update these in your .env file"
    fi
    
    # Overall status
    echo ""
    if [ ${#MISSING_VARS[@]} -eq 0 ] && [ ${#DEFAULT_VARS[@]} -eq 0 ]; then
        echo "🎉 Environment configuration looks good!"
        echo ""
        echo "🚀 Your radio player should work with:"
        echo "   - Secure password protection"
        echo "   - Personalized settings"
        echo "   - Git-safe configuration"
    else
        echo "🔧 Setup needs completion"
        echo ""
        echo "📋 Next steps:"
        [ ${#MISSING_VARS[@]} -gt 0 ] && echo "   1. Run: ./setup-env.sh"
        [ ${#DEFAULT_VARS[@]} -gt 0 ] && echo "   2. Edit .env with your values"
        echo "   3. Generate password hash in browser console"
    fi
    
else
    echo "❌ .env file not found"
    echo ""
    echo "📋 To create .env configuration:"
    echo "   1. Run: ./setup-env.sh"
    echo "   2. Or copy: cp .env.example .env"
    echo "   3. Edit .env with your settings"
fi

echo ""

# Check if .env.example exists for reference
if [ -f ".env.example" ]; then
    echo "📄 .env.example available as template"
else
    echo "⚠️  .env.example template missing"
fi

# Check gitignore
if grep -q "^\.env$" .gitignore 2>/dev/null; then
    echo "✅ .env properly ignored by Git"
else
    echo "⚠️  .env not in .gitignore (security risk)"
fi

echo ""
