# Test DTMF Transfer Fix

## What I Fixed

The issue was that `bind_digit_action` wasn't being applied to active calls. I've moved the DTMF bindings to be applied during the bridge setup for both local and outbound calls.

## Test Steps

### 1. Reload Configuration
```bash
fs_cli -x "reloadxml"
```

### 2. Make a Test Call
Make a call between two extensions (e.g., 1001 to 1003):
```bash
fs_cli -x "originate user/1001 1003"
```

### 3. Check DTMF Bindings
During the call, run:
```bash
fs_cli -x "show channels"
```

You should now see `bind_digit_action` entries in the channel output.

### 4. Test DTMF Transfers

#### Test 1: Quick Transfer
During the active call:
- Press `*04` → Should transfer immediately to extension 1003

#### Test 2: Blind Transfer with Hold Music
During the active call:
- Press `##` → Hold music should start immediately
- Enter `1002` while music plays
- Press `#` → Should transfer to extension 1002

#### Test 3: Attended Transfer
During the active call:
- Press `*2` → Hold music should start immediately
- Enter `1001` while music plays
- Press `#` → Consultation call should be established

## Expected Results

### Before Fix:
- `show channels` showed no `bind_digit_action` entries
- Pressing `##` did nothing (just DTMF detection in logs)

### After Fix:
- `show channels` should show `bind_digit_action` entries
- Pressing `##` should start hold music immediately
- Pressing `*04` should transfer immediately to 1003

## Debug Commands

### Check Channel Bindings:
```bash
fs_cli -x "show channels"
```

### Test Direct Transfer:
```bash
fs_cli -x "originate user/1001 9999"
```

### Test Hold Music:
```bash
fs_cli -x "originate user/1001 9664"
```

### Monitor DTMF Events:
```bash
fs_cli -x "event plain DTMF"
```

## Quick Test Sequence

1. **Reload config:** `fs_cli -x "reloadxml"`
2. **Make call:** `fs_cli -x "originate user/1001 1003"`
3. **Check bindings:** `fs_cli -x "show channels"`
4. **Test quick transfer:** Press `*04` during call
5. **Test hold transfer:** Press `##` during call

## Troubleshooting

### If DTMF still doesn't work:
1. Check if `local_stream://moh` exists
2. Try alternative hold music: `local_stream://default_music_hold`
3. Verify extensions exist: `fs_cli -x "user_exists 1003"`

### Alternative Hold Music:
If `local_stream://moh` doesn't exist, update `vars.xml`:
```xml
<X-PRE-PROCESS cmd="set" data="hold_music=local_stream://default_music_hold"/>
```

The key fix was moving the `bind_digit_action` commands to be executed during the bridge setup, so they're applied to the actual call channels rather than just during dialplan parsing.
