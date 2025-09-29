# System Overview

## Architecture
This FreeSWITCH configuration provides a complete SIP telephony system with IVR and call center functionality.

## Current Configuration

### Active Components
- **Extensions**: 1001, 1003 (registered and active)
- **SIP Trunk**: `sip_trunk_provider` (89.150.1.126)
- **IVR**: `main_ivr` with 2-digit menu options
- **Queues**: `queue1@default`, `queue2@default`
- **DID**: 2200405 (routes incoming calls to IVR)

### Inactive Components
- **Extensions**: 1000, 1002, 1004, 1005 (configured but not registered)
- **Voicemail**: Disabled
- **Conference**: Available but not configured

## File Structure

```
freeswitch/
├── freeswitch.xml                 # Main configuration file
├── vars.xml                       # Global variables
├── mime.types                     # MIME type definitions
├── extensions.conf                # Asterisk demo (commented out)
├── autoload_configs/              # Auto-loaded configurations
│   ├── ivr.conf.xml              # IVR menu definitions
│   ├── callcenter.conf.xml       # Queue and agent definitions
│   ├── modules.conf.xml          # Module loading
│   └── sofia.conf.xml            # SIP profile settings
├── dialplan/                      # Call routing logic
│   ├── default.xml               # Internal call routing
│   ├── public.xml                # Inbound call routing
│   └── features.xml              # Feature codes
├── directory/                     # User/extension definitions
│   └── default/                  # Default domain users
│       ├── 1001.xml              # Extension 1001
│       ├── 1003.xml              # Extension 1003
│       └── default.xml           # Default user settings
├── sip_profiles/                 # SIP profile configurations
│   ├── internal.xml              # Internal SIP profile
│   ├── external.xml              # External SIP profile
│   └── external/                 # SIP trunk gateways
│       └── sip_trunk_provider.xml # Provider gateway
├── tls/                          # TLS certificates
└── docs/                         # Documentation
```

## Removed Components
- **`skinny_profiles/`** - Cisco IP phone support (not needed for SIP)
- **`dialplan/skinny-patterns/`** - Skinny dialplan patterns
- **`lang/`** - Language files (using system defaults)
- **`config.FS0`** - FAX modem configuration (not using fax)
- **`yaml/`** - YAML configurations (using XML)
- **Music files** - TTML music files (using system hold music)
- **Voicemail templates** - Email templates (voicemail disabled)

## System Flow

### Incoming Calls
1. **External caller** dials DID `2200405`
2. **SIP trunk** receives call on `sip_trunk_provider`
3. **Public dialplan** routes to IVR (extension 5000)
4. **IVR plays** welcome message (`incoming.wav`)
5. **Caller enters** digit (1 or 2)
6. **IVR routes** to appropriate queue
7. **Queue rings** assigned extension (1001 or 1003)

### Outgoing Calls
1. **Extension** dials 9 + number
2. **Default dialplan** matches pattern
3. **Call routes** through `sip_trunk_provider`
4. **External party answers** call
5. **IVR message** plays (`/usr/share/freeswitch/sounds/out/out.wav`)
6. **Call transfers** to operator (extension 1001)
7. **Operator** handles the call

### Internal Calls
1. **Extension** dials another extension (1000-1099)
2. **Default dialplan** matches pattern
3. **Direct bridge** to target extension
4. **Internal call** established

## Configuration Philosophy
- **Minimal**: Only essential components enabled
- **SIP-focused**: Pure SIP telephony (no FAX, Skinny, etc.)
- **Modular**: Each component documented separately
- **Clean**: No unused files or configurations
