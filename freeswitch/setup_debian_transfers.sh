#!/bin/bash

# FreeSWITCH Transfer Setup for Debian
# This script sets up the environment for transfer testing on Debian

echo "=========================================="
echo "FreeSWITCH Transfer Setup for Debian"
echo "=========================================="
echo ""

# Colors
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

# Check if running as root
check_root() {
    if [ "$EUID" -eq 0 ]; then
        print_warning "Running as root. Some commands may need sudo."
    fi
}

# Find FreeSWITCH installation
find_freeswitch() {
    print_status "Looking for FreeSWITCH installation..."
    
    # Common Debian locations
    locations=(
        "/usr/bin/fs_cli"
        "/usr/local/freeswitch/bin/fs_cli"
        "/opt/freeswitch/bin/fs_cli"
        "/usr/local/bin/fs_cli"
    )
    
    for location in "${locations[@]}"; do
        if [ -f "$location" ]; then
            print_success "Found FreeSWITCH CLI at: $location"
            FS_CLI_PATH="$location"
            return 0
        fi
    done
    
    print_error "FreeSWITCH CLI not found in common locations"
    print_status "Please install FreeSWITCH or provide the correct path"
    return 1
}

# Check FreeSWITCH service
check_freeswitch_service() {
    print_status "Checking FreeSWITCH service status..."
    
    if systemctl is-active --quiet freeswitch; then
        print_success "FreeSWITCH service is running"
    elif systemctl is-active --quiet freeswitch@default; then
        print_success "FreeSWITCH service is running (default instance)"
    else
        print_warning "FreeSWITCH service is not running"
        print_status "Attempting to start FreeSWITCH..."
        
        if systemctl start freeswitch; then
            print_success "FreeSWITCH service started"
        elif systemctl start freeswitch@default; then
            print_success "FreeSWITCH service started (default instance)"
        else
            print_error "Failed to start FreeSWITCH service"
            print_status "Try: sudo systemctl start freeswitch"
            return 1
        fi
    fi
}

# Check FreeSWITCH configuration
check_freeswitch_config() {
    print_status "Checking FreeSWITCH configuration..."
    
    # Common config locations
    config_locations=(
        "/etc/freeswitch"
        "/usr/local/freeswitch/conf"
        "/opt/freeswitch/conf"
    )
    
    for config_dir in "${config_locations[@]}"; do
        if [ -d "$config_dir" ]; then
            print_success "Found FreeSWITCH config at: $config_dir"
            CONFIG_DIR="$config_dir"
            return 0
        fi
    done
    
    print_warning "FreeSWITCH config directory not found"
    return 1
}

# Test FreeSWITCH connection
test_freeswitch_connection() {
    print_status "Testing FreeSWITCH connection..."
    
    if [ -n "$FS_CLI_PATH" ]; then
        if "$FS_CLI_PATH" -x "status" &> /dev/null; then
            print_success "FreeSWITCH is accessible"
            return 0
        else
            print_error "Cannot connect to FreeSWITCH"
            return 1
        fi
    else
        print_error "FreeSWITCH CLI path not set"
        return 1
    fi
}

# Create alias for easier access
create_alias() {
    print_status "Creating alias for FreeSWITCH CLI..."
    
    if [ -n "$FS_CLI_PATH" ]; then
        echo "alias fs_cli='$FS_CLI_PATH'" >> ~/.bashrc
        print_success "Alias created. Run 'source ~/.bashrc' to use it"
    fi
}

# Main setup function
main() {
    check_root
    find_freeswitch
    check_freeswitch_service
    check_freeswitch_config
    test_freeswitch_connection
    create_alias
    
    echo ""
    print_status "Setup completed!"
    echo ""
    print_status "Next steps:"
    echo "1. Run: source ~/.bashrc"
    echo "2. Run: ./debug_transfers.sh"
    echo "3. Make test calls and try transfers"
    echo ""
}

# Run main function
main "$@"
