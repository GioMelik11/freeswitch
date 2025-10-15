# IVR System Documentation

## Overview
The IVR (Interactive Voice Response) system handles incoming calls with menu-based routing to call center queues.

## Prerequisites
- **Module Required**: `mod_ivr` (must be loaded in `autoload_configs/modules.conf.xml`)
- **Sound Files**: Ensure all referenced audio files exist in the sounds directory
- **Path Format**: 
  - Linux: `/usr/share/freeswitch/sounds/`
  - Windows: `${sounds_dir}` or absolute path like `D:/apps/freeswitch/sounds/`

## Current Configuration

### IVR Menu: `main_ivr`
- **Access**: Extension `5000`
- **Timeout**: 15 seconds to enter digits
- **Inter-digit Timeout**: 3 seconds between digits
- **Max Failures**: 3 attempts
- **Max Timeouts**: 3 attempts
- **Digit Length**: 1 digit

### Sound Files
- **Welcome Message (Long)**: `${sounds_dir}/ivr/incoming.wav`
- **Welcome Message (Short)**: `${sounds_dir}/ivr/incoming_short.wav`
- **Invalid Entry**: `${sounds_dir}/ivr/invalid.wav`
- **Exit Message**: `${sounds_dir}/ivr/goodbye.wav`

> **Note**: Use different sound files for each prompt to provide clear user feedback.

### Menu Options
- **1** → Routes to Queue/Extension 251144
- **2** → Routes to Queue/Extension 255431

> **Note**: Extensions 251144 and 255431 should be defined in your dialplan to route to appropriate queues or destinations.

## Configuration Files

### Primary Configuration
- **File**: `autoload_configs/ivr.conf.xml`
- **Purpose**: Defines IVR menus and settings

### Dialplan Integration
- **File**: `dialplan/default.xml`
- **Extension**: `IVR_Main` (5000)
- **Action**: `ivr(main_ivr)`

## IVR Configuration Example

```xml
<configuration name="ivr.conf" description="IVR menus">
  <menus>
    <menu name="main_ivr" 
          greet-long="${sounds_dir}/ivr/incoming.wav" 
          greet-short="${sounds_dir}/ivr/incoming_short.wav" 
          invalid-sound="${sounds_dir}/ivr/invalid.wav" 
          exit-sound="${sounds_dir}/ivr/goodbye.wav" 
          timeout="15000" 
          inter-digit-timeout="3000" 
          max-failures="3" 
          max-timeouts="3" 
          digit-len="1">
      <entry action="menu-exec-app" digits="1" param="transfer 251144 XML default"/>
      <entry action="menu-exec-app" digits="2" param="transfer 255431 XML default"/>
    </menu>
  </menus>
</configuration>
```

> **Tip**: The `${sounds_dir}` variable automatically resolves to your FreeSWITCH sounds directory path regardless of OS.

## Adding New IVR Menus

### 1. Edit IVR Configuration
Add new menu to `autoload_configs/ivr.conf.xml`:

```xml
<menu name="support_ivr" 
      greet-long="${sounds_dir}/ivr/support_welcome.wav" 
      greet-short="${sounds_dir}/ivr/support_short.wav"
      invalid-sound="${sounds_dir}/ivr/invalid.wav"
      exit-sound="${sounds_dir}/ivr/goodbye.wav"
      timeout="10000" 
      inter-digit-timeout="2000"
      max-failures="3"
      digit-len="1">
  <entry action="menu-exec-app" digits="1" param="transfer 2000 XML default"/>
  <entry action="menu-exec-app" digits="2" param="transfer 2001 XML default"/>
  <entry action="menu-exec-app" digits="0" param="transfer operator XML default"/>
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
- [ ] Verify `mod_ivr` is loaded: `fs_cli -x "module_exists mod_ivr"`
- [ ] Verify all sound files exist at specified paths
- [ ] Test each menu option leads to valid destination
- [ ] Verify timeout and invalid entry handling
- [ ] Test from actual phone (not just CLI)

### Manual Testing from CLI
```bash
# Test IVR directly
fs_cli -x "originate user/1000 &ivr(main_ivr)"

# Test full call flow including dialplan
fs_cli -x "originate loopback/5000/default &echo"
```

### Call Flow Testing
1. **Dial extension 5000** (or configured DID that routes to IVR)
2. **Listen for welcome message** (`incoming.wav`)
3. **Test valid options**: Press `1` or `2`
4. **Verify routing**: Should transfer to configured extensions
5. **Test invalid entry**: Press `9` (undefined option)
6. **Test timeout**: Don't press anything and wait
7. **Test max failures**: Enter invalid options 3+ times

### Sound File Verification
```bash
# Verify sound files exist (Linux)
ls -la /usr/share/freeswitch/sounds/ivr/

# Play sound file for testing
fs_cli -x "originate user/1000 &playback(${sounds_dir}/ivr/incoming.wav)"
```

## Troubleshooting

### Common Issues

#### "Unable to find menu" or IVR not working
- **Check module is loaded**: 
  ```bash
  fs_cli -x "module_exists mod_ivr"
  ```
- **Verify menu is defined** in `autoload_configs/ivr.conf.xml`
- **Check XML syntax**: Look for unclosed tags or typos
- **Reload configuration**: `fs_cli -x "reloadxml"`

#### No sound playing
- **Verify sound file paths** are correct and files exist
- **Check file permissions** (Linux: readable by FreeSWITCH user)
- **Test playback directly**:
  ```bash
  fs_cli -x "originate user/1000 &playback(${sounds_dir}/ivr/incoming.wav)"
  ```
- **Check audio format**: Use 8kHz or 16kHz WAV files for best compatibility

#### IVR not accepting DTMF input
- **Check DTMF method**: Verify SIP profile DTMF settings (RFC2833, inband, INFO)
- **Enable DTMF logging**:
  ```bash
  fs_cli -x "console loglevel debug"
  ```
- **Check digit-len parameter**: Must match expected input length

#### Transfers not working
- **Verify destination exists** in dialplan
- **Check context**: Ensure transfer context is correct (usually "default")
- **Test extension directly**: `fs_cli -x "originate user/1000 &bridge(loopback/251144/default)"`

#### Unexpected exits or disconnects
- **Check max-failures/max-timeouts**: May be exiting due to limit reached
- **Verify exit-sound exists**: Missing exit sound may cause issues
- **Review logs**: `fs_cli -x "console loglevel debug"` and watch for errors

### Debug Commands
```bash
# List all IVR menus (if command exists)
fs_cli -x "ivr list"

# Check module status
fs_cli -x "module_exists mod_ivr"

# Reload IVR module
fs_cli -x "reload mod_ivr"

# Reload XML configuration
fs_cli -x "reloadxml"

# Enable debug logging
fs_cli -x "console loglevel debug"

# Watch live call events
fs_cli -x "sofia global siptrace on"

# Check active calls and their state
fs_cli -x "show channels"
```

### Logging and Debugging
```bash
# Monitor FreeSWITCH logs in real-time (Linux)
tail -f /var/log/freeswitch/freeswitch.log

# Monitor logs (Windows)
# Check logs in: D:\apps\freeswitch\freeswitch\log\

# Enable DTMF debugging
fs_cli -x "console loglevel debug"
# Then look for "DTMF" in logs during IVR testing
```

## Best Practices

### Sound File Management
- Use consistent audio format (recommend: 16kHz, 16-bit, mono WAV)
- Record clear, professional prompts
- Keep greet-short brief (5-10 seconds)
- Test all sound files before deployment
- Maintain a sound file inventory

### Menu Design
- Keep options simple (limit to 7-9 options max)
- Provide an escape option (e.g., "*" to exit, "0" for operator)
- Use consistent DTMF patterns across menus
- Always include timeout and invalid-sound prompts
- Consider menu depth (avoid more than 3 levels)

### Configuration Management
- Document all menu changes
- Test in development environment first
- Backup configuration before changes
- Use version control for config files
- Schedule regular IVR audits


