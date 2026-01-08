#!/bin/bash

# FreeSWITCH Docker Build Script
# This script helps build and run FreeSWITCH in Docker

set -e

echo "=========================================="
echo "FreeSWITCH Docker Build Script"
echo "=========================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if command -v docker-compose &> /dev/null; then
    USE_COMPOSE=true
    echo "Docker Compose detected. Using docker-compose for build and run."
else
    USE_COMPOSE=false
    echo "Docker Compose not found. Using docker commands directly."
fi

echo ""
echo "Starting FreeSWITCH Docker build..."
echo "This may take 30-60 minutes depending on your system."
echo ""

# Build the image
if [ "$USE_COMPOSE" = true ]; then
    echo "Building with docker-compose..."
    docker-compose build
else
    echo "Building with docker build..."
    docker build -t freeswitch:latest .
fi

echo ""
echo "=========================================="
echo "Build completed successfully!"
echo "=========================================="
echo ""
echo "To run FreeSWITCH, use:"
if [ "$USE_COMPOSE" = true ]; then
    echo "  docker-compose up -d"
else
    echo "  docker run -d --name freeswitch -p 5060:5060/tcp -p 5060:5060/udp -p 5080:5080/tcp -p 5080:5080/udp -p 8021:8021/tcp -p 16384-32768:16384-32768/udp freeswitch:latest"
fi
echo ""
echo "To view logs:"
if [ "$USE_COMPOSE" = true ]; then
    echo "  docker-compose logs -f"
else
    echo "  docker logs -f freeswitch"
fi
echo ""

