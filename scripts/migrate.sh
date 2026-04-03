#!/bin/bash

# Exit on any error
set -e

echo "Welcome to the Sepatifay Migration Script!"
echo "This script will migrate your database and uploaded files from your old installation."
echo ""

# Ask for the old installation directory
read -p "Please enter the absolute or relative path to your OLD installation directory: " OLD_DIR

# Check if the directory exists
if [ ! -d "$OLD_DIR" ]; then
    echo "Error: Directory '$OLD_DIR' does not exist."
    exit 1
fi

echo ""
echo "Starting migration..."

# Check if required files exist in the old directory
OLD_DB="$OLD_DIR/prisma/dev.db"
OLD_UPLOADS="$OLD_DIR/public/uploads"

if [ ! -f "$OLD_DB" ]; then
    echo "Error: Could not find database at '$OLD_DB'. Make sure you entered the correct path."
    exit 1
fi

if [ ! -d "$OLD_UPLOADS" ]; then
    echo "Warning: Could not find uploads folder at '$OLD_UPLOADS'. If you didn't have any uploads, this is fine."
    read -p "Do you want to continue without copying uploads? (y/N) " CONTINUE_WITHOUT_UPLOADS
    if [[ ! "$CONTINUE_WITHOUT_UPLOADS" =~ ^[Yy]$ ]]; then
        echo "Migration aborted."
        exit 1
    fi
    HAS_UPLOADS=false
else
    HAS_UPLOADS=true
fi

# Create target directories if they don't exist
echo "Creating target directories..."
mkdir -p prisma
mkdir -p public

# Copy database
echo "Copying database..."
cp "$OLD_DB" "prisma/dev.db"

# Copy uploads folder
if [ "$HAS_UPLOADS" = true ]; then
    echo "Copying uploads folder..."
    # If the target already exists, remove it or just let cp -R merge.
    # To be safe and clean, we remove the existing empty one if it exists or just copy.
    # Actually `cp -R source target` where target exists will put source INSIDE target.
    # Let's ensure public/uploads behaves correctly.
    if [ -d "public/uploads" ]; then
        cp -a "$OLD_UPLOADS/." "public/uploads/"
    else
        cp -a "$OLD_UPLOADS" "public/"
    fi
fi

echo "Data migration complete!"
echo ""

# Install dependencies
echo "Installing dependencies (npm install)..."
npm install

# Run database migration script
echo ""
echo "Running username migration script..."
if [ -f "scripts/migrate-usernames.mjs" ]; then
    node scripts/migrate-usernames.mjs
    echo "Username migration complete!"
else
    echo "Warning: 'scripts/migrate-usernames.mjs' not found in the current directory."
    echo "Skipping username migration."
fi

echo ""
echo "Migration finished successfully!"
