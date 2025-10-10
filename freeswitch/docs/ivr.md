# IVR System Documentation

## Overview
The IVR (Interactive Voice Response) system handles incoming calls with menu-based routing to call center queues.

## Current Configuration

### IVR Menu: `main_ivr`
- **Access**: Extension `5000`
- **Timeout**: 15 seconds to enter digits
- **Inter-digit Timeout**: 3 seconds between digits
- **Max Failures**: 3 attempts
- **Max Timeouts**: 3 attempts
- **Digit Length**: 1 digit

### Sound Files
- **Welcome Message**: `/usr/share/freeswitch/sounds/ivr/incoming.wav`
- **Invalid Entry**: `/usr/share/freeswitch/sounds/ivr/incoming.wav`
- **Exit Message**: `/usr/share/freeswitch/sounds/ivr/voicemail/incoming.wav`

### Menu Options
- **1** → Routes to Queue 1 (Extension 1001)
- **2** → Routes to Queue 2 (Extension 1003)

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
          greet-long="/usr/share/freeswitch/sounds/ivr/incoming.wav" 
          greet-short="/usr/share/freeswitch/sounds/ivr/incoming.wav" 
          invalid-sound="/usr/share/freeswitch/sounds/ivr/incoming.wav" 
          exit-sound="/usr/share/freeswitch/sounds/ivr/voicemail/incoming.wav" 
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

## Adding New IVR Menus

### 1. Edit IVR Configuration
Add new menu to `autoload_configs/ivr.conf.xml`:

```xml
<menu name="support_ivr" 
      greet-long="/usr/share/freeswitch/sounds/ivr/support.wav" 
      timeout="10000" 
      digit-len="1">
  <entry action="menu-exec-app" digits="1" param="transfer 2000 XML default"/>
  <entry action="menu-exec-app" digits="2" param="transfer 2001 XML default"/>
  <entry action="menu-exec-app" digits="0" param="transfer operator XML default"/>
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
- **`greet-long`**: Initial greeting message
- **`greet-short`**: Short greeting for repeat calls
- **`invalid-sound`**: Sound for invalid entries
- **`exit-sound`**: Sound when exiting IVR
- **`timeout`**: Time to wait for input (milliseconds)
- **`inter-digit-timeout`**: Time between digits (milliseconds)
- **`max-failures`**: Maximum invalid attempts
- **`max-timeouts`**: Maximum timeout attempts
- **`digit-len`**: Expected digit length

### Entry Actions
- **`menu-exec-app`**: Execute application
- **`transfer`**: Transfer to extension/context
- **`hangup`**: Hang up call
- **`playback`**: Play sound file

## Testing IVR

### Manual Testing
```bash
# Test IVR from CLI
fs_cli -x "originate loopback/5000 &echo"
```

### Call Flow Testing
1. Call DID `2200405`
2. Should hear `incoming.wav`
3. Press `1` for Queue 1 or `2` for Queue 2
4. Should route to appropriate queue

## Troubleshooting

### Common Issues
- **"Unable to find menu"**: Check `mod_ivr` is loaded and menu is defined
- **No sound**: Verify sound file path exists
- **Invalid entry**: Check digit patterns and timeout settings
- **No routing**: Verify transfer destinations exist

### Debug Commands
```bash
# Check IVR menus
fs_cli -x "ivr list"

# Check module status
fs_cli -x "module_exists mod_ivr"

# Reload IVR
fs_cli -x "reload mod_ivr"
```


