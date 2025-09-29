# FreeSWITCH IVR System Documentation

## Overview
This IVR (Interactive Voice Response) system is configured to handle incoming calls with simple menu options.

## Configuration Details

### IVR Menu Settings
- **Menu Name**: `main_ivr`
- **Timeout**: 15 seconds to enter digits
- **Inter-digit Timeout**: 3 seconds between digits
- **Max Failures**: 3 attempts
- **Max Timeouts**: 3 attempts

### Sound Files
- **Welcome Message**: `/usr/share/freeswitch/sounds/ivr/incoming.wav`
- **Invalid Entry**: `/usr/share/freeswitch/sounds/ivr/incoming.wav`
- **Exit Message**: `/usr/share/freeswitch/sounds/ivr/voicemail/incoming.wav`

### Valid Input Options

#### Queue 1 (Extension 251144)
- **1** - Routes to Queue 1 (Extension 1001)

#### Queue 2 (Extension 255431)
- **2** - Routes to Queue 2 (Extension 1003)

## Queue Configuration

### Queue Number System (Like Asterisk)
- **Queue 1**: Extension `251144` → Routes to `queue1` (Agent: 1001)
- **Queue 2**: Extension `255431` → Routes to `queue2` (Agent: 1003)
- **Generic Access**: Extensions `2000` and `2001` also available

### Queue 1
- **Name**: `queue1`
- **Extension**: `251144` (primary), `2000` (generic)
- **Strategy**: Ring all
- **Agent**: Extension 1001
- **Music on Hold**: `local_stream://moh`

### Queue 2
- **Name**: `queue2`
- **Extension**: `255431` (primary), `2001` (generic)
- **Strategy**: Ring all
- **Agent**: Extension 1003
- **Music on Hold**: `local_stream://moh`

## Call Flow

1. **Incoming Call**: External caller dials DID `2200405`
2. **IVR Welcome**: Plays `incoming.wav`
3. **Digit Input**: Caller enters `1` or `2`
4. **Validation**: 
   - If digit is `1` → Routes to Queue 1 (Extension 1001)
   - If digit is `2` → Routes to Queue 2 (Extension 1003)
   - Any other input → Plays invalid entry sound
5. **Queue Processing**: Call rings the appropriate extension
6. **Answer**: First available agent answers the call

## Requirements

### Input Validation
- **Valid Options**: 
  - `1` - Routes to Queue 1
  - `2` - Routes to Queue 2
- **Invalid Input**: Any input that doesn't match the valid options

### Timeout Settings
- **Entry Timeout**: 15 seconds to complete input
- **Inter-digit Timeout**: 3 seconds between digits
- **Max Attempts**: 3 failures or timeouts before disconnect

## File Locations

- **IVR Configuration**: `ivr_menus/main_ivr.xml`
- **Queue Configuration**: `callcenter.conf.xml`
- **Dialplan**: `dialplan/default.xml` and `dialplan/public.xml`
- **Sound Files**: `/usr/share/freeswitch/sounds/ivr/`

## Reload Commands

```bash
# Reload XML configuration
fs_cli -x "reloadxml"

# Reload callcenter module
fs_cli -x "reload mod_callcenter"

# Check IVR status
fs_cli -x "ivr list"

# Check queue status
fs_cli -x "callcenter_config queue list"
```

## Testing

1. Call your DID `2200405`
2. Should hear `incoming.wav`
3. Enter `1` for Queue 1 or `2` for Queue 2
4. Should route to appropriate queue and ring the extension

## Troubleshooting

- **No Sound**: Check if `/usr/share/freeswitch/sounds/ivr/incoming.wav` exists
- **Invalid Entry**: Verify you entered `1` or `2`
- **No Queue Response**: Check if extensions 1001 and 1003 are registered
- **Configuration Issues**: Reload XML and callcenter modules
