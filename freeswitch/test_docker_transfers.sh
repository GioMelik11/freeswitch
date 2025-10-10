#!/bin/sh

# Simple Transfer Test for Docker/BusyBox
# Run this script inside your FreeSWITCH Docker container

echo "=========================================="
echo "FreeSWITCH Transfer Test - Docker"
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
    echo "Searching for fs_cli..."
    find / -name "fs_cli" 2>/dev/null | head -3
    exit 1
fi

echo "[INFO] Using FreeSWITCH CLI: $FS_CLI"
echo ""

# Test FreeSWITCH connection
echo "[INFO] Testing FreeSWITCH connection..."
if $FS_CLI -x "status" >/dev/null 2>&1; then
    echo "[SUCCESS] FreeSWITCH is running and accessible"
else
    echo "[ERROR] Cannot connect to FreeSWITCH"
    echo "FreeSWITCH may not be running in the container"
    exit 1
fi
echo ""

# Check system status
echo "[INFO] Checking system status..."
echo ""
echo "FreeSWITCH status:"
$FS_CLI -x "status"
echo ""

echo "Registered extensions:"
$FS_CLI -x "show registrations"
echo ""

echo "Active calls:"
$FS_CLI -x "show calls"
echo ""

# Check modules
echo "[INFO] Checking required modules..."
echo "mod_dptools: $($FS_CLI -x "module_exists mod_dptools")"
echo "mod_sofia: $($FS_CLI -x "module_exists mod_sofia")"
echo "mod_loopback: $($FS_CLI -x "module_exists mod_loopback")"
echo ""

# Test extensions
echo "[INFO] Testing extension reachability..."
echo "Testing extension 1001..."
$FS_CLI -x "originate user/1001@\${domain} &echo" >/dev/null 2>&1
sleep 1

echo "Testing extension 1003..."
$FS_CLI -x "originate user/1003@\${domain} &echo" >/dev/null 2>&1
sleep 1
echo ""

# Test transfer features
echo "[INFO] Testing transfer features..."
echo "Testing dx feature..."
$FS_CLI -x "originate loopback/dx &echo" >/dev/null 2>&1
sleep 1

echo "Testing att_xfer feature..."
$FS_CLI -x "originate loopback/att_xfer &echo" >/dev/null 2>&1
sleep 1
echo ""

# Enable debug logging
echo "[INFO] Enabling debug logging..."
$FS_CLI -x "log level 7"
$FS_CLI -x "console loglevel debug"
echo "[SUCCESS] Debug logging enabled"
echo ""

# Show transfer instructions
echo "[INFO] Transfer Testing Instructions:"
echo ""
echo "1. Make a test call:"
echo "   - From extension 1001 to 1003 (or vice versa)"
echo "   - Use a SIP client connected to this Docker container"
echo ""
echo "2. During the active call, try these DTMF sequences:"
echo "   - Press *1 then enter 1000# (manual transfer)"
echo "   - Press *2 then enter 1000# (attended transfer)"
echo "   - Press *0 (transfer to operator)"
echo ""
echo "3. Monitor logs:"
echo "   - Run: $FS_CLI -x 'log level 7'"
echo "   - Watch container logs: docker logs <container_name>"
echo ""
echo "4. CLI transfer (if DTMF doesn't work):"
echo "   - Get call UUID: $FS_CLI -x 'show calls'"
echo "   - Transfer: $FS_CLI -x 'uuid_transfer <uuid> 1000'"
echo ""

echo "[SUCCESS] Transfer test setup completed!"
echo "Now make a test call and try the DTMF transfers above"
