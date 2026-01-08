#!/bin/bash

# FreeSWITCH Docker Run Script

set -e

echo "=========================================="
echo "Starting FreeSWITCH Container"
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
    echo "Using docker-compose..."
else
    USE_COMPOSE=false
    echo "Using docker commands directly..."
fi

# Create necessary directories
echo "Creating directories for volumes..."
mkdir -p freeswitch_conf
mkdir -p freeswitch_logs
mkdir -p freeswitch_recordings
mkdir -p freeswitch_storage

# Check if image exists
if [ "$USE_COMPOSE" = true ]; then
    docker-compose up -d
    echo ""
    echo "FreeSWITCH is starting..."
    echo "View logs with: docker-compose logs -f"
    echo "Access FS CLI with: docker exec -it freeswitch fs_cli"
else
    # Check if container already exists
    if docker ps -a --format '{{.Names}}' | grep -q "^freeswitch$"; then
        echo "Container 'freeswitch' already exists. Starting it..."
        docker start freeswitch
    else
        echo "Creating and starting new container..."
        docker run -d \
            --name freeswitch \
            --network host \
            freeswitch:latest
    fi
    echo ""
    echo "FreeSWITCH is starting..."
    echo "View logs with: docker logs -f freeswitch"
    echo "Access FS CLI with: docker exec -it freeswitch fs_cli"
fi

echo ""
echo "FreeSWITCH ports:"
echo "  SIP: 5060 (TCP/UDP), 5080 (TCP/UDP)"
echo "  Event Socket: 8021 (TCP)"
echo "  RTP: 16384-32768 (UDP)"
echo ""

