# FreeSWITCH Configuration Documentation

## Overview
This documentation covers the complete FreeSWITCH configuration for SIP telephony with IVR and call center queues.

## Documentation Structure

### Core Components
- **[System Overview](system-overview.md)** - Complete system architecture and file structure
- **[Extensions](extensions.md)** - User/extension configuration and management
- **[SIP Trunks](sip-trunks.md)** - SIP trunk configuration and gateway setup
- **[IVR System](ivr.md)** - Interactive Voice Response menus and configuration
- **[Call Center Queues](queues.md)** - Call center queues and agent management
- **[Dialplan](dialplan.md)** - Call routing logic and patterns

### Operations
- **[Troubleshooting](troubleshooting.md)** - Common issues and solutions
- **[Commands](commands.md)** - FreeSWITCH CLI commands and reload procedures
- **[Testing](testing.md)** - How to test each component

## Quick Start

### Current Configuration
- **Extensions**: 1001, 1003 (active)
- **SIP Trunk**: `sip_trunk_provider` (89.150.1.126)
- **IVR**: `main_ivr` with options 1→Queue1, 2→Queue2
- **Queues**: `queue1@default`, `queue2@default`
- **DID**: 2200405 (routes to IVR)

### File Structure
```
freeswitch/
├── freeswitch.xml                 # Main configuration
├── vars.xml                       # Global variables
├── autoload_configs/              # Core configurations
├── dialplan/                      # Call routing
├── directory/                     # User definitions
├── sip_profiles/                 # SIP configurations
└── docs/                         # This documentation
```

## Getting Help
- Check the specific component documentation for detailed information
- Use the troubleshooting guide for common issues
- Refer to commands documentation for FreeSWITCH CLI usage
