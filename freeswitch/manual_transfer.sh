#!/bin/sh

# Manual Transfer Script for Docker
# Use this to manually transfer the active call

echo "=========================================="
echo "Manual Transfer - Docker"
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

# Extract the first UUID from the call list
UUID=$($FS_CLI -x "show calls" | grep -v "uuid,direction" | grep -v "^$" | head -1 | awk -F',' '{print $1}')

if [ -z "$UUID" ] || [ "$UUID" = "uuid" ]; then
    echo "[WARNING] No active calls found."
    echo ""
    echo "[INFO] To test transfers:"
    echo "1. Make a call between extensions 1001 and 1003"
    echo "2. Run this script again"
    exit 1
fi

echo "[INFO] Found call UUID: $UUID"
echo ""

# Transfer to extension 1003
echo "[INFO] Transferring call to extension 1003..."
$FS_CLI -x "uuid_transfer $UUID 1003"
echo ""

# Show result
echo "[INFO] Transfer command sent. Checking call status..."
sleep 2
$FS_CLI -x "show calls"
echo ""

echo "[SUCCESS] Transfer completed!"
echo ""
echo "[INFO] If you want to transfer to a different extension:"
echo "/usr/bin/fs_cli -x \"uuid_transfer $UUID <extension>\""
echo ""
echo "[INFO] Available extensions: 1000, 1001, 1002, 1003, 1004, 1005"
