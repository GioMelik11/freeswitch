#!/bin/bash
# Build FreeSWITCH on top of the base image
# This is much faster since dependencies are already installed

set -e

echo "=========================================="
echo "Building FreeSWITCH"
echo "=========================================="
echo ""

# Check if base image exists
if ! docker images | grep -q "freeswitch-base"; then
    echo "Error: Base image 'freeswitch-base:latest' not found!"
    echo "Please build the base image first:"
    echo "  ./build_base.sh"
    exit 1
fi

echo "Base image found. Building FreeSWITCH..."
echo "This will take 20-40 minutes to compile FreeSWITCH..."
echo ""

# Build FreeSWITCH
docker build -t freeswitch:latest .

echo ""
echo "=========================================="
echo "FreeSWITCH build completed successfully!"
echo "=========================================="
echo ""
echo "You can now run FreeSWITCH with:"
echo "  ./run.sh"
echo ""

