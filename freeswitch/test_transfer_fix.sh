#!/bin/bash

echo "=== FreeSWITCH Transfer Fix Test ==="
echo "Testing DTMF binding for *1 transfer feature"
echo ""

echo "1. Checking if mod_dptools is loaded..."
fs_cli -x "module_exists mod_dptools"
echo ""

echo "2. Checking dialplan features context..."
fs_cli -x "dialplan"
echo ""

echo "3. Testing dx extension directly..."
fs_cli -x "originate loopback/dx &echo"
echo ""

echo "4. Testing quick_transfer extension..."
fs_cli -x "originate loopback/quick_transfer &echo"
echo ""

echo "5. Testing test_dtmf extension..."
fs_cli -x "originate loopback/test_dtmf &echo"
echo ""

echo "6. Checking active calls..."
fs_cli -x "show calls"
echo ""

echo "=== Test Instructions ==="
echo "To test the *1 DTMF binding:"
echo "1. Make a call to extension 1001 or 1003"
echo "2. During the call, press *1"
echo "3. You should hear a tone/beep"
echo "4. Dial 1003 and press #"
echo "5. The call should transfer with hold music"
echo ""
echo "NEW BEHAVIOR:"
echo "- Press *1 → hear tone → dial 1003 → press #"
echo "- The transfer will start with hold music"
echo ""
echo "If you don't hear the tone after pressing *1, the DTMF binding is not working."
echo "If you hear the tone but transfer fails, check the destination extension."
