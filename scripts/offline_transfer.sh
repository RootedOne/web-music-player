#!/bin/bash

# Sepatifay Offline Transfer Script
# This script helps package the project on an online machine and extract it on an offline machine.
# It uses Method 1 (node_modules packaging) to ensure native binaries like Prisma are transferred.

set -e

echo "==========================================="
echo "   Sepatifay Offline Transfer Helper       "
echo "==========================================="
echo ""
echo "Select an action:"
echo "1) Pack project for offline transfer (Run on ONLINE machine)"
echo "2) Unpack project and setup (Run on OFFLINE machine)"
read -p "Enter choice [1 or 2]: " CHOICE

if [ "$CHOICE" == "1" ]; then
    echo ""
    echo "--- Packing Project ---"

    # Get project directory
    read -p "Enter the path to the Sepatifay project directory [default: .]: " PROJECT_DIR
    PROJECT_DIR=${PROJECT_DIR:-.}

    if [ ! -f "$PROJECT_DIR/package.json" ]; then
        echo "Error: Could not find package.json in $PROJECT_DIR. Are you sure this is the Sepatifay project?"
        exit 1
    fi

    # Ensure dependencies are installed
    if [ ! -d "$PROJECT_DIR/node_modules" ]; then
        echo "Warning: node_modules directory not found."
        read -p "Would you like to run 'npm install' now? (Requires internet) [Y/n]: " RUN_NPM
        if [[ -z "$RUN_NPM" || "$RUN_NPM" =~ ^[Yy]$ ]]; then
            (cd "$PROJECT_DIR" && npm install)
            (cd "$PROJECT_DIR" && npx prisma generate) # Crucial for Prisma binaries
        else
            echo "Error: Cannot pack without node_modules. Exiting."
            exit 1
        fi
    fi

    # Get destination
    read -p "Enter the output path for the archive [default: ./sepatifay-offline.tar.gz]: " ARCHIVE_PATH
    ARCHIVE_PATH=${ARCHIVE_PATH:-./sepatifay-offline.tar.gz}

    echo "Creating archive at $ARCHIVE_PATH..."
    # Pack everything, following symlinks if necessary, but exclude git to save a little space optionally? Let's just pack the whole dir.
    # Exclude .git and .next cache to save space, but keep node_modules
    tar -czf "$ARCHIVE_PATH" -C "$PROJECT_DIR" --exclude='.git' --exclude='.next' .

    echo "Success! Archive created at $ARCHIVE_PATH"
    echo "Transfer this file to your offline machine."

elif [ "$CHOICE" == "2" ]; then
    echo ""
    echo "--- Unpacking Project ---"

    read -p "Enter the path to the Sepatifay offline archive (e.g., /mnt/usb/sepatifay-offline.tar.gz): " ARCHIVE_PATH

    if [ ! -f "$ARCHIVE_PATH" ]; then
        echo "Error: Archive not found at $ARCHIVE_PATH."
        exit 1
    fi

    read -p "Enter the destination directory to extract the project [default: ./sepatifay]: " DEST_DIR
    DEST_DIR=${DEST_DIR:-./sepatifay}

    if [ ! -d "$DEST_DIR" ]; then
        mkdir -p "$DEST_DIR"
    fi

    echo "Extracting archive to $DEST_DIR..."
    tar -xzf "$ARCHIVE_PATH" -C "$DEST_DIR"

    echo "Extraction complete."
    echo ""
    echo "To run the application:"
    echo "1. cd $DEST_DIR"
    echo "2. cp .env.example .env (and configure it)"
    echo "3. npx prisma db push (to initialize the local database)"
    echo "4. npm run dev"

else
    echo "Invalid choice. Exiting."
    exit 1
fi
