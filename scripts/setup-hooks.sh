#!/bin/sh
#
# Setup script for installing Git hooks
#
# This script copies the pre-commit hook to the .git/hooks directory
# and makes it executable

echo "Setting up Git hooks..."

# Copy pre-commit hook
cp scripts/pre-commit .git/hooks/pre-commit

# Make it executable
chmod +x .git/hooks/pre-commit

echo "✅ Pre-commit hook installed successfully!"
echo "Now npm run format:write will run automatically before each commit."
