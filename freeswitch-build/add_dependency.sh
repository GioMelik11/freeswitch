#!/bin/bash
# Script to add a new dependency to the base image
# Usage: ./add_dependency.sh package-name

set -e

if [ -z "$1" ]; then
    echo "Usage: ./add_dependency.sh <package-name>"
    echo "Example: ./add_dependency.sh libzrtp-dev"
    exit 1
fi

PACKAGE=$1

echo "=========================================="
echo "Adding dependency: $PACKAGE"
echo "=========================================="
echo ""

# Check if base image exists
if ! docker images | grep -q "freeswitch-base"; then
    echo "Base image not found. Building it first..."
    ./build_base.sh
fi

echo "Starting interactive container to install $PACKAGE..."
echo ""

# Start a container from the base image
CONTAINER_ID=$(docker run -d freeswitch-base:latest sleep 3600)

echo "Container started: $CONTAINER_ID"
echo "Installing $PACKAGE..."
echo ""

# Install the package
docker exec $CONTAINER_ID bash -c "apt-get update && apt-get install -y $PACKAGE && rm -rf /var/lib/apt/lists/*"

echo ""
echo "Committing changes to base image..."
docker commit $CONTAINER_ID freeswitch-base:latest

echo "Cleaning up..."
docker stop $CONTAINER_ID > /dev/null
docker rm $CONTAINER_ID > /dev/null

echo ""
echo "=========================================="
echo "Dependency $PACKAGE added successfully!"
echo "=========================================="
echo ""
echo "The base image has been updated. You can now rebuild FreeSWITCH:"
echo "  ./build_freeswitch.sh"
echo ""

