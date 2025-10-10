# Transfer Debug Guide

## Issue Analysis
Based on the logs provided, the DTMF digits are being received correctly:
- `*` received at 09:09:30.274994
- `1` received at 09:09:30.514996 (twice)
- `0` received at 09:09:30.975001
- `0` received again at 09:09:31.215001
- `3` received at 09:09:31.454999

However, the transfer feature is not being triggered.

## Possible Issues

### 1. DTMF Binding Not Working
The `bind_meta_app` might not be working as expected. The format should be:
```xml
<action application="bind_meta_app" data="1 b s execute_extension::dx XML features"/>
```

### 2. Extension Not Found
The transfer extension might not be found in the features context.

### 3. Module Not Loaded
The `mod_dptools` module might not be loaded properly.

## Debugging Steps

### 1. Check if mod_dptools is loaded
```bash
fs_cli -x "module_exists mod_dptools"
```

### 2. Check if extensions are loaded
```bash
fs_cli -x "dialplan features"
```

### 3. Test simple transfer
```bash
fs_cli -x "originate loopback/test_transfer &echo"
```

### 4. Check logs for transfer attempts
```bash
fs_cli -x "log level 7"
```

## Working Solution

### Method 1: Use existing dx feature
1. During active call, press `*1` (this should trigger dx)
2. Dial `1003`
3. Press `#`

### Method 2: Use CLI transfer
```bash
# Get call UUID
fs_cli -x "show calls"

# Transfer call
fs_cli -x "uuid_transfer <uuid> 1003"
```

### Method 3: Use att_xfer feature
1. During active call, press `*5` (this should trigger att_xfer)
2. Dial `1003`
3. Press `#`

## Configuration Check

### 1. Verify modules.conf.xml
```xml
<load module="mod_dptools"/>
```

### 2. Verify features.xml
```xml
<extension name="dx">
  <condition field="destination_number" expression="^dx$">
    <action application="answer"/>
    <action application="read" data="11 11 'tone_stream://%(10000,0,350,440)' digits 5000 #"/>
    <action application="execute_extension" data="is_transfer XML features"/>
  </condition>
</extension>
```

### 3. Verify default.xml
```xml
<action application="bind_meta_app" data="1 b s execute_extension::dx XML features"/>
```

## Test Commands

### 1. Test DTMF binding
```bash
fs_cli -x "originate loopback/dx &echo"
```

### 2. Test transfer extension
```bash
fs_cli -x "originate loopback/1003 &echo"
```

### 3. Test attended transfer
```bash
fs_cli -x "originate loopback/att_xfer &echo"
```

## Expected Behavior

### When working correctly:
1. Press `*1` during active call
2. Hear tone/beep
3. Dial `1003`
4. Press `#`
5. Call transfers to extension 1003

### Debug logs should show:
```
INFO Transfer dx triggered
INFO Transfer dx digits received: 1003
INFO Transfer to 1003 triggered
```

## Troubleshooting

### If DTMF binding doesn't work:
1. Check if `mod_dptools` is loaded
2. Check if extensions are in correct context
3. Try different DTMF binding format
4. Check FreeSWITCH version compatibility

### If transfer doesn't work:
1. Check if destination extension exists
2. Check if destination extension is registered
3. Check transfer timeout settings
4. Check transfer ringback settings

## Alternative Solutions

### 1. Use CLI transfer
```bash
fs_cli -x "uuid_transfer <uuid> 1003"
```

### 2. Use dialplan transfer
```xml
<action application="transfer" data="1003 XML default"/>
```

### 3. Use attended transfer
```xml
<action application="att_xfer" data="user/1003@${domain}"/>
```
