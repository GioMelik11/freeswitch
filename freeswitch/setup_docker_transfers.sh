#!/bin/sh

# FreeSWITCH Transfer Setup for Docker/BusyBox
# This script sets up the environment for transfer testing in Docker

echo "=========================================="
echo "FreeSWITCH Transfer Setup for Docker"
echo "=========================================="
echo ""

# Colors (simplified for BusyBox)
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Find FreeSWITCH CLI in Docker container
find_freeswitch() {
    print_status "Looking for FreeSWITCH installation in Docker..."
    
    # Common Docker/BusyBox locations
    if [ -f "/usr/bin/fs_cli" ]; then
        print_success "Found FreeSWITCH CLI at: /usr/bin/fs_cli"
        FS_CLI_PATH="/usr/bin/fs_cli"
        return 0
    elif [ -f "/usr/local/freeswitch/bin/fs_cli" ]; then
        print_success "Found FreeSWITCH CLI at: /usr/local/freeswitch/bin/fs_cli"
        FS_CLI_PATH="/usr/local/freeswitch/bin/fs_cli"
        return 0
    elif [ -f "/opt/freeswitch/bin/fs_cli" ]; then
        print_success "Found FreeSWITCH CLI at: /opt/freeswitch/bin/fs_cli"
        FS_CLI_PATH="/opt/freeswitch/bin/fs_cli"
        return 0
    else
        print_error "FreeSWITCH CLI not found in common locations"
        print_status "Searching for fs_cli..."
        find / -name "fs_cli" 2>/dev/null | head -5
        return 1
    fi
}

# Test FreeSWITCH connection
test_freeswitch_connection() {
    print_status "Testing FreeSWITCH connection..."
    
    if [ -n "$FS_CLI_PATH" ]; then
        if "$FS_CLI_PATH" -x "status" >/dev/null 2>&1; then
            print_success "FreeSWITCH is accessible"
            return 0
        else
            print_error "Cannot connect to FreeSWITCH"
            print_status "FreeSWITCH may not be running in the container"
            return 1
        fi
    else
        print_error "FreeSWITCH CLI path not set"
        return 1
    fi
}

# Check FreeSWITCH status
check_freeswitch_status() {
    print_status "Checking FreeSWITCH status..."
    
    if [ -n "$FS_CLI_PATH" ]; then
        print_status "FreeSWITCH status:"
        "$FS_CLI_PATH" -x "status"
        echo ""
        
        print_status "Registered extensions:"
        "$FS_CLI_PATH" -x "show registrations"
        echo ""
        
        print_status "Active calls:"
        "$FS_CLI_PATH" -x "show calls"
        echo ""
    fi
}

# Check required modules
check_modules() {
    print_status "Checking required modules..."
    
    if [ -n "$FS_CLI_PATH" ]; then
        print_status "Checking mod_dptools..."
        "$FS_CLI_PATH" -x "module_exists mod_dptools"
        
        print_status "Checking mod_sofia..."
        "$FS_CLI_PATH" -x "module_exists mod_sofia"
        
        print_status "Checking mod_loopback..."
        "$FS_CLI_PATH" -x "module_exists mod_loopback"
        echo ""
    fi
}

# Test extensions
test_extensions() {
    print_status "Testing extension reachability..."
    
    if [ -n "$FS_CLI_PATH" ]; then
        print_status "Testing extension 1001..."
        "$FS_CLI_PATH" -x "originate user/1001@\${domain} &echo" >/dev/null 2>&1
        sleep 1
        
        print_status "Testing extension 1003..."
        "$FS_CLI_PATH" -x "originate user/1003@\${domain} &echo" >/dev/null 2>&1
        sleep 1
        echo ""
    fi
}

# Test transfer features
test_transfer_features() {
    print_status "Testing transfer features..."
    
    if [ -n "$FS_CLI_PATH" ]; then
        print_status "Testing dx feature..."
        "$FS_CLI_PATH" -x "originate loopback/dx &echo" >/dev/null 2>&1
        sleep 1
        
        print_status "Testing att_xfer feature..."
        "$FS_CLI_PATH" -x "originate loopback/att_xfer &echo" >/dev/null 2>&1
        sleep 1
        echo ""
    fi
}

# Enable debug logging
enable_debug() {
    print_status "Enabling debug logging..."
    
    if [ -n "$FS_CLI_PATH" ]; then
        "$FS_CLI_PATH" -x "log level 7"
        "$FS_CLI_PATH" -x "console loglevel debug"
        print_success "Debug logging enabled"
        echo ""
    fi
}

# Show transfer instructions
show_instructions() {
    print_status "Transfer Testing Instructions for Docker:"
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
    echo "   - Run: $FS_CLI_PATH -x 'log level 7'"
    echo "   - Watch container logs: docker logs <container_name>"
    echo ""
    echo "4. CLI transfer (if DTMF doesn't work):"
    echo "   - Get call UUID: $FS_CLI_PATH -x 'show calls'"
    echo "   - Transfer: $FS_CLI_PATH -x 'uuid_transfer <uuid> 1000'"
    echo ""
    echo "5. Docker-specific commands:"
    echo "   - View logs: docker logs -f <container_name>"
    echo "   - Execute in container: docker exec -it <container_name> /bin/sh"
    echo ""
}

# Main setup function
main() {
    if find_freeswitch; then
        if test_freeswitch_connection; then
            check_freeswitch_status
            check_modules
            test_extensions
            test_transfer_features
            enable_debug
            show_instructions
            
            echo ""
            print_success "Docker transfer setup completed!"
            print_info "Now make a test call and try the DTMF transfers above"
        else
            print_error "FreeSWITCH is not accessible. Check if it's running in the container."
        fi
    else
        print_error "FreeSWITCH CLI not found. Check your Docker container setup."
    fi
}

# Run main function
main "$@"
