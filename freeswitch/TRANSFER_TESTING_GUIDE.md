# FreeSWITCH Transfer Testing Guide

## Quick Start

### 1. Run Debug Script First
```bash
# On Windows
debug_transfers.bat

# On Linux/Mac
chmod +x debug_transfers.sh
./debug_transfers.sh
```

### 2. When to Run Tests

#### **BEFORE Making Calls:**
- Run the debug script to check system status
- Ensure extensions are registered
- Verify modules are loaded

#### **DURING Active Calls:**
- Use DTMF keys to test transfers
- Monitor logs for transfer activity
- Use CLI commands for immediate transfers

#### **AFTER Transfer Attempts:**
- Check call status
- Verify transfer completion
- Review logs for errors

## Test Scenarios

### Scenario 1: Basic System Check
**When to run:** Before any transfer testing
**Commands:**
```bash
# Check if FreeSWITCH is running
fs_cli -x "status"

# Check registered extensions
fs_cli -x "show registrations"

# Check active calls
fs_cli -x "show calls"
```

### Scenario 2: CLI Transfer Test
**When to run:** During an active call
**Steps:**
1. Make a call from extension 1001 to 1003
2. Get the call UUID: `fs_cli -x "show calls"`
3. Transfer the call: `fs_cli -x "uuid_transfer <uuid> 1000"`
4. Verify transfer completed

### Scenario 3: DTMF Transfer Test
**When to run:** During an active call
**Steps:**
1. Make a call from extension 1001 to 1003
2. During the call, press `*1` (should trigger dx)
3. Enter `1000` then press `#`
4. Verify transfer to extension 1000

### Scenario 4: Attended Transfer Test
**When to run:** During an active call
**Steps:**
1. Make a call from extension 1001 to 1003
2. During the call, press `*2` (should trigger att_xfer)
3. Enter `1000` then press `#`
4. Speak with extension 1000
5. Press `#` to cancel or hangup to complete transfer

### Scenario 5: Operator Transfer Test
**When to run:** During an active call
**Steps:**
1. Make a call from extension 1001 to 1003
2. During the call, press `*0`
3. Verify transfer to operator (extension 1000)

## Debugging Commands

### Enable Debug Logging
```bash
fs_cli -x "log level 7"
fs_cli -x "console loglevel debug"
```

### Monitor Logs
```bash
# Watch logs in real-time
tail -f /usr/local/freeswitch/log/freeswitch.log

# Or use FreeSWITCH console
fs_cli -x "fsctl loglevel 7"
```

### Test Individual Components
```bash
# Test extension reachability
fs_cli -x "originate user/1001@${domain} &echo"

# Test transfer features
fs_cli -x "originate loopback/dx &echo"
fs_cli -x "originate loopback/att_xfer &echo"

# Test dialplan
fs_cli -x "dialplan features"
fs_cli -x "dialplan default"
```

## Common Issues and Solutions

### Issue 1: DTMF Not Working
**Symptoms:** No response when pressing DTMF keys
**Solutions:**
```bash
# Check DTMF settings
fs_cli -x "sofia profile internal rescan"
fs_cli -x "sofia profile external rescan"

# Test DTMF detection
fs_cli -x "originate loopback/test &echo"
# Press DTMF keys and check logs
```

### Issue 2: Transfer Extension Not Found
**Symptoms:** "Extension not found" errors
**Solutions:**
```bash
# Check if extension exists in dialplan
fs_cli -x "dialplan default 1003"

# Check if user is registered
fs_cli -x "show registrations"

# Test extension directly
fs_cli -x "originate user/1003@${domain} &echo"
```

### Issue 3: Transfer Fails Silently
**Symptoms:** DTMF is received but nothing happens
**Solutions:**
```bash
# Check if mod_dptools is loaded
fs_cli -x "module_exists mod_dptools"

# Reload dialplan
fs_cli -x "reloadxml"

# Check for errors in logs
fs_cli -x "log level 7"
```

## Expected Log Messages

### Successful Transfer
```
INFO Transfer dx triggered
INFO Transfer dx digits received: 1003
INFO Transfer to 1003 triggered
```

### DTMF Reception
```
DTMF received: *
DTMF received: 1
DTMF received: 0
DTMF received: 0
DTMF received: 3
```

### Transfer Completion
```
Call transferred successfully
Bridge completed
```

## Testing Checklist

### Pre-Test Checklist
- [ ] FreeSWITCH is running
- [ ] Extensions are registered
- [ ] Required modules are loaded
- [ ] Debug logging is enabled
- [ ] Audio files exist (if using playback)

### During Test Checklist
- [ ] Call is established
- [ ] DTMF keys are being received
- [ ] Transfer extension is triggered
- [ ] Destination is reachable
- [ ] Transfer completes successfully

### Post-Test Checklist
- [ ] Call status is correct
- [ ] Both parties can hear each other
- [ ] No unexpected hangups
- [ ] Logs show successful transfer
- [ ] No error messages in logs

## Emergency Transfer Methods

If DTMF transfers aren't working:

### 1. CLI Transfer
```bash
# Get call UUID
fs_cli -x "show calls"

# Transfer immediately
fs_cli -x "uuid_transfer <uuid> destination"
```

### 2. Conference Bridge
```bash
# Transfer both legs to conference
fs_cli -x "uuid_transfer <uuid> -both 3001 XML default"
```

### 3. Direct Dialplan
Create a simple extension that does:
```xml
<action application="transfer" data="destination XML default"/>
```

## Troubleshooting Steps

1. **Run debug script** - Check system status
2. **Enable debug logging** - Monitor transfer attempts
3. **Test CLI transfers** - Verify basic functionality
4. **Test DTMF reception** - Ensure keys are being received
5. **Check dialplan** - Verify extensions exist
6. **Test destination** - Ensure target is reachable
7. **Review logs** - Look for error messages
8. **Try alternative methods** - Use CLI or conference transfers

## Support

If transfers still don't work after following this guide:
1. Check FreeSWITCH logs for errors
2. Verify SIP profile configuration
3. Test with different extensions
4. Try different transfer methods
5. Check network connectivity
6. Review FreeSWITCH documentation
