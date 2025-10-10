#!/bin/bash

echo "=== FreeSWITCH DTMF Debugging Script ==="
echo ""

echo "1. Checking FreeSWITCH status..."
fs_cli -x "status"
echo ""

echo "2. Checking loaded modules..."
fs_cli -x "show modules" | grep -E "(mod_dptools|mod_dialplan)"
echo ""

echo "3. Checking dialplan contexts..."
fs_cli -x "dialplan" | grep -E "(default|features)"
echo ""

echo "4. Testing dialplan extensions..."
fs_cli -x "dialplan default 1001"
echo ""
fs_cli -x "dialplan features quick_transfer"
echo ""

echo "5. Checking current call details..."
fs_cli -x "show calls" | head -5
echo ""

echo "6. Testing DTMF binding format..."
echo "Current binding: bind_meta_app data='1 a a execute_extension::quick_transfer XML features'"
echo "This should work: Press *1 during active call"
echo ""

echo "7. Alternative test - Manual transfer..."
echo "If DTMF doesn't work, try:"
echo "fs_cli -x 'uuid_transfer <call_uuid> 1003'"
echo ""

echo "=== Debugging Steps ==="
echo "1. Make sure you're in an active call"
echo "2. Press *1 (should hear tone immediately)"
echo "3. If no tone, DTMF binding is not working"
echo "4. Check logs: fs_cli -x 'console loglevel 7'"
echo "5. Try alternative: fs_cli -x 'uuid_transfer <uuid> 1003'"
