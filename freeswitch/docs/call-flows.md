# FreeSWITCH Call Flow Documentation

## System Overview

**FreeSWITCH Version**: 1.10.12-release (IVR built-in)
**Primary Use Case**: Inbound call center with IVR menu routing to agent queues

## Complete Call Flow Diagrams

### 1. Inbound Call from External Trunk

```
┌──────────────────────────────────────────────────────────────────┐
│ External Caller                                                   │
│ Dials: Your DID (e.g., 2200405)                                  │
└────────────────┬─────────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────────┐
│ SIP Trunk Provider (89.150.1.126)                                │
│ Gateway: sip_trunk_provider                                       │
└────────────────┬─────────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────────┐
│ FreeSWITCH - External SIP Profile                                │
│ Context: public                                                   │
│ dialplan/public.xml                                               │
└────────────────┬─────────────────────────────────────────────────┘
                 │
                 │ <extension name="Inbound_DID">
                 │   matches: .* (all DIDs)
                 │   action: transfer to 5000 XML default
                 │
                 ▼
┌──────────────────────────────────────────────────────────────────┐
│ FreeSWITCH - Default Context                                     │
│ Extension: 5000 (IVR_Main)                                       │
│ dialplan/default.xml                                              │
└────────────────┬─────────────────────────────────────────────────┘
                 │
                 │ <action application="answer"/>
                 │ <action application="sleep" data="1000"/>
                 │ <action application="ivr" data="main_ivr"/>
                 │
                 ▼
┌──────────────────────────────────────────────────────────────────┐
│ IVR Menu: main_ivr                                               │
│ File: autoload_configs/ivr.conf.xml                              │
│ Plays: /usr/share/freeswitch/sounds/ivr/incoming.wav             │
│ Timeout: 15 seconds                                               │
└────────────────┬─────────────────────────────────────────────────┘
                 │
                 │ Caller Presses Digit
                 │
     ┌───────────┴───────────┐
     │                       │
     ▼                       ▼
┌─────────┐            ┌─────────┐
│ Press 1 │            │ Press 2 │
└────┬────┘            └────┬────┘
     │                      │
     │ transfer 251144      │ transfer 255431
     │ XML default          │ XML default
     │                      │
     ▼                      ▼
┌────────────────┐    ┌────────────────┐
│ Extension      │    │ Extension      │
│ 251144         │    │ 255431         │
│ Queue_251144   │    │ Queue_255431   │
└────┬───────────┘    └────┬───────────┘
     │                     │
     │ <action             │ <action
     │  application=       │  application=
     │  "callcenter"       │  "callcenter"
     │  data="queue1@      │  data="queue2@
     │  default"/>         │  default"/>
     │                     │
     ▼                     ▼
┌────────────────┐    ┌────────────────┐
│ CallCenter     │    │ CallCenter     │
│ Queue 1        │    │ Queue 2        │
│ (queue1@       │    │ (queue2@       │
│  default)      │    │  default)      │
└────┬───────────┘    └────┬───────────┘
     │                     │
     │ Strategy:           │ Strategy:
     │ ring-all            │ ring-all
     │                     │
     ▼                     ▼
┌────────────────┐    ┌────────────────┐
│ Agent 1001     │    │ Agent 1003     │
│ user/1001@     │    │ user/1003@     │
│ domain         │    │ domain         │
└────────────────┘    └────────────────┘
```

### 2. Internal Extension to Extension Call

```
┌──────────────────────────────────────────────────────────────────┐
│ Extension 1001                                                    │
│ Dials: 1003                                                       │
└────────────────┬─────────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────────┐
│ FreeSWITCH - Default Context                                     │
│ dialplan/default.xml                                              │
│ <extension name="Active_Extensions">                             │
│   matches: ^(100[13])$                                           │
└────────────────┬─────────────────────────────────────────────────┘
                 │
                 │ <action application="bridge" 
                 │  data="user/1003@${domain_name}"/>
                 │
                 ▼
┌──────────────────────────────────────────────────────────────────┐
│ Extension 1003 Rings                                             │
│ Call connected when answered                                      │
└──────────────────────────────────────────────────────────────────┘
```

### 3. Outbound Call via SIP Trunk

```
┌──────────────────────────────────────────────────────────────────┐
│ Extension 1001                                                    │
│ Dials: 9 + Phone Number (e.g., 91234567890)                     │
└────────────────┬─────────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────────┐
│ FreeSWITCH - Default Context                                     │
│ dialplan/default.xml                                              │
│ <extension name="Outbound_Calls">                                │
│   matches: ^9(.*)$                                               │
└────────────────┬─────────────────────────────────────────────────┘
                 │
                 │ Strip "9" prefix
                 │ <action application="bridge"
                 │  data="sofia/gateway/sip_trunk_provider/$1"/>
                 │
                 ▼
┌──────────────────────────────────────────────────────────────────┐
│ SIP Trunk: sip_trunk_provider                                    │
│ Gateway: 89.150.1.126                                            │
│ Sends call to: 1234567890                                        │
└────────────────┬─────────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────────┐
│ PSTN / External Phone                                            │
│ Number: 1234567890 rings                                         │
└──────────────────────────────────────────────────────────────────┘
```

### 4. Direct Queue Access (Bypass IVR)

```
┌──────────────────────────────────────────────────────────────────┐
│ Extension 1000 or External Caller                                │
│ Dials: 2000 (Queue 1) or 2001 (Queue 2)                         │
└────────────────┬─────────────────────────────────────────────────┘
                 │
                 ▼
┌──────────────────────────────────────────────────────────────────┐
│ FreeSWITCH - Default Context                                     │
│ dialplan/default.xml                                              │
│ <extension name="Queue_1">                                       │
│   matches: ^2000$                                                │
└────────────────┬─────────────────────────────────────────────────┘
                 │
                 │ <action application="callcenter"
                 │  data="queue1@default"/>
                 │
                 ▼
┌──────────────────────────────────────────────────────────────────┐
│ CallCenter Queue 1                                               │
│ Agent 1001 rings                                                 │
└──────────────────────────────────────────────────────────────────┘
```

## Context and Extension Mapping

### Contexts
- **public**: Handles all inbound calls from SIP trunk
- **default**: Internal extensions, IVR, queues, outbound calls

### Extension Ranges

| Extension Range | Description | Dialplan |
|----------------|-------------|----------|
| 1000-1099 | Local SIP extensions | dialplan/default.xml |
| 2000 | Queue 1 direct access | dialplan/default.xml |
| 2001 | Queue 2 direct access | dialplan/default.xml |
| 5000 | IVR Main Menu | dialplan/default.xml |
| 251144 | Queue 1 (via IVR) | dialplan/default.xml |
| 255431 | Queue 2 (via IVR) | dialplan/default.xml |
| 3000-3099 | Conference rooms | dialplan/default.xml |
| 9 + number | Outbound calls | dialplan/default.xml |
| +1... | Direct outbound | dialplan/default.xml |

### Active Extensions

| Extension | User | Agent | Queue Assignment |
|-----------|------|-------|------------------|
| 1001 | Yes | Yes | Queue 1 (queue1@default) |
| 1003 | Yes | Yes | Queue 2 (queue2@default) |
| 1000, 1002, 1004, 1005 | Yes | No | N/A (loopback fallback) |

## Configuration Files Reference

### IVR Configuration
**File**: `autoload_configs/ivr.conf.xml`
- Defines menu: `main_ivr`
- Sound files in: `/usr/share/freeswitch/sounds/ivr/`
- Menu options: 1 → 251144, 2 → 255431

### Dialplan Configuration
**File**: `dialplan/default.xml`
- Local extensions (1000-1099)
- IVR access (5000)
- Queue access (2000, 2001, 251144, 255431)
- Outbound calls (9 + number)

**File**: `dialplan/public.xml`
- Inbound DID routing
- All calls → transfer to 5000 (IVR)

### CallCenter Configuration
**File**: `autoload_configs/callcenter.conf.xml`
- Queue 1: queue1@default (Agent 1001)
- Queue 2: queue2@default (Agent 1003)
- Strategy: ring-all

### SIP Trunk Configuration
**File**: `sip_profiles/external/sip_trunk_provider.xml`
- Gateway: sip_trunk_provider
- Proxy: 89.150.1.126
- Username: 1054965e4
- Extension: 2200405
- DTMF: RFC2833

## DTMF (Dial Tone Multi-Frequency) Handling

### IVR DTMF Processing
- **Method**: RFC2833 (preferred)
- **Fallback**: Inband DTMF detection
- **Digit Length**: 1 (single digit)
- **Inter-digit Timeout**: 3 seconds
- **Total Timeout**: 15 seconds

### SIP Trunk DTMF
- **Parameter**: `<param name="dtmf-type" value="rfc2833"/>`
- **RTP Payload**: 101
- **Configuration**: sip_profiles/external.xml

## Troubleshooting Call Flows

### Test Inbound Call Flow
```bash
# 1. Check trunk registration
fs_cli -x "sofia status gateway sip_trunk_provider"

# 2. Verify public context routing
fs_cli -x "xml_locate context public"

# 3. Test IVR directly
fs_cli -x "originate user/1001 5000"

# 4. Monitor live call
fs_cli
> console loglevel debug
# Then place test call and watch the flow
```

### Test Outbound Call Flow
```bash
# 1. Test gateway availability
fs_cli -x "sofia status gateway sip_trunk_provider"

# 2. Test outbound call
fs_cli -x "originate user/1001 9123456789"

# 3. Check call variables
fs_cli -x "show channels verbose"
```

### Debug Queue Calls
```bash
# List queues
fs_cli -x "callcenter_config queue list"

# List agents
fs_cli -x "callcenter_config agent list"

# Check agent status
fs_cli -x "callcenter_config agent get status 1001@default"

# View queue members
fs_cli -x "callcenter_config tier list"
```

## Call Flow States

### Normal Call States
1. **NEW** - Call initiated
2. **RINGING** - Extension/trunk is ringing
3. **EARLY** - Early media (ringback tone)
4. **ACTIVE** - Call connected and in progress
5. **HANGUP** - Call ending
6. **DESTROY** - Call cleanup

### Queue Call States
1. **Waiting** - Caller in queue waiting for agent
2. **Trying** - System attempting to connect to agent
3. **Answered** - Agent answered, call connected
4. **Abandoned** - Caller hung up while waiting

## Performance and Capacity

### Current Capacity
- **Concurrent Calls**: Limited by system resources
- **Queues**: 2 (expandable)
- **Agents**: 2 active (1001, 1003)
- **IVR Sessions**: Unlimited (resource-dependent)

### Recommended Limits
- **Max Queue Wait Time**: Configure based on SLA
- **Agent Timeout**: 30 seconds (current: 30s)
- **Call Recording**: Not currently enabled
- **CDR**: CSV-based (can be upgraded to database)

## Related Documentation
- [IVR Documentation](ivr.md) - Detailed IVR configuration
- [Queue Documentation](queues.md) - CallCenter queue management
- [Extensions Documentation](extensions.md) - Extension setup
- [SIP Trunk Documentation](sip-trunks.md) - Trunk configuration
- [Troubleshooting Guide](troubleshooting.md) - Common issues

