#!/bin/bash
# Quick status check for FreeSWITCH build

echo "=== FreeSWITCH Docker Build Status ==="
echo ""

# Check if build log exists
if [ ! -f /tmp/freeswitch_build.log ]; then
    echo "❌ Build log not found. Build may not have started."
    exit 1
fi

# Get the last few lines
echo "📋 Last 10 lines of build log:"
echo "----------------------------------------"
tail -10 /tmp/freeswitch_build.log
echo ""

# Check for errors
if grep -q "ERROR" /tmp/freeswitch_build.log; then
    echo "⚠️  ERRORS DETECTED:"
    grep "ERROR" /tmp/freeswitch_build.log | tail -3
    echo ""
fi

# Check for successful completion
if grep -q "Successfully tagged freeswitch:latest" /tmp/freeswitch_build.log; then
    echo "✅ BUILD COMPLETED SUCCESSFULLY!"
    echo ""
    echo "You can now run FreeSWITCH with:"
    echo "  sudo ./run.sh"
elif grep -q "DONE" /tmp/freeswitch_build.log; then
    echo "📊 Build steps completed:"
    grep "DONE" /tmp/freeswitch_build.log | tail -5
    echo ""
    echo "⏳ Build is still in progress..."
fi

echo ""
echo "To view live progress: tail -f /tmp/freeswitch_build.log"

