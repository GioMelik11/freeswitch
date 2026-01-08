#!/bin/bash
# Build the base image with all dependencies
# This only needs to be rebuilt when dependencies change

set -e

echo "=========================================="
echo "Building FreeSWITCH Base Image"
echo "=========================================="
echo ""
echo "This will create a base image with all dependencies."
echo "This image can be reused for multiple FreeSWITCH builds."
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed. Please install Docker first."
    exit 1
fi

echo "Building base image: freeswitch-base:latest"
echo "This may take 5-10 minutes to download and install dependencies..."
echo ""

docker build -f Dockerfile.base -t freeswitch-base:latest .

echo ""
echo "=========================================="
echo "Base image built successfully!"
echo "=========================================="
echo ""
echo "You can now build FreeSWITCH with:"
echo "  ./build_freeswitch.sh"
echo ""
echo "Or if you need to add more dependencies, edit Dockerfile.base and run this script again."
echo ""

