# DTMF-based Transfer Manual Keypad - FreeSWITCH 1.18

## Overview

This implementation provides comprehensive DTMF-based transfer functionality for FreeSWITCH 1.18, allowing users to perform various call management operations using keypad sequences during active calls.

## Features Implemented

### Primary Transfer Features

| DTMF Sequence | Function | Description |
|---------------|----------|-------------|
| `##` | Blind Transfer | Transfer call to another extension without consultation |
| `*2` | Attended Transfer | Transfer call with consultation to destination |
| `*3` | Conference Transfer | Transfer both call legs to a conference room |
| `*4` | Hold with Music | Place call on hold with background music |
| `*5` | Operator | Transfer to operator (extension 1000) |
| `*6` | Call Park | Park the call for later pickup |
| `*7` | Call Pickup | Pick up a parked call |
| `*8` | Voicemail | Access voicemail system |
| `*9` | Help | Play help menu with available options |
| `*#` | Cancel | Cancel any pending DTMF action |

## Configuration Files

### 1. `dialplan/features.xml`
Contains the main DTMF transfer extension definitions with audio prompts and user interaction.

### 2. `dialplan/dtmf_transfers.xml`
Additional DTMF transfer configuration with enhanced bindings and quick transfer options.

### 3. `dialplan/default.xml`
Updated with `bind_digit_action` applications to enable DTMF detection during calls.

## How It Works

### DTMF Binding Process
1. When a call is established, the system automatically binds DTMF sequences to transfer actions
2. The `bind_digit_action` application listens for specific DTMF patterns during the call
3. When a pattern is detected, it executes the corresponding transfer action

### Transfer Types

#### Blind Transfer (`##`)
- Immediately transfers the call to the specified extension
- No consultation with the destination
- Caller is connected directly to the new extension

#### Attended Transfer (`*2`)
- Establishes consultation call to destination
- Allows transferor to speak with destination before completing transfer
- Can be cancelled by pressing `#` during consultation

#### Conference Transfer (`*3`)
- Transfers both call legs to a conference room
- Requires entering a 4-digit conference room number
- Creates a 3-way conference (original parties + conference room)

## Usage Examples

### During an Active Call:

1. **Blind Transfer to Extension 1001:**
   - Press `##`
   - Enter `1001` when prompted
   - Press `#` to confirm
   - Call is transferred to extension 1001

2. **Attended Transfer:**
   - Press `*2`
   - Enter destination extension (e.g., `1002`)
   - Press `#` to confirm
   - Consultation call is established
   - Complete transfer or press `#` to cancel

3. **Conference Transfer:**
   - Press `*3`
   - Enter conference room number (e.g., `3001`)
   - Press `#` to confirm
   - Both parties are transferred to conference room 3001

## Audio Prompts

The system uses standard FreeSWITCH IVR prompts:
- `ivr/ivr-enter_destination_number.wav` - Prompts for extension number
- `ivr/ivr-transferring_call.wav` - Confirms transfer in progress
- `ivr/ivr-consulting_transfer.wav` - Indicates consultation mode
- `ivr/ivr-enter_conference_room.wav` - Prompts for conference room
- `ivr/ivr-you_are_on_hold.wav` - Hold confirmation
- `ivr/ivr-help_menu.wav` - Help menu introduction

## Technical Implementation

### Key Applications Used:

1. **`bind_digit_action`** - Binds DTMF sequences to actions
2. **`transfer`** - Performs call transfers
3. **`att_xfer`** - Attended transfer functionality
4. **`read`** - Captures DTMF input from user
5. **`playback`** - Plays audio prompts

### Configuration Syntax:

```xml
<action application="bind_digit_action" data="action_name,dtmf_sequence,exec:transfer,destination XML context"/>
```

Example:
```xml
<action application="bind_digit_action" data="blind_transfer,##,exec:transfer,dtmf_blind_transfer XML features"/>
```

## Requirements

- FreeSWITCH 1.18 or later
- DTMF detection enabled (RFC2833 or SIP INFO)
- Audio prompts available in FreeSWITCH sound directory
- Proper SIP profile configuration for DTMF handling

## Troubleshooting

### Common Issues:

1. **DTMF not detected:**
   - Check DTMF type in SIP profile configuration
   - Ensure RFC2833 or SIP INFO is enabled
   - Verify endpoint DTMF capabilities

2. **Transfer fails:**
   - Check destination extension exists
   - Verify dialplan routing
   - Check SIP registration status

3. **Audio prompts not playing:**
   - Ensure sound files exist in FreeSWITCH sound directory
   - Check audio codec compatibility
   - Verify audio path configuration

## Security Considerations

- DTMF sequences are only active during established calls
- Transfer actions are logged for audit purposes
- Access control based on caller permissions
- Prevention of unauthorized transfers

## Future Enhancements

- Customizable DTMF sequences per user/group
- Transfer confirmation with PIN codes
- Integration with presence system
- Advanced call routing based on time/date
- Multi-level transfer options

## Testing

To test the DTMF transfer functionality:

1. Make a call between two extensions
2. During the active call, press the desired DTMF sequence
3. Follow the audio prompts
4. Verify the transfer completes successfully
5. Test cancellation with `#` during consultation

## Support

For issues or questions regarding this implementation, refer to:
- FreeSWITCH documentation
- Official FreeSWITCH wiki
- Community forums
- This configuration documentation
