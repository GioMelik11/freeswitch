#!/bin/sh

# Quick CLI Transfer for Docker
# Use this to transfer calls via CLI when DTMF doesn't work

echo "=========================================="
echo "Quick CLI Transfer - Docker"
echo "=========================================="
echo ""

# Find FreeSWITCH CLI
FS_CLI=""
if [ -f "/usr/bin/fs_cli" ]; then
    FS_CLI="/usr/bin/fs_cli"
elif [ -f "/usr/local/freeswitch/bin/fs_cli" ]; then
    FS_CLI="/usr/local/freeswitch/bin/fs_cli"
elif [ -f "/opt/freeswitch/bin/fs_cli" ]; then
    FS_CLI="/opt/freeswitch/bin/fs_cli"
else
    echo "[ERROR] FreeSWITCH CLI not found"
    exit 1
fi

# Get current calls
echo "[INFO] Current active calls:"
$FS_CLI -x "show calls"
echo ""

# Get call UUIDs
echo "[INFO] Getting call UUIDs for transfer..."
CALLS=$($FS_CLI -x "show calls" | grep "uuid:" | awk '{print $1}' | cut -d: -f2)

if [ -z "$CALLS" ]; then
    echo "[WARNING] No active calls found. Please make a call first."
    echo ""
    echo "[INFO] To test transfers:"
    echo "1. Call extension 1001 from extension 1003 (or vice versa)"
    echo "2. Run this script again"
    echo "3. Use the UUIDs shown above for CLI transfers"
    exit 1
fi

echo "Found call UUIDs:"
echo "$CALLS"
echo ""

# Transfer to 1003
echo "[INFO] Transferring calls to extension 1003..."
for uuid in $CALLS; do
    echo "Transferring call $uuid to 1003..."
    $FS_CLI -x "uuid_transfer $uuid 1003"
    sleep 2
done

echo ""
echo "[SUCCESS] Transfer commands sent. Check if calls were transferred."
echo ""

# Show current calls after transfer
echo "[INFO] Current calls after transfer attempt:"
$FS_CLI -x "show calls"
echo ""

echo "[INFO] DTMF Transfer Test Instructions:"
echo "During an active call, try these DTMF sequences:"
echo "1. Press *1 - should trigger dx (manual transfer)"
echo "2. Press *2 - should trigger att_xfer (attended transfer)"
echo "3. Press *0 - should transfer to operator"
echo ""
echo "Monitor logs with: $FS_CLI -x 'log level 7'"
echo "Or watch Docker logs: docker logs -f <container_name>"
