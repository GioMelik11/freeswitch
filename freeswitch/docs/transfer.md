# Transfer System Documentation

## Overview
The FreeSWITCH transfer system provides comprehensive blind and attended transfer functionality for both internal extensions and external numbers with clear caller ID management.

## Transfer Types

### 1. Blind Transfer
- **Definition**: Immediate transfer without consultation
- **Use Case**: Quick transfers when you know the destination will accept
- **Behavior**: Caller is immediately transferred to destination

### 2. Attended Transfer (Consult Transfer)
- **Definition**: Transfer with consultation before completing
- **Use Case**: Verify availability before transferring
- **Behavior**: Agent consults with destination, then completes transfer

## Feature Codes

### Basic Transfer Codes
- **`*1`** - Blind transfer (prompts for destination)
- **`*2`** - Legacy blind transfer (dx)
- **`*3`** - Attended transfer (prompts for destination)
- **`*4`** - Attended transfer with external support
- **`*5`** - Legacy attended transfer (att_xfer)
- **`*6`** - Transfer with caller ID preservation
- **`*0`** - Quick transfer to operator
- **`*9`** - Transfer to conference
- **`**`** - Transfer help/information

### Direct Transfer Codes
- **`*1[extension]`** - Direct blind transfer to extension
- **`*3[extension]`** - Direct attended transfer to extension
- **`*1[9][number]`** - Direct blind transfer to external number
- **`*3[9][number]`** - Direct attended transfer to external number

## Usage Examples

### Blind Transfer Examples

#### 1. Transfer to Internal Extension
```
*1 → Enter extension number (e.g., 1003) → Transfer completed
```

#### 2. Direct Blind Transfer
```
*11003 → Immediately transfers to extension 1003
```

#### 3. Transfer to External Number
```
*1 → Enter 9+number (e.g., 91234567890) → Transfer to external number
```

#### 4. Direct External Transfer
```
*191234567890 → Immediately transfers to external number
```

### Attended Transfer Examples

#### 1. Attended Transfer to Extension
```
*3 → Enter extension number (e.g., 1003) → Consult with 1003 → Complete transfer
```

#### 2. Direct Attended Transfer
```
*31003 → Immediately starts attended transfer to extension 1003
```

#### 3. Attended Transfer to External
```
*4 → Enter 9+number → Consult with external number → Complete transfer
```

## Transfer Flow

### Blind Transfer Flow
1. **Agent presses** `*1` or `*1[destination]`
2. **System prompts** for destination (if not direct)
3. **Agent enters** destination number
4. **System immediately** transfers caller to destination
5. **Agent is disconnected** from call

### Attended Transfer Flow
1. **Agent presses** `*3` or `*3[destination]`
2. **System prompts** for destination (if not direct)
3. **Agent enters** destination number
4. **System calls** destination and connects to agent
5. **Agent consults** with destination
6. **Agent completes** transfer (both parties connected)
7. **Agent is disconnected** from call

## Caller ID Management

### Default Behavior
- **Internal transfers**: Preserve original caller ID
- **External transfers**: Use system caller ID settings
- **Transferred calls**: Show original caller information

### Caller ID Preservation
- **Feature**: `*6` (transfer_cid)
- **Behavior**: Explicitly preserves original caller ID
- **Use Case**: When you want to ensure caller ID is maintained

## Configuration Files

### Primary Files
- **`dialplan/features.xml`** - Transfer feature definitions
- **`dialplan/default.xml`** - Transfer feature codes
- **`directory/default.xml`** - Transfer variables
- **`vars.xml`** - Global transfer settings

### Key Variables
```xml
<!-- Global Transfer Settings -->
<variable name="transfer_timeout" value="30"/>
<variable name="transfer_ringback" value="$${hold_music}"/>
<variable name="transfer_continue_on_fail" value="true"/>
<variable name="transfer_hangup_after_bridge" value="true"/>
<variable name="transfer_preserve_caller_id" value="true"/>
<variable name="transfer_fallback_extension" value="operator"/>
```

## Testing Transfer Functions

### CLI Testing Commands
```bash
# Test blind transfer
fs_cli -x "originate loopback/1001 &transfer(*1 XML features)"

# Test attended transfer
fs_cli -x "originate loopback/1001 &transfer(*3 XML features)"

# Test direct transfer
fs_cli -x "originate loopback/1001 &transfer(*11003 XML features)"

# Check transfer status
fs_cli -x "show channels"
```

### Manual Testing Steps
1. **Make test call** to extension 1001
2. **Press transfer code** (e.g., `*1`)
3. **Enter destination** when prompted
4. **Verify transfer** completes correctly
5. **Check caller ID** is preserved

## Troubleshooting

### Common Issues

#### Transfer Not Working
- **Check**: Feature codes are properly configured
- **Verify**: Transfer destinations exist
- **Confirm**: SIP profiles are active

#### Caller ID Issues
- **Problem**: Caller ID not preserved
- **Solution**: Use `*6` for explicit preservation
- **Check**: External gateway caller ID settings

#### External Transfer Fails
- **Check**: SIP trunk is registered
- **Verify**: External number format is correct
- **Confirm**: Gateway configuration is valid

### Debug Commands
```bash
# Check transfer extensions
fs_cli -x "xml_locate dialplan *1"

# Check feature context
fs_cli -x "xml_locate dialplan blind_transfer"

# Reload dialplan
fs_cli -x "reloadxml"

# Check active calls
fs_cli -x "show channels"
```

## Advanced Features

### Custom Transfer Destinations
- **Operator**: `*0` - Routes to operator extension
- **Conference**: `*9` - Routes to conference system
- **Help**: `**` - Provides transfer information

### Transfer Timeouts
- **Default**: 30 seconds
- **Configurable**: Via transfer_timeout variable
- **Fallback**: Routes to operator if timeout

### Transfer Permissions
- **Internal**: All extensions can transfer internally
- **External**: Based on toll_allow settings
- **Groups**: Support/sales group restrictions

## Best Practices

### For Agents
1. **Use attended transfer** when unsure of availability
2. **Use blind transfer** for known destinations
3. **Always confirm** before completing transfers
4. **Use caller ID preservation** for external transfers

### For Administrators
1. **Test transfer functions** after configuration changes
2. **Monitor transfer success rates**
3. **Configure appropriate timeouts**
4. **Set up fallback destinations**

## Integration with Call Center

### Queue Integration
- **Transfer to queues**: Use queue extensions (2000, 2001)
- **Transfer from queues**: Agents can transfer calls
- **Queue overflow**: Transfer to operator or other queues

### IVR Integration
- **Transfer from IVR**: Routes to queues or extensions
- **Transfer to IVR**: External calls can be transferred to IVR
- **Transfer between IVRs**: Multiple IVR support

## Security Considerations

### Transfer Restrictions
- **Internal only**: Restrict external transfers if needed
- **Caller ID spoofing**: Prevent unauthorized caller ID changes
- **Transfer logging**: Monitor all transfer activities

### Authentication
- **SIP authentication**: Required for transfer operations
- **User permissions**: Based on extension configuration
- **Gateway authentication**: Required for external transfers
