#!/bin/bash

# FreeSWITCH Transfer Debug Script
# This script helps debug call transfer functionality
# Run this script to test and diagnose transfer issues

echo "=========================================="
echo "FreeSWITCH Transfer Debug Script"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
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

# Check if FreeSWITCH CLI is available
check_fs_cli() {
    print_status "Checking FreeSWITCH CLI availability..."
    if command -v fs_cli &> /dev/null; then
        print_success "FreeSWITCH CLI is available"
        return 0
    elif [ -f "/usr/bin/fs_cli" ]; then
        print_success "FreeSWITCH CLI found at /usr/bin/fs_cli"
        return 0
    elif [ -f "/usr/local/freeswitch/bin/fs_cli" ]; then
        print_success "FreeSWITCH CLI found at /usr/local/freeswitch/bin/fs_cli"
        return 0
    else
        print_error "FreeSWITCH CLI not found. Please ensure FreeSWITCH is installed and in PATH"
        print_status "Common locations: /usr/bin/fs_cli, /usr/local/freeswitch/bin/fs_cli"
        exit 1
    fi
}

# Test FreeSWITCH connection
test_fs_connection() {
    print_status "Testing FreeSWITCH connection..."
    if fs_cli -x "status" &> /dev/null; then
        print_success "FreeSWITCH is running and accessible"
        return 0
    else
        print_error "Cannot connect to FreeSWITCH. Is it running?"
        exit 1
    fi
}

# Check required modules
check_modules() {
    print_status "Checking required modules..."
    
    modules=("mod_dptools" "mod_sofia" "mod_loopback" "mod_conference")
    
    for module in "${modules[@]}"; do
        if fs_cli -x "module_exists $module" | grep -q "true"; then
            print_success "$module is loaded"
        else
            print_error "$module is NOT loaded"
        fi
    done
}

# Check extensions registration
check_registrations() {
    print_status "Checking extension registrations..."
    echo ""
    fs_cli -x "show registrations"
    echo ""
}

# Check active calls
check_active_calls() {
    print_status "Checking active calls..."
    echo ""
    fs_cli -x "show calls"
    echo ""
}

# Check dialplan
check_dialplan() {
    print_status "Checking dialplan configuration..."
    echo ""
    print_status "Features context:"
    fs_cli -x "dialplan features"
    echo ""
    print_status "Default context:"
    fs_cli -x "dialplan default"
    echo ""
}

# Test extension reachability
test_extensions() {
    print_status "Testing extension reachability..."
    
    extensions=("1000" "1001" "1002" "1003" "1004" "1005")
    
    for ext in "${extensions[@]}"; do
        print_status "Testing extension $ext..."
        result=$(fs_cli -x "originate user/$ext@\${domain} &echo" 2>&1)
        if echo "$result" | grep -q "SUCCESS"; then
            print_success "Extension $ext is reachable"
        else
            print_warning "Extension $ext may not be reachable"
        fi
        sleep 1
    done
}

# Test transfer features
test_transfer_features() {
    print_status "Testing transfer features..."
    
    features=("dx" "att_xfer" "transfer_to_1003" "test_transfer")
    
    for feature in "${features[@]}"; do
        print_status "Testing feature: $feature"
        result=$(fs_cli -x "originate loopback/$feature &echo" 2>&1)
        if echo "$result" | grep -q "SUCCESS"; then
            print_success "Feature $feature is working"
        else
            print_warning "Feature $feature may have issues"
        fi
        sleep 1
    done
}

# Enable debug logging
enable_debug() {
    print_status "Enabling debug logging..."
    fs_cli -x "log level 7"
    fs_cli -x "console loglevel debug"
    fs_cli -x "fsctl loglevel 7"
    print_success "Debug logging enabled"
}

# Test DTMF detection
test_dtmf() {
    print_status "Testing DTMF detection..."
    print_warning "This will create a test call. Press DTMF keys to test detection."
    print_status "Press Ctrl+C to stop the test call"
    
    fs_cli -x "originate loopback/test_dtmf &echo" &
    TEST_PID=$!
    
    sleep 5
    kill $TEST_PID 2>/dev/null
    print_status "DTMF test completed"
}

# Show transfer help
show_transfer_help() {
    echo ""
    print_status "Transfer Methods Available:"
    echo "1. CLI Transfer: fs_cli -x \"uuid_transfer <uuid> destination\""
    echo "2. DTMF *1: Quick transfer to extension"
    echo "3. DTMF *2: Manual transfer (dx)"
    echo "4. DTMF *5: Attended transfer"
    echo "5. DTMF *0: Transfer to operator"
    echo ""
    print_status "To test transfers:"
    echo "1. Make a call between two extensions"
    echo "2. During the call, press the DTMF keys above"
    echo "3. Monitor logs for transfer activity"
    echo ""
}

# Main menu
show_menu() {
    echo ""
    echo "=========================================="
    echo "Transfer Debug Menu"
    echo "=========================================="
    echo "1. Full System Check"
    echo "2. Check Modules Only"
    echo "3. Check Registrations Only"
    echo "4. Check Active Calls"
    echo "5. Test Extensions"
    echo "6. Test Transfer Features"
    echo "7. Enable Debug Logging"
    echo "8. Test DTMF Detection"
    echo "9. Show Transfer Help"
    echo "10. Exit"
    echo "=========================================="
    echo -n "Choose an option (1-10): "
}

# Full system check
full_system_check() {
    print_status "Running full system check..."
    check_fs_cli
    test_fs_connection
    check_modules
    check_registrations
    check_active_calls
    check_dialplan
    test_extensions
    test_transfer_features
    show_transfer_help
}

# Main script
main() {
    # Check if running interactively
    if [[ -t 0 ]]; then
        # Interactive mode
        while true; do
            show_menu
            read -r choice
            
            case $choice in
                1)
                    full_system_check
                    ;;
                2)
                    check_modules
                    ;;
                3)
                    check_registrations
                    ;;
                4)
                    check_active_calls
                    ;;
                5)
                    test_extensions
                    ;;
                6)
                    test_transfer_features
                    ;;
                7)
                    enable_debug
                    ;;
                8)
                    test_dtmf
                    ;;
                9)
                    show_transfer_help
                    ;;
                10)
                    print_status "Exiting..."
                    exit 0
                    ;;
                *)
                    print_error "Invalid option. Please choose 1-10."
                    ;;
            esac
            
            echo ""
            echo "Press Enter to continue..."
            read -r
        done
    else
        # Non-interactive mode - run full check
        full_system_check
    fi
}

# Run main function
main "$@"
