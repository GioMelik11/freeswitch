# Extensions Documentation

## Overview
Extensions are SIP users that can make and receive calls through the FreeSWITCH system.

## Current Configuration

### Active Extensions
- **1001**: Active agent for Queue 1
- **1003**: Active agent for Queue 2

### Inactive Extensions
- **1000**: Configured but not registered
- **1002**: Configured but not registered
- **1004**: Configured but not registered
- **1005**: Configured but not registered

### Default Settings
- **Password**: `1234` (change in `vars.xml`)
- **Context**: `default`
- **Call Groups**: `support` (1000-1002), `sales` (1003-1005)

## Configuration Files

### User Definitions
- **Directory**: `directory/default/`
- **Files**: `1001.xml`, `1003.xml`, etc.
- **Default**: `default.xml` (template)

### Dialplan Integration
- **File**: `dialplan/default.xml`
- **Pattern**: `^(10[0-9][0-9])$` (1000-1099)

## Extension Configuration Example

```xml
<include>
  <user id="1001">
    <params>
      <param name="password" value="$${default_password}"/>
    </params>
    <variables>
      <variable name="toll_allow" value="domestic,international,local"/>
      <variable name="accountcode" value="1001"/>
      <variable name="user_context" value="default"/>
      <variable name="effective_caller_id_name" value="Extension 1001"/>
      <variable name="effective_caller_id_number" value="1001"/>
      <variable name="outbound_caller_id_name" value="$${outbound_caller_name}"/>
      <variable name="outbound_caller_id_number" value="$${outbound_caller_id}"/>
      <variable name="callgroup" value="support"/>
    </variables>
  </user>
</include>
```

## Adding New Extensions

### 1. Create User File
Create `directory/default/1002.xml`:

```xml
<include>
  <user id="1002">
    <params>
      <param name="password" value="$${default_password}"/>
    </params>
    <variables>
      <variable name="toll_allow" value="domestic,international,local"/>
      <variable name="accountcode" value="1002"/>
      <variable name="user_context" value="default"/>
      <variable name="effective_caller_id_name" value="Extension 1002"/>
      <variable name="effective_caller_id_number" value="1002"/>
      <variable name="outbound_caller_id_name" value="$${outbound_caller_name}"/>
      <variable name="outbound_caller_id_number" value="$${outbound_caller_id}"/>
      <variable name="callgroup" value="support"/>
    </variables>
  </user>
</include>
```

### 2. Reload Configuration
```bash
fs_cli -x "reloadxml"
fs_cli -x "reload mod_sofia"
```

### 3. Register Softphone
Configure softphone with:
- **Server**: Your FreeSWITCH IP
- **Username**: `1002`
- **Password**: `1234` (or custom password)
- **Domain**: Your FreeSWITCH domain

## Extension Parameters

### Core Parameters
- **`password`**: Authentication password
- **`toll_allow`**: Call permissions (domestic, international, local)
- **`accountcode`**: Billing/accounting code
- **`user_context`**: Dialplan context
- **`effective_caller_id_name`**: Display name for calls
- **`effective_caller_id_number`**: Caller ID number
- **`outbound_caller_id_name`**: Outbound caller name
- **`outbound_caller_id_number`**: Outbound caller number
- **`callgroup`**: Call group assignment

### Call Groups
- **`support`**: Support team extensions
- **`sales`**: Sales team extensions
- **Custom**: Define your own groups

## Dialplan Integration

### Local Extension Pattern
```xml
<extension name="Local_Extension">
  <condition field="destination_number" expression="^(10[0-9][0-9])$">
    <action application="export" data="dialed_extension=$1"/>
    <action application="set" data="ringback=${us-ring}"/>
    <action application="set" data="transfer_ringback=$${hold_music}"/>
    <action application="set" data="call_timeout=30"/>
    <action application="set" data="hangup_after_bridge=true"/>
    <action application="set" data="continue_on_fail=true"/>
    <action application="bridge" data="user/${dialed_extension}@${domain_name}"/>
  </condition>
</extension>
```

### Active Extensions (Special Handling)
```xml
<extension name="Active_Extensions">
  <condition field="destination_number" expression="^(100[13])$">
    <action application="set" data="dialed_extension=$1"/>
    <action application="set" data="bypass_media=false"/>
    <action application="set" data="proxy_media=false"/>
    <action application="set" data="media_mix_inbound_outbound_codecs=false"/>
    <action application="set" data="rtp_secure_media=false"/>
    <action application="bridge" data="user/${dialed_extension}@${domain_name}"/>
  </condition>
</extension>
```

## Testing Extensions

### Registration Testing
```bash
# Check registrations
fs_cli -x "sofia status profile internal reg"

# Check specific extension
fs_cli -x "sofia status profile internal reg 1001"
```

### Call Testing
```bash
# Test internal call
fs_cli -x "originate loopback/1001 &echo"

# Test outbound call
fs_cli -x "originate user/1001@$${domain} &echo"
```

### Softphone Testing
1. Configure softphone with extension credentials
2. Register to FreeSWITCH
3. Make test calls to other extensions
4. Test outbound calls (dial 9 + number)

## Troubleshooting

### Common Issues
- **"USER_NOT_REGISTERED"**: Extension not registered
- **"NO_ANSWER"**: Extension not answering
- **"CALL_REJECTED"**: Extension rejecting calls
- **One-way audio**: NAT/media issues

### Debug Commands
```bash
# Check registrations
fs_cli -x "sofia status profile internal reg"

# Check extension status
fs_cli -x "user_exists 1001"

# Check call routing
fs_cli -x "originate loopback/1001 &echo"

# Reload directory
fs_cli -x "reload mod_sofia"
```

### Registration Issues
1. **Check credentials**: Username, password, domain
2. **Check network**: Firewall, NAT, routing
3. **Check SIP profile**: Internal profile settings
4. **Check logs**: FreeSWITCH logs for errors

### Audio Issues
1. **Check NAT settings**: SIP profile NAT configuration
2. **Check media proxying**: Internal profile media settings
3. **Check codecs**: Ensure compatible codecs
4. **Check RTP**: RTP port ranges and firewall
