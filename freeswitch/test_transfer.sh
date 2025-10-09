#!/bin/bash

# FreeSWITCH Transfer Testing Script
# Run this script to test transfer functionality

echo "=== FreeSWITCH Transfer Testing Script ==="
echo ""

# Check if FreeSWITCH is running
echo "1. Checking FreeSWITCH status..."
fs_cli -x "status" 2>/dev/null
if [ $? -ne 0 ]; then
    echo "ERROR: FreeSWITCH is not running or fs_cli is not available"
    echo "Please start FreeSWITCH first"
    exit 1
fi

echo "✅ FreeSWITCH is running"
echo ""

# Reload configuration
echo "2. Reloading configuration..."
fs_cli -x "reloadxml"
echo "✅ Configuration reloaded"
echo ""

# Check extensions
echo "3. Checking extension registrations..."
fs_cli -x "sofia status profile internal reg"
echo ""

# Test dialplan
echo "4. Testing dialplan..."
fs_cli -x "dialplan xml_locate *1"
fs_cli -x "dialplan xml_locate *2"
echo ""

# Check features context
echo "5. Testing features context..."
fs_cli -x "dialplan xml_locate blind_transfer_dtmf"
fs_cli -x "dialplan xml_locate attended_transfer_dtmf"
echo ""

echo "=== Testing Commands ==="
echo ""
echo "To test transfers manually:"
echo "1. Call extension 1001 from another extension or softphone"
echo "2. During the call, press *1 for blind transfer or *2 for attended transfer"
echo "3. Enter destination number when prompted"
echo "4. For attended transfer, press ## to complete or #* to cancel"
echo ""
echo "CLI test commands:"
echo "fs_cli -x \"originate loopback/1001 &echo\""
echo "fs_cli -x \"show channels\""
echo ""
echo "=== Debug Commands ==="
echo ""
echo "Check active channels:"
echo "fs_cli -x \"show channels\""
echo ""
echo "Check DTMF events:"
echo "fs_cli -x \"console loglevel debug\""
echo ""
echo "Monitor calls:"
echo "fs_cli -x \"conference list\""
echo ""

echo "=== Troubleshooting ==="
echo ""
echo "If transfers are not working:"
echo "1. Check if extensions 1001 and 1003 are registered"
echo "2. Verify DTMF is being sent (check softphone DTMF settings)"
echo "3. Check FreeSWITCH logs for errors"
echo "4. Test with CLI commands first"
echo ""
echo "Common issues:"
echo "- Softphone not sending DTMF as RFC2833"
echo "- Extensions not registered"
echo "- Configuration not reloaded"
echo "- Audio prompts not working (using tone_stream now)"
echo ""

echo "Script completed. Check the output above for any issues."
