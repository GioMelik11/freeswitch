#!/bin/bash

# Simple Transfer Test for Debian
# Run this script to test transfers on your Debian server

echo "=========================================="
echo "FreeSWITCH Transfer Test - Debian"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
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

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Find FreeSWITCH CLI
find_fs_cli() {
    if command -v fs_cli &> /dev/null; then
        FS_CLI="fs_cli"
        return 0
    elif [ -f "/usr/bin/fs_cli" ]; then
        FS_CLI="/usr/bin/fs_cli"
        return 0
    elif [ -f "/usr/local/freeswitch/bin/fs_cli" ]; then
        FS_CLI="/usr/local/freeswitch/bin/fs_cli"
        return 0
    else
        print_error "FreeSWITCH CLI not found"
        return 1
    fi
}

# Test FreeSWITCH connection
test_connection() {
    print_info "Testing FreeSWITCH connection..."
    if $FS_CLI -x "status" &> /dev/null; then
        print_success "FreeSWITCH is running and accessible"
        return 0
    else
        print_error "Cannot connect to FreeSWITCH"
        print_info "Try: sudo systemctl start freeswitch"
        return 1
    fi
}

# Check system status
check_system() {
    print_info "Checking system status..."
    echo ""
    
    print_info "FreeSWITCH status:"
    $FS_CLI -x "status"
    echo ""
    
    print_info "Registered extensions:"
    $FS_CLI -x "show registrations"
    echo ""
    
    print_info "Active calls:"
    $FS_CLI -x "show calls"
    echo ""
}

# Test extensions
test_extensions() {
    print_info "Testing extension reachability..."
    
    extensions=("1001" "1003")
    
    for ext in "${extensions[@]}"; do
        print_info "Testing extension $ext..."
        result=$($FS_CLI -x "originate user/$ext@\${domain} &echo" 2>&1)
        if echo "$result" | grep -q "SUCCESS"; then
            print_success "Extension $ext is reachable"
        else
            print_warning "Extension $ext may not be reachable"
        fi
        sleep 1
    done
    echo ""
}

# Test transfer features
test_transfer_features() {
    print_info "Testing transfer features..."
    
    features=("dx" "att_xfer")
    
    for feature in "${features[@]}"; do
        print_info "Testing feature: $feature"
        result=$($FS_CLI -x "originate loopback/$feature &echo" 2>&1)
        if echo "$result" | grep -q "SUCCESS"; then
            print_success "Feature $feature is working"
        else
            print_warning "Feature $feature may have issues"
        fi
        sleep 1
    done
    echo ""
}

# Enable debug logging
enable_debug() {
    print_info "Enabling debug logging..."
    $FS_CLI -x "log level 7"
    $FS_CLI -x "console loglevel debug"
    print_success "Debug logging enabled"
    echo ""
}

# Show transfer instructions
show_instructions() {
    print_info "Transfer Testing Instructions:"
    echo ""
    echo "1. Make a test call:"
    echo "   - From extension 1001 to 1003 (or vice versa)"
    echo "   - Use a SIP client or phone"
    echo ""
    echo "2. During the active call, try these DTMF sequences:"
    echo "   - Press *1 then enter 1000# (manual transfer)"
    echo "   - Press *2 then enter 1000# (attended transfer)"
    echo "   - Press *0 (transfer to operator)"
    echo ""
    echo "3. Monitor logs:"
    echo "   - Run: $FS_CLI -x 'log level 7'"
    echo "   - Watch for DTMF reception and transfer attempts"
    echo ""
    echo "4. CLI transfer (if DTMF doesn't work):"
    echo "   - Get call UUID: $FS_CLI -x 'show calls'"
    echo "   - Transfer: $FS_CLI -x 'uuid_transfer <uuid> 1000'"
    echo ""
}

# Main function
main() {
    if ! find_fs_cli; then
        exit 1
    fi
    
    if ! test_connection; then
        exit 1
    fi
    
    check_system
    test_extensions
    test_transfer_features
    enable_debug
    show_instructions
    
    print_success "Transfer test setup completed!"
    print_info "Now make a test call and try the DTMF transfers above"
}

# Run main function
main "$@"
