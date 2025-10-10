# Testing DTMF Transfer Configuration

## Pre-Test Checklist

Before testing, ensure:
- [ ] FreeSWITCH is running
- [ ] SIP extensions are registered (1000-1005)
- [ ] Audio prompts are available
- [ ] DTMF detection is working
- [ ] Configuration files are loaded

## Test Scenarios

### 1. Basic DTMF Detection Test

**Purpose:** Verify DTMF sequences are being detected

**Steps:**
1. Call from extension 1001 to extension 1003
2. During the call, press `*9` (Help)
3. Verify help menu plays

**Expected Result:** Help menu audio should play

### 2. Blind Transfer Test (`##`)

**Purpose:** Test immediate transfer without consultation

**Steps:**
1. Call from extension 1001 to extension 1003
2. Press `##`
3. When prompted, enter `1000`
4. Press `#` to confirm
5. Verify call is transferred to extension 1000

**Expected Result:** Call should transfer to extension 1000

### 3. Attended Transfer Test (`*2`)

**Purpose:** Test consultation transfer

**Steps:**
1. Call from extension 1001 to extension 1003
2. Press `*2`
3. When prompted, enter `1002`
4. Press `#` to confirm
5. Verify consultation call is established to 1002
6. Complete transfer or press `#` to cancel

**Expected Result:** Consultation call should be established

### 4. Hold Test (`*4`)

**Purpose:** Test hold with music functionality

**Steps:**
1. Call from extension 1001 to extension 1003
2. Press `*4`
3. Verify hold music plays
4. Press `*4` again or hang up to release hold

**Expected Result:** Hold music should play

### 5. Conference Transfer Test (`*3`)

**Purpose:** Test transferring both legs to conference

**Steps:**
1. Call from extension 1001 to extension 1003
2. Press `*3`
3. When prompted, enter `3001`
4. Press `#` to confirm
5. Verify both parties are in conference 3001

**Expected Result:** Both parties should be in conference room 3001

## Troubleshooting Tests

### DTMF Not Working

If DTMF sequences are not detected:

1. **Check SIP Profile Configuration:**
   ```bash
   fs_cli -x "sofia status profile internal"
   ```

2. **Verify DTMF Type:**
   ```bash
   fs_cli -x "sofia status profile internal reg"
   ```

3. **Test DTMF Detection:**
   ```bash
   fs_cli -x "originate user/1001 &echo"
   ```
   During the echo test, press DTMF keys to verify detection

### Transfer Failures

If transfers are not working:

1. **Check Dialplan Loading:**
   ```bash
   fs_cli -x "dialplan xml_locate default"
   ```

2. **Verify Extensions:**
   ```bash
   fs_cli -x "user_exists 1000"
   fs_cli -x "user_exists 1001"
   ```

3. **Check Bind Digit Actions:**
   ```bash
   fs_cli -x "show channels"
   ```

## Manual Configuration Verification

### Check Configuration Files

1. **Verify features.xml:**
   ```bash
   fs_cli -x "dialplan xml_locate dtmf_blind_transfer features"
   ```

2. **Verify default.xml:**
   ```bash
   fs_cli -x "dialplan xml_locate dtmf_transfer_bindings default"
   ```

3. **Check module loading:**
   ```bash
   fs_cli -x "show modules"
   ```

### Test Commands

Use these FreeSWITCH CLI commands for testing:

```bash
# Reload dialplan
fs_cli -x "reloadxml"

# Check DTMF bindings
fs_cli -x "show channels"

# Test specific extension
fs_cli -x "originate user/1001 &transfer(1000 XML default)"

# Monitor events
fs_cli -x "event plain ALL"
```

## Expected Log Output

When DTMF transfers are working correctly, you should see logs like:

```
NOTICE mod_dptools.c:bind_digit_action: DTMF sequence '##' detected
NOTICE mod_dptools.c:transfer: Transferring call to 1000
NOTICE mod_dptools.c:att_xfer: Attended transfer initiated
```

## Performance Testing

### Load Testing

1. **Multiple Simultaneous Transfers:**
   - Establish 5-10 concurrent calls
   - Test DTMF transfers simultaneously
   - Monitor system performance

2. **Long Duration Tests:**
   - Run transfers for extended periods
   - Check memory usage
   - Monitor CPU utilization

## Success Criteria

The implementation is successful when:

- [ ] All DTMF sequences are detected reliably
- [ ] Blind transfers complete within 2 seconds
- [ ] Attended transfers establish consultation calls
- [ ] Conference transfers work for both legs
- [ ] Hold functionality plays music continuously
- [ ] Help menu provides clear instructions
- [ ] Cancellation works with `#` key
- [ ] No audio artifacts or delays
- [ ] System remains stable under load

## Rollback Plan

If issues are encountered:

1. **Disable DTMF Bindings:**
   Comment out the `dtmf_transfer_bindings` extension in `default.xml`

2. **Remove New Files:**
   Move `dtmf_transfers.xml` to backup location

3. **Restore Original:**
   Restore original `features.xml` if modified

4. **Reload Configuration:**
   ```bash
   fs_cli -x "reloadxml"
   ```

## Support Commands

For ongoing support and monitoring:

```bash
# Check active transfers
fs_cli -x "show calls count"

# Monitor DTMF events
fs_cli -x "event plain DTMF"

# Check transfer statistics
fs_cli -x "show calls as json"

# Verify user registrations
fs_cli -x "sofia status profile internal reg"
```
