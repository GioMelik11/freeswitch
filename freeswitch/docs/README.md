# FreeSWITCH Configuration Documentation

## Overview
This documentation covers the complete FreeSWITCH 1.10.12 configuration for SIP telephony with IVR and call center queues.

**System Type**: Linux-based deployment  
**FreeSWITCH Version**: 1.10.12-release  
**IVR**: Built-in (no mod_ivr required)

## Documentation Structure

### Core Components
- **[System Overview](system-overview.md)** - Complete system architecture and file structure
- **[Extensions](extensions.md)** - User/extension configuration and management
- **[SIP Trunks](sip-trunks.md)** - SIP trunk configuration and gateway setup
- **[IVR System](ivr.md)** - Interactive Voice Response menus and configuration ⭐ **UPDATED**
- **[Call Flows](call-flows.md)** - Complete call flow diagrams and scenarios ⭐ **NEW**
- **[Call Center Queues](queues.md)** - Call center queues and agent management
- **[Dialplan](dialplan.md)** - Call routing logic and patterns

### Operations
- **[Troubleshooting](troubleshooting.md)** - Common issues and solutions
- **[Commands](commands.md)** - FreeSWITCH CLI commands and reload procedures
- **[Testing](testing.md)** - How to test each component
- **[Changelog](CHANGELOG.md)** - Recent configuration and documentation updates ⭐ **NEW**

### Verification
- **[verify-installation.sh](verify-installation.sh)** - Automated verification script ⭐ **NEW**

## Quick Start

### Verify Your Installation
Run the automated verification script on your Linux FreeSWITCH server:
```bash
cd /etc/freeswitch/docs/
chmod +x verify-installation.sh
sudo ./verify-installation.sh
```

This will check:
- Configuration files exist and have valid syntax
- Sound files are present
- FreeSWITCH service is running
- SIP trunk is registered
- Queues and agents are configured
- File permissions are correct

### Current Configuration
- **Extensions**: 1001, 1003 (active agents)
- **SIP Trunk**: `sip_trunk_provider` (89.150.1.126)
- **IVR**: `main_ivr` with options 1→Queue1, 2→Queue2
- **Queues**: `queue1@default` (Agent 1001), `queue2@default` (Agent 1003)
- **DID**: 2200405 (routes to IVR)
- **Outbound**: 9 + number via SIP trunk

### Call Flow Summary
```
External Call → SIP Trunk → Public Context → IVR (5000)
                                                 ↓
                                    Caller presses 1 or 2
                                    ↙                    ↘
                              Queue 1                Queue 2
                             (251144)               (255431)
                                 ↓                      ↓
                            Agent 1001            Agent 1003
```

See [Call Flows](call-flows.md) for complete diagrams.

### File Structure
```
freeswitch/
├── freeswitch.xml                      # Main configuration
├── vars.xml                            # Global variables
├── autoload_configs/                   # Core configurations
│   ├── ivr.conf.xml                    # IVR menu definitions ⭐ UPDATED
│   ├── callcenter.conf.xml             # Queue configuration
│   └── ...
├── dialplan/                           # Call routing
│   ├── default.xml                     # Internal routing
│   └── public.xml                      # Inbound routing
├── directory/                          # User definitions
│   └── default/
│       ├── 1001.xml                    # Agent 1
│       └── 1003.xml                    # Agent 2
├── sip_profiles/                       # SIP configurations
│   └── external/
│       └── sip_trunk_provider.xml      # SIP trunk gateway
└── docs/                               # This documentation
    ├── README.md                       # This file
    ├── ivr.md                          # IVR documentation ⭐ UPDATED
    ├── call-flows.md                   # Call flow diagrams ⭐ NEW
    ├── CHANGELOG.md                    # Recent changes ⭐ NEW
    └── verify-installation.sh          # Verification script ⭐ NEW
```

## Recent Updates (October 2024)

### Configuration Improvements
✅ Updated IVR sound files to use FreeSWITCH built-ins for error messages  
✅ Added comprehensive inline documentation to ivr.conf.xml

### Documentation Updates
✅ Rewrote IVR documentation (479 lines, comprehensive)  
✅ Created call flow documentation with ASCII diagrams  
✅ Added verification script for automated testing  
✅ Removed mod_ivr references (built into FreeSWITCH 1.10.12)  
✅ Removed Windows references (Linux-only deployment)  
✅ Added pre-deployment checklists  
✅ Enhanced troubleshooting with specific commands

See [CHANGELOG.md](CHANGELOG.md) for complete details.

## Getting Help
- **Start here**: [Call Flows](call-flows.md) for system overview
- **IVR issues**: [IVR Documentation](ivr.md) and [Troubleshooting](troubleshooting.md)
- **Testing**: [Testing Guide](testing.md) and verify-installation.sh script
- **Commands**: [Commands Reference](commands.md) for CLI operations

## Testing After Configuration Changes
```bash
# 1. Reload configuration
fs_cli -x "reloadxml"

# 2. Verify trunk registration
fs_cli -x "sofia status gateway sip_trunk_provider"

# 3. Test IVR
fs_cli -x "originate user/1001 5000"

# 4. Check queues
fs_cli -x "callcenter_config queue list"
fs_cli -x "callcenter_config agent list"
```

## System Status
All components verified working:
- ✅ IVR (built-in, no module required)
- ✅ Call Center Queues (queue1, queue2)
- ✅ Extensions (1001, 1003 active)
- ✅ Outbound calls (via 9 + number)
- ✅ Inbound calls (DID → IVR → Queue → Agent)
- ✅ SIP trunk registration
- ✅ Sound files
