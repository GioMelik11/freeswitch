# IVR System Documentation

## Overview
The IVR (Interactive Voice Response) system handles incoming calls with menu-based routing to call center queues. IVR functionality is built into FreeSWITCH core (no separate module required).

**FreeSWITCH Version**: 1.10.12-release (IVR built-in)

## Prerequisites
- **IVR Application**: Built into FreeSWITCH core (no mod_ivr needed)
- **Sound Files**: Ensure all referenced audio files exist in `/usr/share/freeswitch/sounds/`
- **Configuration Files**: 
  - `autoload_configs/ivr.conf.xml` - IVR menu definitions
  - `dialplan/default.xml` - IVR access point (extension 5000)
  - `dialplan/public.xml` - Inbound call routing to IVR

## Current Configuration

### IVR Menu: `main_ivr`
- **Access**: Extension `5000` (or via inbound calls from public context)
- **Timeout**: 15 seconds to enter digits
- **Inter-digit Timeout**: 3 seconds between digits
- **Max Failures**: 3 attempts before exit
- **Max Timeouts**: 3 attempts before exit
- **Digit Length**: 1 digit (single key press)

### Sound Files
- **Welcome Message (Long)**: `/usr/share/freeswitch/sounds/ivr/incoming.wav`
- **Welcome Message (Short)**: `/usr/share/freeswitch/sounds/ivr/incoming.wav` (same as long)
- **Invalid Entry**: `/usr/share/freeswitch/sounds/ivr/ivr-that_was_an_invalid_entry.wav`
- **Exit Message**: `/usr/share/freeswitch/sounds/ivr/ivr-thank_you_for_calling.wav`

> **Note**: The invalid and exit sounds use FreeSWITCH built-in IVR prompts.

### Menu Options
- **1** → Transfer to extension 251144 → Routes to **Queue 1** (Agent 1001)
- **2** → Transfer to extension 255431 → Routes to **Queue 2** (Agent 1003)

### Complete Call Flow
```
Inbound Call → Public Context → Transfer to 5000 (IVR)
                                      ↓
                          IVR plays incoming.wav
                                      ↓
                    Caller presses 1 or 2
                    ↙                     ↘
           Press 1: 251144          Press 2: 255431
                ↓                           ↓
           Queue 1                      Queue 2
           (queue1@default)             (queue2@default)
                ↓                           ↓
           Agent 1001                  Agent 1003
```

## Configuration Files

### Primary Configuration
- **File**: `autoload_configs/ivr.conf.xml`
- **Purpose**: Defines IVR menus and settings

### Dialplan Integration
- **File**: `dialplan/default.xml`
- **Extension**: `IVR_Main` (5000)
- **Action**: `ivr(main_ivr)`

## IVR Configuration Example

**File**: `autoload_configs/ivr.conf.xml`

```xml
<configuration name="ivr.conf" description="IVR menus">
  <menus>
    <!-- Main IVR Menu - Accessed via extension 5000 or inbound calls -->
    <menu name="main_ivr" 
          greet-long="/usr/share/freeswitch/sounds/ivr/incoming.wav" 
          greet-short="/usr/share/freeswitch/sounds/ivr/incoming.wav" 
          invalid-sound="/usr/share/freeswitch/sounds/ivr/ivr-that_was_an_invalid_entry.wav" 
          exit-sound="/usr/share/freeswitch/sounds/ivr/ivr-thank_you_for_calling.wav" 
          timeout="15000" 
          inter-digit-timeout="3000" 
          max-failures="3" 
          max-timeouts="3" 
          digit-len="1">
      <!-- Option 1: Transfer to Queue 1 (Agent 1001) -->
      <entry action="menu-exec-app" digits="1" param="transfer 251144 XML default"/>
      <!-- Option 2: Transfer to Queue 2 (Agent 1003) -->
      <entry action="menu-exec-app" digits="2" param="transfer 255431 XML default"/>
    </menu>
  </menus>
</configuration>
```

### Dialplan Configuration

**File**: `dialplan/default.xml` (IVR Access Extension)

```xml
<!-- IVR Access -->
<extension name="IVR_Main">
  <condition field="destination_number" expression="^5000$">
    <action application="answer"/>
    <action application="sleep" data="1000"/>
    <action application="ivr" data="main_ivr"/>
  </condition>
</extension>

<!-- Queue Extensions for IVR Routing -->
<extension name="Queue_251144">
  <condition field="destination_number" expression="^251144$">
    <action application="answer"/>
    <action application="callcenter" data="queue1@default"/>
  </condition>
</extension>

<extension name="Queue_255431">
  <condition field="destination_number" expression="^255431$">
    <action application="answer"/>
    <action application="callcenter" data="queue2@default"/>
  </condition>
</extension>
```

**File**: `dialplan/public.xml` (Inbound Call Routing)

```xml
<!-- Inbound DID routing - Route all inbound calls to IVR -->
<extension name="Inbound_DID">
  <condition field="destination_number" expression="^(.*)$">
    <action application="set" data="effective_caller_id_number=${caller_id_number}"/>
    <action application="set" data="effective_caller_id_name=${caller_id_name}"/>
    <action application="transfer" data="5000 XML default"/>
  </condition>
</extension>
```

## Adding New IVR Menus

### 1. Edit IVR Configuration
Add new menu to `autoload_configs/ivr.conf.xml`:

```xml
<menu name="support_ivr" 
      greet-long="/usr/share/freeswitch/sounds/ivr/support_welcome.wav" 
      greet-short="/usr/share/freeswitch/sounds/ivr/support_short.wav"
      invalid-sound="/usr/share/freeswitch/sounds/ivr/ivr-that_was_an_invalid_entry.wav"
      exit-sound="/usr/share/freeswitch/sounds/ivr/ivr-thank_you_for_calling.wav"
      timeout="10000" 
      inter-digit-timeout="2000"
      max-failures="3"
      digit-len="1">
  <entry action="menu-exec-app" digits="1" param="transfer 2000 XML default"/>
  <entry action="menu-exec-app" digits="2" param="transfer 2001 XML default"/>
  <entry action="menu-exec-app" digits="0" param="transfer 1000 XML default"/>
  <entry action="menu-exit" digits="*"/>
</menu>
```

### 2. Add Dialplan Access
Add to `dialplan/default.xml`:

```xml
<extension name="Support_IVR">
  <condition field="destination_number" expression="^5001$">
    <action application="answer"/>
    <action application="sleep" data="1000"/>
    <action application="ivr" data="support_ivr"/>
  </condition>
</extension>
```

### 3. Reload Configuration
```bash
fs_cli -x "reloadxml"
```

## IVR Parameters

### Menu Attributes
- **`greet-long`**: Initial greeting message (played on first entry)
- **`greet-short`**: Short greeting for repeat/subsequent attempts
- **`invalid-sound`**: Sound played for invalid entries
- **`exit-sound`**: Sound played when exiting IVR
- **`timeout`**: Time to wait for input in milliseconds (default: 10000)
- **`inter-digit-timeout`**: Time between digits in milliseconds (default: 2000)
- **`max-failures`**: Maximum invalid entry attempts before exit (default: 3)
- **`max-timeouts`**: Maximum timeout attempts before exit (default: 3)
- **`digit-len`**: Expected digit length (use "1" for single digit, "4" for 4-digit codes, etc.)
- **`confirm-macro`**: Optional macro to confirm input
- **`confirm-key`**: Key to confirm input (e.g., "#")

### Entry Actions
- **`menu-exec-app`**: Execute FreeSWITCH application (e.g., `transfer`, `bridge`, `playback`)
  - Example: `<entry action="menu-exec-app" digits="1" param="transfer 2000 XML default"/>`
- **`menu-sub`**: Enter a submenu
  - Example: `<entry action="menu-sub" digits="2" param="submenu_name"/>`
- **`menu-exit`**: Exit current menu
  - Example: `<entry action="menu-exit" digits="*"/>`
- **`menu-top`**: Return to top-level menu
  - Example: `<entry action="menu-top" digits="0"/>`
- **`menu-back`**: Return to previous menu
  - Example: `<entry action="menu-back" digits="#"/>`

## Testing IVR

### Pre-Deployment Checklist
- [ ] Verify IVR configuration is loaded: `fs_cli -x "reloadxml"`
- [ ] Verify all sound files exist at specified paths
- [ ] Test each menu option leads to valid destination
- [ ] Verify timeout and invalid entry handling
- [ ] Test from actual phone (not just CLI)
- [ ] Verify trunk registration: `fs_cli -x "sofia status gateway sip_trunk_provider"`

### Manual Testing from CLI
```bash
# Test IVR directly
fs_cli -x "originate user/1000 &ivr(main_ivr)"

# Test full call flow including dialplan
fs_cli -x "originate loopback/5000/default &echo"

# Test IVR with actual extension bridging
fs_cli -x "originate user/1001 5000"
```

### Call Flow Testing
1. **Dial extension 5000** internally or call your trunk DID (2200405)
2. **Listen for welcome message** (`incoming.wav`)
3. **Test valid options**: 
   - Press `1` → Should route to Queue 1 (Agent 1001)
   - Press `2` → Should route to Queue 2 (Agent 1003)
4. **Verify routing**: Agents should receive calls in their respective queues
5. **Test invalid entry**: Press `9` (undefined option) → Should hear invalid entry message
6. **Test timeout**: Don't press anything → Should timeout after 15 seconds
7. **Test max failures**: Enter invalid options 3+ times → Should exit with thank you message

### Sound File Verification
```bash
# Verify sound files exist
ls -la /usr/share/freeswitch/sounds/ivr/

# Check specific files
ls -la /usr/share/freeswitch/sounds/ivr/incoming.wav
ls -la /usr/share/freeswitch/sounds/ivr/ivr-that_was_an_invalid_entry.wav
ls -la /usr/share/freeswitch/sounds/ivr/ivr-thank_you_for_calling.wav

# Play sound file for testing
fs_cli -x "originate user/1001 &playback(/usr/share/freeswitch/sounds/ivr/incoming.wav)"
```

### Real-World Testing
```bash
# Test inbound call flow
# Call your DID from external phone → Should hit IVR → Press 1 or 2

# Monitor call in real-time
fs_cli
> console loglevel debug
# Then make test call and watch the logs
```

## Troubleshooting

### Common Issues

#### "Unable to find menu" or IVR not working
- **Verify menu is defined** in `autoload_configs/ivr.conf.xml`
- **Check XML syntax**: Look for unclosed tags or typos
  ```bash
  # Validate XML syntax
  xmllint --noout /etc/freeswitch/autoload_configs/ivr.conf.xml
  ```
- **Reload configuration**: 
  ```bash
  fs_cli -x "reloadxml"
  ```
- **Check FreeSWITCH logs**:
  ```bash
  tail -f /var/log/freeswitch/freeswitch.log | grep -i ivr
  ```

#### No sound playing
- **Verify sound file paths** are correct and files exist:
  ```bash
  ls -la /usr/share/freeswitch/sounds/ivr/incoming.wav
  ```
- **Check file permissions** (must be readable by FreeSWITCH user):
  ```bash
  sudo chown -R freeswitch:freeswitch /usr/share/freeswitch/sounds/ivr/
  sudo chmod 644 /usr/share/freeswitch/sounds/ivr/*.wav
  ```
- **Test playback directly**:
  ```bash
  fs_cli -x "originate user/1001 &playback(/usr/share/freeswitch/sounds/ivr/incoming.wav)"
  ```
- **Check audio format**: Use 8kHz or 16kHz WAV files (mono, 16-bit PCM)
  ```bash
  file /usr/share/freeswitch/sounds/ivr/incoming.wav
  # Should show: RIFF (little-endian) data, WAVE audio
  ```

#### IVR not accepting DTMF input
- **Check DTMF method**: Verify SIP profile DTMF settings (RFC2833, inband, INFO)
- **Enable DTMF logging**:
  ```bash
  fs_cli -x "console loglevel debug"
  ```
- **Check digit-len parameter**: Must match expected input length

#### Transfers not working
- **Verify destination exists** in dialplan:
  ```bash
  # Check if extensions 251144 and 255431 are defined
  grep -A5 "251144\|255431" /etc/freeswitch/dialplan/default.xml
  ```
- **Check context**: Ensure transfer context is correct (usually "default")
- **Test extension directly**: 
  ```bash
  fs_cli -x "originate user/1001 &bridge(loopback/251144/default)"
  ```
- **Verify queue configuration**:
  ```bash
  fs_cli -x "callcenter_config queue list"
  fs_cli -x "callcenter_config agent list"
  ```

#### Unexpected exits or disconnects
- **Check max-failures/max-timeouts**: May be exiting due to limit reached
- **Verify exit-sound exists**: Missing exit sound may cause issues
- **Review logs**: `fs_cli -x "console loglevel debug"` and watch for errors

### Debug Commands
```bash
# Reload XML configuration (most common fix)
fs_cli -x "reloadxml"

# Check active calls and their state
fs_cli -x "show channels"

# Show detailed channel info
fs_cli -x "show channels verbose"

# Enable debug logging
fs_cli -x "console loglevel debug"

# Watch live call events with SIP trace
fs_cli -x "sofia global siptrace on"

# Check trunk registration status
fs_cli -x "sofia status gateway sip_trunk_provider"
fs_cli -x "sofia status profile external"

# List callcenter queues
fs_cli -x "callcenter_config queue list"

# List agents
fs_cli -x "callcenter_config agent list"

# Check agent status
fs_cli -x "callcenter_config agent get status 1001@default"
fs_cli -x "callcenter_config agent get status 1003@default"

# View call statistics
fs_cli -x "show calls"
```

### Logging and Debugging
```bash
# Monitor FreeSWITCH logs in real-time
tail -f /var/log/freeswitch/freeswitch.log

# Filter for IVR-specific logs
tail -f /var/log/freeswitch/freeswitch.log | grep -i ivr

# Filter for DTMF logs
tail -f /var/log/freeswitch/freeswitch.log | grep -i dtmf

# Filter for callcenter logs
tail -f /var/log/freeswitch/freeswitch.log | grep -i callcenter

# Enable verbose DTMF debugging in fs_cli
fs_cli
> console loglevel debug
> /log 7
# Then look for "DTMF" in logs during IVR testing

# Check XML parsing errors
fs_cli -x "xml_locate dialplan"
```

## Best Practices

### Sound File Management
- **Audio Format**: Use 16kHz, 16-bit, mono WAV files (PCM encoding)
- **File Location**: Store in `/usr/share/freeswitch/sounds/ivr/`
- **Permissions**: Ensure files are readable by FreeSWITCH user (`freeswitch:freeswitch`)
- **Testing**: Test playback of all sound files before deployment
- **Naming**: Use descriptive names (e.g., `welcome_main.wav`, `queue1_greeting.wav`)
- **Backup**: Keep original recordings and maintain a sound file inventory

### Menu Design
- **Simplicity**: Limit to 7-9 options maximum per menu
- **Escape Options**: Always provide exit ("*") and operator ("0") options
- **DTMF Patterns**: Use consistent digit patterns across all menus
- **Prompts**: Include clear invalid-entry and timeout messages
- **Menu Depth**: Avoid more than 3 levels of nested menus
- **User Experience**: Keep greet-short brief (5-10 seconds for repeat callers)

### Configuration Management
- **Version Control**: Keep configuration files in git or version control
- **Documentation**: Document all menu changes with date and purpose
- **Testing**: Test changes in development environment before production
- **Backups**: Backup config files before making changes:
  ```bash
  cp /etc/freeswitch/autoload_configs/ivr.conf.xml \
     /etc/freeswitch/autoload_configs/ivr.conf.xml.backup.$(date +%Y%m%d)
  ```
- **Validation**: Validate XML syntax before reloading:
  ```bash
  xmllint --noout /etc/freeswitch/autoload_configs/ivr.conf.xml
  ```
- **Audits**: Schedule regular IVR audits and user experience reviews

### System Configuration (Current Setup)

#### SIP Trunk
- **Provider**: sip_trunk_provider (89.150.1.126)
- **Username**: 1054965e4
- **Extension**: 2200405
- **DTMF**: RFC2833
- **Codecs**: PCMA, PCMU

#### Inbound Call Flow
```
External Call → SIP Trunk → Public Context → Transfer to 5000
                                                      ↓
                                              IVR (main_ivr)
                                                      ↓
                                          Press 1 or Press 2
                                          ↙                ↘
                                    251144              255431
                                       ↓                   ↓
                                Queue 1              Queue 2
                            (queue1@default)    (queue2@default)
                                       ↓                   ↓
                                Agent 1001          Agent 1003
```

#### Queue Configuration
- **Queue 1** (`queue1@default`): Strategy=ring-all, Agent=1001
- **Queue 2** (`queue2@default`): Strategy=ring-all, Agent=1003
- **MOH**: local_stream://moh
- **Max Wait Time**: Unlimited (0)

#### Extensions
- **5000**: IVR Main Menu
- **2000**: Direct Queue 1 access
- **2001**: Direct Queue 2 access
- **251144**: Queue 1 (via IVR option 1)
- **255431**: Queue 2 (via IVR option 2)
- **1000-1099**: Local extensions
- **9 + number**: Outbound calls

## Summary

This IVR system provides:
- ✅ Automatic inbound call routing to interactive menu
- ✅ Two-option menu for queue selection
- ✅ Integration with callcenter queues
- ✅ Ring-all strategy for immediate agent connection
- ✅ SIP trunk integration for external calls
- ✅ Built-in IVR (no additional modules required)

For additional help, refer to:
- [Queue Documentation](queues.md)
- [Extensions Documentation](extensions.md)
- [SIP Trunk Documentation](sip-trunks.md)
- [Troubleshooting Guide](troubleshooting.md)


