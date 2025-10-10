# Call Transfer Guide

## Overview
FreeSWITCH supports multiple methods for transferring active calls to extensions or external numbers. This guide covers both blind transfers and attended transfers.

## Types of Transfers

### 1. Blind Transfer
A blind transfer immediately transfers the call without consulting the transfer target first. The original caller is connected directly to the destination.

### 2. Attended Transfer
An attended transfer allows the transferring party to speak with the destination before completing the transfer, ensuring the call is accepted.

## Transfer Methods

### CLI Commands

#### Transfer Active Call by UUID
```bash
# Transfer to internal extension
fs_cli -x "uuid_transfer <uuid> 1001"

# Transfer to external number
fs_cli -x "uuid_transfer <uuid> 9+1234567890"

# Transfer with specific context
fs_cli -x "uuid_transfer <uuid> 1001 XML default"
```

#### Get Call UUID
```bash
# List active calls with UUIDs
fs_cli -x "show calls"

# Show channels with UUIDs
fs_cli -x "show channels"
```

### Dialplan Applications

#### 1. Basic Transfer Application
```xml
<action application="transfer" data="destination XML context"/>
```

**Examples:**
```xml
<!-- Transfer to extension 1001 -->
<action application="transfer" data="1001 XML default"/>

<!-- Transfer to external number -->
<action application="transfer" data="9+1234567890 XML default"/>

<!-- Transfer to queue -->
<action application="transfer" data="2000 XML default"/>
```

#### 2. Blind Transfer (B-Leg Transfer)
```xml
<action application="transfer" data="-bleg destination XML context"/>
```

**Examples:**
```xml
<!-- Blind transfer to extension -->
<action application="transfer" data="-bleg 1001 XML default"/>

<!-- Blind transfer to external number -->
<action application="transfer" data="-bleg 9+1234567890 XML default"/>
```

#### 3. Attended Transfer
```xml
<action application="att_xfer" data="destination"/>
```

**Examples:**
```xml
<!-- Attended transfer to user -->
<action application="att_xfer" data="user/1001@${domain}"/>

<!-- Attended transfer to external number -->
<action application="att_xfer" data="sofia/gateway/sip_trunk_provider/+1234567890"/>
```

#### 4. Both Legs Transfer
```xml
<action application="transfer" data="-both destination XML context"/>
```

**Examples:**
```xml
<!-- Transfer both legs to conference -->
<action application="transfer" data="-both 3001 XML default"/>
```

## Feature Codes

### Enhanced Transfer Features

#### 1. Quick Transfer Codes (During Active Calls)
- **`*1 + extension`**: Quick transfer to internal extension
- **`*2 + number`**: Quick transfer to external number
- **`*3 + queue`**: Quick transfer to queue
- **`*4 + conference`**: Quick transfer to conference (both legs)
- **`*5 + extension`**: Attended transfer to extension
- **`*6 + number`**: Attended transfer to external number
- **`*7 + destination`**: Blind transfer with confirmation
- **`*0`**: Transfer to operator
- **`*8`**: Transfer status check / Help
- **`*9`**: Cancel transfer

#### 2. Manual Transfer (dx)
- **Code**: `dx`
- **Function**: Enhanced manual transfer with smart routing
- **Usage**: Dial `dx` during a call, then enter:
  - 4-digit extension (e.g., `1001`)
  - External number starting with 9 (e.g., `91234567890`)
  - Queue number starting with 2 (e.g., `2000`)
  - Conference number starting with 3 (e.g., `3001`)

#### 3. Attended Transfer (att_xfer_enhanced)
- **Code**: `att_xfer_enhanced`
- **Function**: Enhanced attended transfer with proper channel variables
- **Usage**: Dial `att_xfer_enhanced` during a call, then enter destination

#### 4. Standard Attended Transfer (86)
- **Code**: `86`
- **Function**: Standard attended transfer following official FreeSWITCH pattern
- **Usage**: Dial `86` during a call, then enter extension number
- **Features**: 
  - `#` - Cancel transfer and return to caller
  - `*` - Hangup B leg and bridge A to C
  - `0` - Convert to three-way conference

#### 5. Legacy Transfer Features
- **`att_xfer`**: Original attended transfer (internal users only)
- **`cf`**: Conference transfer (both legs)

## Dialplan Examples

### 1. Transfer to Extension
```xml
<extension name="Transfer_to_Extension">
  <condition field="destination_number" expression="^(\*1)(\d+)$">
    <action application="transfer" data="$2 XML default"/>
  </condition>
</extension>
```

### 2. Transfer to External Number
```xml
<extension name="Transfer_to_External">
  <condition field="destination_number" expression="^(\*2)(\d+)$">
    <action application="transfer" data="9$2 XML default"/>
  </condition>
</extension>
```

### 3. Transfer to Queue
```xml
<extension name="Transfer_to_Queue">
  <condition field="destination_number" expression="^(\*3)(\d+)$">
    <action application="transfer" data="20$2 XML default"/>
  </condition>
</extension>
```

### 4. Attended Transfer with Hold Music
```xml
<extension name="Attended_Transfer_with_Hold">
  <condition field="destination_number" expression="^(\*4)(\d+)$">
    <action application="set" data="transfer_ringback=${hold_music}"/>
    <action application="att_xfer" data="user/$2@${domain}"/>
  </condition>
</extension>
```

## Advanced Transfer Options

### Transfer Variables

#### 1. Transfer Ringback
```xml
<action application="set" data="transfer_ringback=${hold_music}"/>
```

#### 2. Transfer Timeout
```xml
<action application="set" data="transfer_timeout=30"/>
```

#### 3. Transfer Cancel Key
```xml
<action application="set" data="origination_cancel_key=#"/>
```

#### 4. Attended Transfer Variables (att_xfer)
Based on [FreeSWITCH official documentation](https://developer.signalwire.com/freeswitch/FreeSWITCH-Explained/Modules/mod-dptools/6586411/):

```xml
<!-- Cancel transfer and return to caller -->
<action application="set" data="attxfer_cancel_key=#"/>

<!-- Hangup B leg and bridge A to C -->
<action application="set" data="attxfer_hangup_key=*"/>

<!-- Convert to three-way conference -->
<action application="set" data="attxfer_conf_key=0"/>
```

**Attended Transfer DTMF Controls:**
- **`#` (attxfer_cancel_key)**: Cancel transfer and return to original caller
- **`*` (attxfer_hangup_key)**: Hangup B leg and bridge A to C
- **`0` (attxfer_conf_key)**: Convert to three-way conference

### Transfer Contexts

#### 1. Default Context
```xml
<action application="transfer" data="1001 XML default"/>
```

#### 2. Features Context
```xml
<action application="transfer" data="1001 XML features"/>
```

#### 3. Public Context
```xml
<action application="transfer" data="1001 XML public"/>
```

## Transfer Patterns

### 1. Internal Extensions
- **Pattern**: `1000-1099`
- **Transfer**: `transfer 1001 XML default`

### 2. External Numbers
- **Pattern**: `9+number` or `+number`
- **Transfer**: `transfer 9+1234567890 XML default`

### 3. Queues
- **Pattern**: `2000-2099`
- **Transfer**: `transfer 2000 XML default`

### 4. Conferences
- **Pattern**: `3000-3099`
- **Transfer**: `transfer 3001 XML default`

## CLI Transfer Commands

### Basic Transfer Commands
```bash
# Transfer call to extension
fs_cli -x "uuid_transfer <uuid> 1001"

# Transfer call to external number
fs_cli -x "uuid_transfer <uuid> 9+1234567890"

# Transfer call to queue
fs_cli -x "uuid_transfer <uuid> 2000"

# Transfer call to conference
fs_cli -x "uuid_transfer <uuid> 3001"
```

### Advanced Transfer Commands
```bash
# Transfer with specific context
fs_cli -x "uuid_transfer <uuid> 1001 XML default"

# Transfer with variables
fs_cli -x "uuid_transfer <uuid> 1001 XML default <variables>"

# Transfer both legs
fs_cli -x "uuid_transfer <uuid> -both 3001 XML default"
```

### Call Management Commands
```bash
# List active calls
fs_cli -x "show calls"

# Show call details
fs_cli -x "uuid_dump <uuid>"

# Hangup call
fs_cli -x "uuid_kill <uuid>"

# Bridge calls
fs_cli -x "uuid_bridge <uuid1> <uuid2>"
```

## Transfer Scenarios

### Scenario 1: Quick Transfer to Extension
1. **During active call**: Press `*1`
2. **Enter extension**: Dial `1001` then press `#`
3. **Transfer completes automatically**

### Scenario 2: Quick Transfer to External Number
1. **During active call**: Press `*2`
2. **Enter number**: Dial `1234567890` then press `#`
3. **Transfer completes automatically**

### Scenario 3: Quick Transfer to Queue
1. **During active call**: Press `*3`
2. **Enter queue**: Dial `00` then press `#` (for queue 2000)
3. **Transfer completes automatically**

### Scenario 4: Quick Transfer to Conference
1. **During active call**: Press `*4`
2. **Enter conference**: Dial `01` then press `#` (for conference 3001)
3. **Both parties join conference**

### Scenario 5: Attended Transfer to Extension
1. **During active call**: Press `*5`
2. **Enter extension**: Dial `1001` then press `#`
3. **Speak with destination**: Confirm transfer
4. **Complete transfer**: Press `#` or hangup

### Scenario 6: Attended Transfer to External
1. **During active call**: Press `*6`
2. **Enter number**: Dial `1234567890` then press `#`
3. **Speak with destination**: Confirm transfer
4. **Complete transfer**: Press `#` or hangup

### Scenario 10: Standard Attended Transfer (86)
1. **During active call**: Dial `86`
2. **Enter extension**: Dial `1001`
3. **Speak with destination**: Confirm transfer
4. **Transfer options**:
   - Press `#` to cancel and return to caller
   - Press `*` to hangup B leg and bridge A to C
   - Press `0` to convert to three-way conference
   - Hangup to complete transfer

### Scenario 7: Enhanced Manual Transfer (dx)
1. **During active call**: Dial `dx`
2. **Enter destination**: 
   - Extension: `1001`
   - External: `91234567890`
   - Queue: `2000`
   - Conference: `3001`
3. **Complete transfer**: Press `#` or wait for timeout

### Scenario 8: Transfer to Operator
1. **During active call**: Dial `*0`
2. **Transfer to operator completes automatically**

### Scenario 9: Transfer Help
1. **During active call**: Dial `*8`
2. **Listen to transfer help instructions**
3. **Call ends after help message**

## Troubleshooting

### Common Issues

#### 1. Transfer Fails
- **Check**: Destination exists and is reachable
- **Verify**: Dialplan has proper routing
- **Test**: Manual dial to destination

#### 2. No Transfer Ringback
- **Set**: `transfer_ringback=${hold_music}`
- **Check**: Hold music file exists
- **Verify**: Audio path is correct

#### 3. Transfer Timeout
- **Increase**: `transfer_timeout=60`
- **Check**: Network connectivity
- **Verify**: Destination is available

#### 4. Attended Transfer Issues
- **Check**: `att_xfer` application is loaded
- **Verify**: Destination accepts calls
- **Test**: Manual call to destination

### Debug Commands
```bash
# Enable debug for transfers
fs_cli -x "debug all"

# Check transfer logs
fs_cli -x "log level 7"

# Monitor calls
fs_cli -x "show calls"

# Check dialplan
fs_cli -x "dialplan default 1001"
```

## Best Practices

### 1. Transfer Configuration
- Set appropriate timeouts
- Configure hold music
- Test transfer paths
- Monitor transfer success rates

### 2. User Training
- Train users on transfer codes
- Provide transfer instructions
- Test transfer scenarios
- Document transfer procedures

### 3. Monitoring
- Monitor transfer success rates
- Check transfer logs
- Review failed transfers
- Optimize transfer paths

### 4. Security
- Restrict external transfers
- Monitor transfer patterns
- Implement transfer limits
- Audit transfer logs

## Configuration Files

### 1. Features Configuration
- **File**: `dialplan/features.xml`
- **Purpose**: Transfer feature codes
- **Examples**: `dx`, `att_xfer`, `cf`, `86`

### 2. Default Dialplan
- **File**: `dialplan/default.xml`
- **Purpose**: Internal transfer routing
- **Examples**: Extension transfers, queue transfers

### 3. Public Dialplan
- **File**: `dialplan/public.xml`
- **Purpose**: External transfer routing
- **Examples**: DID transfers, external transfers

### 4. DTMF Binding Configuration
To bind attended transfer to DTMF keys (following [official documentation](https://developer.signalwire.com/freeswitch/FreeSWITCH-Explained/Modules/mod-dptools/6586411/)):

```xml
<!-- Bind DTMF 3 to attended transfer -->
<action application="bind_meta_app" data="3 a a execute_extension::86 XML features"/>

<!-- Bind DTMF 1 to attended transfer in local extensions -->
<extension name="local_number">
  <condition field="destination_number" expression="^(\d{3})$">
    <action application="bind_meta_app" data="1 b s execute_extension::attended_xfer XML features"/>
    <!-- ... other actions ... -->
  </condition>
</extension>
```

**DTMF Binding Options:**
- **`3 a a`**: Press `*3` during any call to activate attended transfer
- **`1 b s`**: Press `*1` during bridged call to activate attended transfer

## Related Documentation
- [Dialplan Guide](dialplan.md)
- [Commands Reference](commands.md)
- [Extensions Guide](extensions.md)
- [IVR Guide](ivr.md)
- [Troubleshooting Guide](troubleshooting.md)
