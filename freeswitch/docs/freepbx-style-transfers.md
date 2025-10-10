# FreePBX/Asterisk Style DTMF Transfers

## Overview
This implementation replicates the exact DTMF transfer behavior found in FreePBX/Asterisk systems.

## FreePBX Style Features

### Primary Transfer Features

| DTMF Sequence | Function | FreePBX Equivalent |
|---------------|----------|-------------------|
| `##` | Blind Transfer | Blind Transfer |
| `*2` | Attended Transfer | Attended Transfer |
| `*4` | Hold with Music | Hold |
| `*5` | Operator | Operator |

### Quick Transfer Shortcuts (FreePBX Style)

| DTMF Sequence | Transfer To |
|---------------|-------------|
| `*01` | Extension 1000 |
| `*02` | Extension 1001 |
| `*03` | Extension 1002 |
| `*04` | Extension 1003 |
| `*05` | Extension 1004 |
| `*06` | Extension 1005 |

## How It Works (FreePBX Style)

### Blind Transfer (`##`)
1. **Press `##`** → Hold music starts immediately
2. **Enter extension** (e.g., `1003`) while music plays
3. **Press `#`** → Transfer completes immediately (no confirmation prompt)

### Attended Transfer (`*2`)
1. **Press `*2`** → Hold music starts immediately
2. **Enter extension** (e.g., `1001`) while music plays
3. **Press `#`** → Consultation call established
4. **Complete transfer** or press `#` to cancel

### Quick Transfers
- **Press `*04`** → Immediate transfer to extension 1003
- **Press `*01`** → Immediate transfer to extension 1000
- No prompts, no hold music - instant transfer

## FreePBX Behavior Replication

### ✅ **Implemented FreePBX Features:**

1. **Immediate Hold Music**
   - No audio prompts asking for extension
   - Hold music starts immediately after DTMF sequence
   - Music plays while user enters extension number

2. **Silent Operation**
   - No "enter destination number" prompts
   - No "transferring call" confirmations
   - Immediate execution like FreePBX

3. **Quick Transfer Shortcuts**
   - `*01` through `*06` for immediate transfers
   - No prompts or delays
   - Instant execution

4. **Extended Timeout**
   - 30-second timeout for extension entry
   - Plenty of time to enter extension while music plays

## Usage Examples

### Blind Transfer (FreePBX Style)
```
During active call:
1. Press ##
2. Hold music starts immediately
3. Enter 1003 (while music plays)
4. Press #
5. Transfer completes instantly
```

### Quick Transfer
```
During active call:
1. Press *04
2. Call transfers to 1003 immediately
```

### Attended Transfer
```
During active call:
1. Press *2
2. Hold music starts immediately
3. Enter 1001 (while music plays)
4. Press #
5. Consultation call established
6. Complete or cancel transfer
```

## Technical Implementation

### Key Differences from Standard FreeSWITCH:
- **No audio prompts** - Hold music starts immediately
- **Silent operation** - No confirmation messages
- **Quick execution** - Minimal delays
- **Extended timeouts** - More time for input

### Configuration Details:
```xml
<!-- FreePBX style - immediate hold music -->
<action application="set" data="transfer_ringback=$${hold_music}"/>
<action application="read" data="transfer_digits 4 11 '$${hold_music}' digits 30000 #"/>
<action application="transfer" data="${transfer_digits} XML default"/>
```

## Testing FreePBX Style

### Test Blind Transfer:
1. Make a call between extensions
2. Press `##`
3. **Verify:** Hold music starts immediately (no prompts)
4. Enter `1003`
5. Press `#`
6. **Verify:** Transfer completes instantly

### Test Quick Transfer:
1. Make a call between extensions
2. Press `*04`
3. **Verify:** Immediate transfer to 1003 (no prompts, no music)

### Test Attended Transfer:
1. Make a call between extensions
2. Press `*2`
3. **Verify:** Hold music starts immediately
4. Enter `1001`
5. Press `#`
6. **Verify:** Consultation call established

## FreePBX Compatibility

This implementation provides:
- ✅ **Same DTMF sequences** as FreePBX
- ✅ **Same behavior** - immediate hold music
- ✅ **Same timing** - quick execution
- ✅ **Same shortcuts** - quick transfer patterns
- ✅ **Same user experience** - familiar to FreePBX users

## Troubleshooting

### If hold music doesn't start:
- Check `$${hold_music}` variable is set
- Verify music file exists
- Check audio path configuration

### If transfers are slow:
- Verify DTMF detection is working
- Check for audio prompts interfering
- Ensure minimal sleep delays

### If quick transfers don't work:
- Check extension numbers exist
- Verify dialplan routing
- Test with `fs_cli` commands

## FreePBX Migration

Users familiar with FreePBX will find:
- **Identical DTMF sequences**
- **Same behavior patterns**
- **Familiar user experience**
- **No learning curve**

This implementation provides a seamless transition from FreePBX to FreeSWITCH while maintaining the exact same DTMF transfer functionality.
