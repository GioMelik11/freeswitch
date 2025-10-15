#!/bin/bash
#
# FreeSWITCH IVR Configuration Verification Script
# Run this on your Linux FreeSWITCH server to verify all components
#

echo "=================================================="
echo "FreeSWITCH IVR Configuration Verification"
echo "=================================================="
echo ""

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

ERROR_COUNT=0
WARNING_COUNT=0

# Function to check file exists
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} Found: $1"
        return 0
    else
        echo -e "${RED}✗${NC} Missing: $1"
        ((ERROR_COUNT++))
        return 1
    fi
}

# Function to check directory exists
check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} Found: $1"
        return 0
    else
        echo -e "${RED}✗${NC} Missing: $1"
        ((ERROR_COUNT++))
        return 1
    fi
}

# Function to run command and check
check_command() {
    local cmd="$1"
    local description="$2"
    
    echo -n "Checking: $description... "
    if $cmd > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC}"
        return 0
    else
        echo -e "${RED}✗${NC}"
        ((ERROR_COUNT++))
        return 1
    fi
}

echo "1. Checking Configuration Files"
echo "================================"
check_file "/etc/freeswitch/autoload_configs/ivr.conf.xml"
check_file "/etc/freeswitch/dialplan/default.xml"
check_file "/etc/freeswitch/dialplan/public.xml"
check_file "/etc/freeswitch/autoload_configs/callcenter.conf.xml"
check_file "/etc/freeswitch/sip_profiles/external/sip_trunk_provider.xml"
echo ""

echo "2. Checking Sound Files"
echo "======================="
check_dir "/usr/share/freeswitch/sounds/ivr"

# Custom sound file (user must provide)
if check_file "/usr/share/freeswitch/sounds/ivr/incoming.wav"; then
    echo "  → Custom welcome message found"
else
    echo -e "  ${YELLOW}!${NC} You need to create your custom incoming.wav file"
    ((WARNING_COUNT++))
fi

# FreeSWITCH built-in sound files
echo ""
echo "Checking FreeSWITCH built-in IVR sounds:"
check_file "/usr/share/freeswitch/sounds/ivr/ivr-that_was_an_invalid_entry.wav"
check_file "/usr/share/freeswitch/sounds/ivr/ivr-thank_you_for_calling.wav"

# Check if sounds are in en/us/callie/ivr directory instead
if [ ! -f "/usr/share/freeswitch/sounds/ivr/ivr-that_was_an_invalid_entry.wav" ]; then
    echo ""
    echo "Checking alternate sound location:"
    if [ -f "/usr/share/freeswitch/sounds/en/us/callie/ivr/8000/ivr-that_was_an_invalid_entry.wav" ]; then
        echo -e "${YELLOW}!${NC} Sounds found in: /usr/share/freeswitch/sounds/en/us/callie/ivr/"
        echo "  You may need to create symlinks or update paths in ivr.conf.xml"
        echo "  Example:"
        echo "    ln -s /usr/share/freeswitch/sounds/en/us/callie/ivr/8000/*.wav /usr/share/freeswitch/sounds/ivr/"
        ((WARNING_COUNT++))
    fi
fi

echo ""
echo "3. Checking Sound File Permissions"
echo "==================================="
if [ -f "/usr/share/freeswitch/sounds/ivr/incoming.wav" ]; then
    perms=$(stat -c "%a %U:%G" /usr/share/freeswitch/sounds/ivr/incoming.wav 2>/dev/null)
    echo "Permissions: $perms"
    if [[ ! "$perms" =~ "freeswitch" ]]; then
        echo -e "${YELLOW}!${NC} Sound files should be owned by freeswitch user"
        echo "  Fix: sudo chown -R freeswitch:freeswitch /usr/share/freeswitch/sounds/ivr/"
        ((WARNING_COUNT++))
    fi
fi

echo ""
echo "4. Checking FreeSWITCH Service"
echo "=============================="
if systemctl is-active --quiet freeswitch; then
    echo -e "${GREEN}✓${NC} FreeSWITCH service is running"
else
    echo -e "${RED}✗${NC} FreeSWITCH service is not running"
    echo "  Start: sudo systemctl start freeswitch"
    ((ERROR_COUNT++))
fi

echo ""
echo "5. Checking FreeSWITCH CLI Access"
echo "================================="
if command -v fs_cli &> /dev/null; then
    echo -e "${GREEN}✓${NC} fs_cli command found"
    
    # Try to connect to FreeSWITCH
    if timeout 3 fs_cli -x "status" &> /dev/null; then
        echo -e "${GREEN}✓${NC} Successfully connected to FreeSWITCH"
    else
        echo -e "${RED}✗${NC} Cannot connect to FreeSWITCH"
        echo "  Check if FreeSWITCH is running and event socket is configured"
        ((ERROR_COUNT++))
    fi
else
    echo -e "${RED}✗${NC} fs_cli command not found"
    ((ERROR_COUNT++))
fi

echo ""
echo "6. Checking SIP Trunk Registration"
echo "==================================="
if command -v fs_cli &> /dev/null && timeout 3 fs_cli -x "status" &> /dev/null; then
    trunk_status=$(fs_cli -x "sofia status gateway sip_trunk_provider" 2>/dev/null | grep -i "state")
    if echo "$trunk_status" | grep -qi "REGED"; then
        echo -e "${GREEN}✓${NC} SIP trunk registered"
    else
        echo -e "${YELLOW}!${NC} SIP trunk may not be registered"
        echo "  Check: fs_cli -x 'sofia status gateway sip_trunk_provider'"
        ((WARNING_COUNT++))
    fi
else
    echo -e "${YELLOW}!${NC} Cannot check trunk status (FreeSWITCH not accessible)"
fi

echo ""
echo "7. Checking CallCenter Configuration"
echo "===================================="
if command -v fs_cli &> /dev/null && timeout 3 fs_cli -x "status" &> /dev/null; then
    queues=$(fs_cli -x "callcenter_config queue list" 2>/dev/null)
    if echo "$queues" | grep -q "queue1@default"; then
        echo -e "${GREEN}✓${NC} Queue 1 found"
    else
        echo -e "${RED}✗${NC} Queue 1 not found"
        ((ERROR_COUNT++))
    fi
    
    if echo "$queues" | grep -q "queue2@default"; then
        echo -e "${GREEN}✓${NC} Queue 2 found"
    else
        echo -e "${RED}✗${NC} Queue 2 not found"
        ((ERROR_COUNT++))
    fi
    
    agents=$(fs_cli -x "callcenter_config agent list" 2>/dev/null)
    if echo "$agents" | grep -q "1001@default"; then
        echo -e "${GREEN}✓${NC} Agent 1001 found"
    else
        echo -e "${RED}✗${NC} Agent 1001 not found"
        ((ERROR_COUNT++))
    fi
    
    if echo "$agents" | grep -q "1003@default"; then
        echo -e "${GREEN}✓${NC} Agent 1003 found"
    else
        echo -e "${RED}✗${NC} Agent 1003 not found"
        ((ERROR_COUNT++))
    fi
else
    echo -e "${YELLOW}!${NC} Cannot check queues (FreeSWITCH not accessible)"
fi

echo ""
echo "8. Checking XML Syntax"
echo "====================="
if command -v xmllint &> /dev/null; then
    if xmllint --noout /etc/freeswitch/autoload_configs/ivr.conf.xml 2>/dev/null; then
        echo -e "${GREEN}✓${NC} ivr.conf.xml syntax valid"
    else
        echo -e "${RED}✗${NC} ivr.conf.xml has XML errors"
        ((ERROR_COUNT++))
    fi
else
    echo -e "${YELLOW}!${NC} xmllint not installed (optional but recommended)"
    echo "  Install: sudo apt-get install libxml2-utils"
fi

echo ""
echo "=================================================="
echo "Verification Complete"
echo "=================================================="
echo ""
if [ $ERROR_COUNT -eq 0 ] && [ $WARNING_COUNT -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "Your FreeSWITCH IVR system is properly configured."
    exit 0
elif [ $ERROR_COUNT -eq 0 ]; then
    echo -e "${YELLOW}⚠ $WARNING_COUNT warning(s) found${NC}"
    echo ""
    echo "System should work but check warnings above."
    exit 0
else
    echo -e "${RED}✗ $ERROR_COUNT error(s) found${NC}"
    echo -e "${YELLOW}⚠ $WARNING_COUNT warning(s) found${NC}"
    echo ""
    echo "Please fix the errors above before using the system."
    exit 1
fi

