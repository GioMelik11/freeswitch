#!/bin/bash
# Build everything: base image + FreeSWITCH
# This is the complete build process

set -e

echo "=========================================="
echo "Complete FreeSWITCH Build Process"
echo "=========================================="
echo ""

# Step 1: Build base image
echo "Step 1/2: Building base image with dependencies..."
echo "----------------------------------------"
if [ -f "build_base.sh" ]; then
    ./build_base.sh
else
    docker build -f Dockerfile.base -t freeswitch-base:latest .
fi

echo ""
echo "Step 2/2: Building FreeSWITCH..."
echo "----------------------------------------"
if [ -f "build_freeswitch.sh" ]; then
    ./build_freeswitch.sh
else
    docker build -t freeswitch:latest .
fi

echo ""
echo "=========================================="
echo "All builds completed successfully!"
echo "=========================================="
echo ""
echo "You can now run FreeSWITCH with:"
echo "  ./run.sh"
echo ""

