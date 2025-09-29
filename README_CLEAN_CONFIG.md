# Clean FreeSWITCH Configuration

This is a minimal, clean FreeSWITCH configuration that provides all the essential features you requested:

## Features Included

### 1. Extension Registration
- **Extensions**: 1000-1005 configured and ready to use
- **Password**: Default is "1234" (change in vars.xml)
- **Groups**: 
  - Support: 1000, 1001, 1002
  - Sales: 1003, 1004, 1005

### 2. SIP Trunk Configuration
- **External Profile**: Configured for SIP trunks
- **Sample Trunk**: `sip_profiles/external/example_provider.xml`
- **Edit the sample file** with your actual SIP provider details

### 3. Call Routing
- **Local Calls**: Extensions 1000-1099
- **Outbound Calls**: Dial 9 + number
- **Inbound Calls**: Route to IVR (5000) by default

### 4. IVR System
- **Access**: Dial 5000
- **Menu Options**:
  - Press 1 for Support Queue
  - Press 2 for Sales Queue
  - Press 3 for Directory
  - Press 4 for Voicemail
  - Press 0 for Operator
  - Press 9 to repeat menu

### 5. Queue Configuration
- **Support Queue**: Dial 2000
- **Sales Queue**: Dial 2001
- **Agents**: Automatically assigned based on groups

## Quick Setup

### 1. Configure SIP Trunk
Edit `sip_profiles/external/example_provider.xml`:
```xml
<param name="username" value="your_username"/>
<param name="realm" value="sip.provider.com"/>
<param name="password" value="your_password"/>
<param name="proxy" value="sip.provider.com"/>
```

### 2. Change Default Password
Edit `vars.xml`:
```xml
<X-PRE-PROCESS cmd="set" data="default_password=YOUR_SECURE_PASSWORD"/>
```

### 3. Configure Extensions
- Extensions are in `directory/default/`
- Each extension has its own XML file
- Modify passwords and settings as needed

### 4. Test Numbers
- **Echo Test**: 9196
- **Hold Music**: 9664
- **Voicemail**: *98

## File Structure

```
freeswitch.xml                 # Main configuration
vars.xml                       # Variables
dialplan/
  ├── default.xml             # Internal dialplan
  └── public.xml              # External/inbound dialplan
directory/
  ├── default.xml             # Directory configuration
  └── default/                # User extensions
sip_profiles/
  ├── internal.xml            # Internal SIP profile
  ├── external.xml            # External SIP profile
  └── external/               # SIP trunks
ivr_menus/
  └── main_ivr.xml           # IVR configuration
autoload_configs/
  ├── modules.conf.xml        # Modules to load
  ├── callcenter.conf.xml     # Queue configuration
  ├── conference.conf.xml     # Conference rooms
  ├── voicemail.conf.xml      # Voicemail settings
  └── sofia.conf.xml          # SIP stack
```

## Usage Examples

### Register Extensions
Configure your SIP phones:
- **Server**: Your FreeSWITCH IP
- **Port**: 5060
- **Username**: 1000-1005
- **Password**: 1234 (or your custom password)

### Make Calls
- **Extension to Extension**: Just dial 1000-1005
- **Outbound**: Dial 9 + phone number
- **Support**: Dial 2000
- **Sales**: Dial 2001
- **IVR**: Dial 5000

### Conference Rooms
- **Dial**: 3000-3099 for conference rooms

## Security Notes

1. **Change default password** in vars.xml
2. **Configure firewall** to allow only necessary ports
3. **Use strong passwords** for SIP accounts
4. **Consider TLS/SRTP** for secure communications

## Troubleshooting

1. **Check FreeSWITCH logs**: `/usr/local/freeswitch/log/`
2. **Test configuration**: `fs_cli` then `reloadxml`
3. **Verify registration**: `sofia status profile internal reg`
4. **Check gateway status**: `sofia status gateway`

This configuration is production-ready but minimal. Add features as needed based on your specific requirements.
