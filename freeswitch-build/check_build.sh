#!/bin/bash
# Script to check FreeSWITCH Docker build progress

echo "Checking FreeSWITCH Docker build status..."
echo ""

# Check if build is running
if docker ps -a --format '{{.Names}}' | grep -q "freeswitch"; then
    echo "FreeSWITCH container found:"
    docker ps -a | grep freeswitch
    echo ""
fi

# Check if image exists
if docker images | grep -q "freeswitch"; then
    echo "FreeSWITCH image found:"
    docker images | grep freeswitch
    echo ""
fi

# Check build log
if [ -f /tmp/freeswitch_build.log ]; then
    echo "=== Recent Build Log (last 30 lines) ==="
    tail -30 /tmp/freeswitch_build.log
    echo ""
    echo "=== Build Progress ==="
    if grep -q "DONE" /tmp/freeswitch_build.log; then
        echo "Build completed steps:"
        grep "DONE" /tmp/freeswitch_build.log | tail -5
    fi
    if grep -q "ERROR" /tmp/freeswitch_build.log; then
        echo ""
        echo "⚠️  ERRORS FOUND:"
        grep "ERROR" /tmp/freeswitch_build.log | tail -5
    fi
else
    echo "Build log not found. Build may not have started yet."
fi

echo ""
echo "To view full build log: tail -f /tmp/freeswitch_build.log"
echo "To check Docker processes: docker ps -a"

