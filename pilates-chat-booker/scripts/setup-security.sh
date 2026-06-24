#!/bin/bash

# Setup script for security checks
# Run this once after cloning the repository

set -e

echo "🔒 Setting up security checks..."
echo ""

# Check if git repository
if [ ! -d .git ]; then
  echo "❌ Not a git repository. Run this from the project root."
  exit 1
fi

# Enable git hooks
echo "1️⃣  Configuring git hooks..."
git config core.hooksPath .githooks
chmod +x .githooks/pre-commit
echo "   ✅ Git hooks configured"

# Verify .env files
echo ""
echo "2️⃣  Verifying .env protection..."

# Check .env is in .gitignore
if grep -q "^\.env$" .gitignore; then
  echo "   ✅ .env is in .gitignore"
else
  echo "   ⚠️  .env not found in .gitignore"
  echo "      Adding .env to .gitignore..."
  echo ".env" >> .gitignore
  git add .gitignore
fi

# Check .env.example doesn't have real credentials
if grep -q "sk_live_\|sk_test_" .env.example 2>/dev/null; then
  echo "   ⚠️  .env.example contains secret patterns"
  echo "      Please verify it only has placeholders"
else
  echo "   ✅ .env.example is secure"
fi

# Verify setup
echo ""
echo "3️⃣  Verifying security setup..."

# Test pre-commit hook
echo "   Testing pre-commit hook..."
if [ -x .git/hooks/pre-commit ] || [ -x .githooks/pre-commit ]; then
  echo "   ✅ Pre-commit hook is executable"
else
  echo "   ⚠️  Pre-commit hook not executable"
  chmod +x .githooks/pre-commit
  echo "   ✅ Fixed permissions"
fi

# Summary
echo ""
echo "✅ Security setup complete!"
echo ""
echo "📋 What's been set up:"
echo "   • Pre-commit hook to check for hardcoded secrets"
echo "   • .env file protection via .gitignore"
echo "   • Security standards documented in SECURITY_STANDARDS.md"
echo ""
echo "📖 Next steps:"
echo "   1. Read SECURITY_STANDARDS.md"
echo "   2. Copy .env.template to .env"
echo "   3. Add your credentials to .env (never commit this!)"
echo "   4. Never hardcode API keys in source code"
echo ""
echo "🚀 You're ready to develop!"
