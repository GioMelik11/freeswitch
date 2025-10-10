# Debug DTMF Transfer Issue

## Problem
DTMF `##` is being detected (as shown in logs) but hold music is not starting.

## Debugging Steps

### 1. Test Direct Transfer First
Call extension `9999` to test if the transfer extension works directly:
```bash
# From CLI or make a call to 9999
fs_cli -x "originate user/1001 9999"
```
This should trigger the DTMF transfer extension directly.

### 2. Check Configuration Loading
```bash
fs_cli -x "reloadxml"
fs_cli -x "dialplan xml_locate dtmf_blind_transfer features"
```

### 3. Check Active DTMF Bindings
```bash
fs_cli -x "show channels"
```
Look for `bind_digit_action` entries in the channel output.

### 4. Test Hold Music Directly
```bash
fs_cli -x "originate user/1001 9664"
```
This should play hold music directly.

### 5. Check Variables
```bash
fs_cli -x "eval $${hold_music}"
```

## Possible Issues & Solutions

### Issue 1: DTMF Bindings Not Applied
**Symptoms:** DTMF detected but no action triggered
**Solution:** Check if `bind_digit_action` is being applied to the channel

### Issue 2: Hold Music Variable Not Set
**Symptoms:** Transfer triggered but no music
**Solution:** Set hold music variable in vars.xml

### Issue 3: Features Context Not Found
**Symptoms:** Transfer fails to features context
**Solution:** Verify features.xml is loaded

## Quick Fixes

### Fix 1: Add Hold Music Variable
Add to `vars.xml`:
```xml
<X-PRE-PROCESS cmd="set" data="hold_music=local_stream://moh"/>
```

### Fix 2: Test Alternative DTMF Binding
Try this simpler approach in `default.xml`:
```xml
<action application="bind_digit_action" data="test_transfer,##,exec:transfer,1003 XML default"/>
```

### Fix 3: Use Different DTMF Pattern
Try `*##` instead of `##`:
```xml
<action application="bind_digit_action" data="transfer,*##,exec:transfer,dtmf_blind_transfer XML features"/>
```

## Test Commands

### Test 1: Direct Extension Call
```bash
fs_cli -x "originate user/1001 9999"
```

### Test 2: Check Channel State
```bash
fs_cli -x "show channels"
```

### Test 3: Monitor Events
```bash
fs_cli -x "event plain ALL"
```

### Test 4: Test Hold Music
```bash
fs_cli -x "originate user/1001 9664"
```

## Expected Results

### Working Correctly:
- Call to `9999` should trigger hold music and prompt for extension
- `show channels` should show `bind_digit_action` entries
- Hold music should play when calling `9664`

### If Still Not Working:
Try the alternative approach with direct transfer:
```xml
<action application="bind_digit_action" data="quick_transfer,##,exec:transfer,1003 XML default"/>
```

This bypasses the features context and transfers directly to extension 1003.

## Next Steps

1. **Test extension 9999** - This will verify the transfer extension works
2. **Check hold music** - Call 9664 to verify music plays
3. **Try quick transfer** - Use the alternative binding above
4. **Check logs** - Look for any error messages

Let me know the results of these tests!
