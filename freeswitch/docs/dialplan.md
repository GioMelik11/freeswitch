# Dialplan Documentation

## Overview
The dialplan defines how calls are routed through the FreeSWITCH system, including internal calls, outbound calls, and inbound call handling.

## Configuration Files

### Primary Dialplans
- **`dialplan/default.xml`**: Internal call routing (extensions, outbound, IVR, queues)
- **`dialplan/public.xml`**: Inbound call routing (DID handling)
- **`dialplan/features.xml`**: Feature codes and special functions

### Dialplan Contexts
- **`default`**: Internal extensions and outbound calls
- **`public`**: Inbound calls from external trunks

## Current Configuration

### Internal Routing (default context)
- **Local Extensions**: 1000-1099
- **Active Extensions**: 1001, 1003 (special media handling)
- **Inactive Extensions**: 1000, 1002, 1004, 1005 (loopback fallback)
- **Outbound Calls**: 9 + number (routes to SIP trunk)
- **Direct Outbound**: +number (routes to SIP trunk)
- **IVR Access**: 5000 (launches main IVR)
- **Queue Access**: 2000, 2001, 251144, 255431

### Inbound Routing (public context)
- **DID Routing**: All DIDs route to IVR (5000)
- **Specific DIDs**: 2200405 → 1001, 2200406 → 1003
- **External Outbound**: Direct outbound from external context

## Dialplan Patterns

### Local Extensions
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

### Outbound Calls
```xml
<extension name="Outbound_Calls">
  <condition field="destination_number" expression="^9(.*)$">
    <action application="set" data="effective_caller_id_number=${caller_id_number}"/>
    <action application="set" data="effective_caller_id_name=${caller_id_name}"/>
    <action application="set" data="call_timeout=60"/>
    <action application="set" data="hangup_after_bridge=true"/>
    <action application="set" data="continue_on_fail=true"/>
    <action application="bridge" data="sofia/gateway/sip_trunk_provider/$1"/>
  </condition>
</extension>
```

### IVR Access
```xml
<extension name="IVR_Main">
  <condition field="destination_number" expression="^5000$">
    <action application="answer"/>
    <action application="sleep" data="1000"/>
    <action application="ivr" data="main_ivr"/>
  </condition>
</extension>
```

### Queue Access
```xml
<extension name="Queue_1">
  <condition field="destination_number" expression="^2000$">
    <action application="answer"/>
    <action application="callcenter" data="queue1@default"/>
  </condition>
</extension>
```

### Inbound DID Routing
```xml
<extension name="Inbound_DID">
  <condition field="destination_number" expression="^(.*)$">
    <action application="set" data="effective_caller_id_number=${caller_id_number}"/>
    <action application="set" data="effective_caller_id_name=${caller_id_name}"/>
    <action application="transfer" data="5000 XML default"/>
  </condition>
</extension>
```

## Adding New Dialplan Rules

### 1. Internal Extensions
Add to `dialplan/default.xml`:

```xml
<extension name="New_Extension_Range">
  <condition field="destination_number" expression="^(20[0-9][0-9])$">
    <action application="set" data="dialed_extension=$1"/>
    <action application="bridge" data="user/${dialed_extension}@${domain_name}"/>
  </condition>
</extension>
```

### 2. Outbound Patterns
```xml
<extension name="International_Calls">
  <condition field="destination_number" expression="^011(.*)$">
    <action application="bridge" data="sofia/gateway/sip_trunk_provider/$1"/>
  </condition>
</extension>
```

### 3. Feature Codes
```xml
<extension name="Call_Forward">
  <condition field="destination_number" expression="^\*72(.*)$">
    <action application="set" data="forward_destination=$1"/>
    <action application="playback" data="ivr/ivr-call_forwarding_has_been_set.wav"/>
  </condition>
</extension>
```

### 4. Inbound Routing
Add to `dialplan/public.xml`:

```xml
<extension name="Support_DID">
  <condition field="destination_number" expression="^\+1([0-9]{10})$">
    <action application="transfer" data="2000 XML default"/>
  </condition>
</extension>
```

## Dialplan Actions

### Common Actions
- **`answer`**: Answer the call
- **`bridge`**: Bridge to destination
- **`transfer`**: Transfer to extension/context
- **`playback`**: Play sound file
- **`sleep`**: Wait for specified time
- **`hangup`**: Hang up call
- **`set`**: Set channel variable
- **`export`**: Export variable to other leg

### IVR Actions
- **`ivr`**: Launch IVR menu
- **`callcenter`**: Enter call center queue
- **`conference`**: Join conference room

### Media Actions
- **`record`**: Record call
- **`playback`**: Play audio file
- **`say`**: Text-to-speech
- **`sleep`**: Wait/pause

## Dialplan Variables

### Channel Variables
- **`${caller_id_number}`**: Caller's phone number
- **`${caller_id_name}`**: Caller's name
- **`${destination_number}`**: Dialed number
- **`${domain_name}`**: SIP domain
- **`${call_timeout}`**: Call timeout setting
- **`${hangup_after_bridge}`**: Hangup after bridge

### Custom Variables
- **`${dialed_extension}`**: Extension being called
- **`${effective_caller_id_number}`**: Effective caller ID
- **`${effective_caller_id_name}`**: Effective caller name
- **`${ringback}`**: Ringback tone
- **`${transfer_ringback}`**: Transfer ringback

## Testing Dialplan

### Manual Testing
```bash
# Test internal call
fs_cli -x "originate loopback/1001 &echo"

# Test outbound call
fs_cli -x "originate loopback/91234567890 &echo"

# Test IVR
fs_cli -x "originate loopback/5000 &echo"

# Test queue
fs_cli -x "originate loopback/2000 &echo"
```

### Call Flow Testing
1. **Internal**: Extension to extension
2. **Outbound**: Extension to external number
3. **Inbound**: External to DID
4. **IVR**: Call DID, test menu options
5. **Queue**: Call queue, test agent routing

## Troubleshooting

### Common Issues
- **"NO_ROUTE_DESTINATION"**: No matching dialplan
- **"USER_NOT_REGISTERED"**: Extension not registered
- **"CALL_REJECTED"**: Call rejected by destination
- **"NO_ANSWER"**: Destination not answering

### Debug Commands
```bash
# Check dialplan
fs_cli -x "dialplan"

# Check specific context
fs_cli -x "dialplan default"

# Check extension
fs_cli -x "dialplan default 1001"

# Test dialplan
fs_cli -x "originate loopback/1001 &echo"
```

### Dialplan Issues
1. **No match**: Check regex patterns
2. **Wrong context**: Verify context assignment
3. **Missing actions**: Check action syntax
4. **Variable issues**: Check variable names and values

### Call Routing Issues
1. **Check patterns**: Verify regex expressions
2. **Check order**: Dialplan processes in order
3. **Check contexts**: Ensure correct context
4. **Check actions**: Verify action syntax
