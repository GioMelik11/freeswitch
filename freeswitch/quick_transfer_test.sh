#!/bin/bash

# Quick Transfer Test Script
# Run this during an active call to test transfers

echo "=========================================="
echo "Quick Transfer Test Script"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Get current calls
print_info "Current active calls:"
fs_cli -x "show calls"
echo ""

# Get call UUIDs
print_info "Getting call UUIDs for transfer testing..."
CALLS=$(fs_cli -x "show calls" | grep -E "uuid:" | awk '{print $1}' | cut -d: -f2)

if [ -z "$CALLS" ]; then
    print_warning "No active calls found. Please make a call first."
    echo ""
    print_info "To test transfers:"
    echo "1. Call extension 1001 from extension 1003 (or vice versa)"
    echo "2. Run this script again"
    echo "3. Use the UUIDs shown above for CLI transfers"
    exit 1
fi

echo "Found call UUIDs:"
echo "$CALLS"
echo ""

# Test transfer to 1003
print_info "Testing transfer to extension 1003..."
for uuid in $CALLS; do
    print_info "Transferring call $uuid to 1003..."
    fs_cli -x "uuid_transfer $uuid 1003"
    sleep 2
done

echo ""
print_success "Transfer commands sent. Check if calls were transferred."
echo ""

# Show current calls after transfer
print_info "Current calls after transfer attempt:"
fs_cli -x "show calls"
echo ""

print_info "DTMF Transfer Test Instructions:"
echo "During an active call, try these DTMF sequences:"
echo "1. Press *1 - should transfer to 1003"
echo "2. Press *2 then 1003# - manual transfer"
echo "3. Press *5 then 1003# - attended transfer"
echo "4. Press *0 - transfer to operator"
echo ""
echo "Monitor logs with: fs_cli -x 'log level 7'"
