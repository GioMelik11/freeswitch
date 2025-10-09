#!/bin/bash

echo "=== FreeSWITCH Transfer Debug Script ==="
echo ""

echo "1. Reloading configuration..."
fs_cli -x "reloadxml"
echo ""

echo "2. Testing dialplan with correct commands..."
echo "Testing *1 pattern:"
fs_cli -x "regex *1"
echo ""
echo "Testing *2 pattern:"
fs_cli -x "regex *2"
echo ""

echo "3. Testing features context..."
echo "Testing blind_transfer_dtmf:"
fs_cli -x "regex blind_transfer_dtmf"
echo ""
echo "Testing attended_transfer_dtmf:"
fs_cli -x "regex attended_transfer_dtmf"
echo ""

echo "4. Check if bind_digit_action application exists..."
fs_cli -x "show applications" | grep -i bind
echo ""

echo "5. Test a simple call to extension 1001..."
echo "This will create a call to extension 1001 with echo test:"
fs_cli -x "originate loopback/1001 &echo"
echo ""

echo "6. Check current channels..."
fs_cli -x "show channels"
echo ""

echo "=== Manual Test Instructions ==="
echo ""
echo "1. From another extension or softphone, call extension 1001"
echo "2. Once connected, try pressing *1 or *2"
echo "3. If nothing happens, the DTMF binding is not working"
echo ""
echo "=== Alternative Test ==="
echo ""
echo "Test the legacy feature codes:"
echo "Call *1 directly (not during a call)"
echo "Call *2 directly (not during a call)"
echo ""
echo "Script completed."
