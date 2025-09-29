# Call Center Queues Documentation

## Overview
The call center system manages incoming calls through queues with agent assignments and routing strategies.

## Current Configuration

### Queues
- **Queue 1**: `queue1@default` - Ring-all strategy
- **Queue 2**: `queue2@default` - Ring-all strategy

### Agents
- **Agent 1001**: Assigned to `queue1@default`
- **Agent 1003**: Assigned to `queue2@default`

### Queue Access
- **Direct Access**: Extensions 2000, 2001
- **IVR Access**: Press 1 or 2 in IVR
- **Specific Numbers**: 251144 (Queue 1), 255431 (Queue 2)

## Configuration Files

### Primary Configuration
- **File**: `autoload_configs/callcenter.conf.xml`
- **Purpose**: Defines queues, agents, and tiers

### Dialplan Integration
- **File**: `dialplan/default.xml`
- **Extensions**: Queue_1 (2000), Queue_2 (2001), Queue_251144, Queue_255431

## Queue Configuration Example

```xml
<configuration name="callcenter.conf" description="CallCenter">
  <settings>
    <param name="dbname" value="/dev/shm/callcenter.db"/>
    <param name="cc-instance-id" value="single_box"/>
  </settings>

  <queues>
    <queue name="queue1@default">
      <param name="strategy" value="ring-all"/>
      <param name="moh-sound" value="local_stream://moh"/>
      <param name="time-base-score" value="system"/>
      <param name="max-wait-time" value="0"/>
      <param name="max-wait-time-with-no-agent" value="0"/>
      <param name="max-wait-time-with-no-agent-time-reached" value="5"/>
      <param name="tier-rules-apply" value="false"/>
      <param name="tier-rule-wait-second" value="300"/>
      <param name="tier-rule-wait-multiply-level" value="true"/>
      <param name="tier-rule-no-agent-no-wait" value="false"/>
      <param name="discard-abandoned-after" value="60"/>
    </queue>
  </queues>

  <agents>
    <agent name="1001@default" type="callback" contact="user/1001@$${domain}" status="Available"/>
  </agents>

  <tiers>
    <tier agent="1001@default" queue="queue1@default" level="1" position="1"/>
  </tiers>
</configuration>
```

## Queue Strategies

### Ring-All Strategy
- **Behavior**: Rings all available agents simultaneously
- **Use Case**: Small teams, immediate response needed
- **Configuration**: `<param name="strategy" value="ring-all"/>`

### Longest-Idle-Agent Strategy
- **Behavior**: Routes to agent who has been idle longest
- **Use Case**: Load balancing, fair distribution
- **Configuration**: `<param name="strategy" value="longest-idle-agent"/>`

### Round-Robin Strategy
- **Behavior**: Routes calls in rotation
- **Use Case**: Even call distribution
- **Configuration**: `<param name="strategy" value="round-robin"/>`

## Adding New Queues

### 1. Edit Queue Configuration
Add to `autoload_configs/callcenter.conf.xml`:

```xml
<queue name="queue3@default">
  <param name="strategy" value="longest-idle-agent"/>
  <param name="moh-sound" value="local_stream://moh"/>
  <param name="time-base-score" value="system"/>
  <param name="max-wait-time" value="0"/>
  <param name="max-wait-time-with-no-agent" value="0"/>
  <param name="max-wait-time-with-no-agent-time-reached" value="5"/>
  <param name="tier-rules-apply" value="false"/>
  <param name="tier-rule-wait-second" value="300"/>
  <param name="tier-rule-wait-multiply-level" value="true"/>
  <param name="tier-rule-no-agent-no-wait" value="false"/>
  <param name="discard-abandoned-after" value="60"/>
</queue>
```

### 2. Add Agent
```xml
<agent name="1002@default" type="callback" contact="user/1002@$${domain}" status="Available"/>
```

### 3. Add Tier Assignment
```xml
<tier agent="1002@default" queue="queue3@default" level="1" position="1"/>
```

### 4. Add Dialplan Access
Add to `dialplan/default.xml`:

```xml
<extension name="Queue_3">
  <condition field="destination_number" expression="^2002$">
    <action application="answer"/>
    <action application="callcenter" data="queue3@default"/>
  </condition>
</extension>
```

### 5. Reload Configuration
```bash
fs_cli -x "reloadxml"
fs_cli -x "reload mod_callcenter"
```

## Queue Parameters

### Core Parameters
- **`strategy`**: Queue routing strategy
- **`moh-sound`**: Music on hold sound
- **`time-base-score`**: Scoring system (system, all-equal, idle-time)
- **`max-wait-time`**: Maximum wait time (0 = unlimited)
- **`max-wait-time-with-no-agent`**: Max wait when no agents available
- **`max-wait-time-with-no-agent-time-reached`**: Action when max time reached

### Tier Rules
- **`tier-rules-apply`**: Enable tier-based routing
- **`tier-rule-wait-second`**: Wait time between tier levels
- **`tier-rule-wait-multiply-level`**: Multiply wait time by tier level
- **`tier-rule-no-agent-no-wait`**: Skip tier if no agents available

### Call Management
- **`discard-abandoned-after`**: Discard abandoned calls after X seconds

## Agent Management

### Agent Types
- **`callback`**: Agent receives callback when call arrives
- **`uuid-bridge`**: Bridge call directly to agent
- **`uuid-standby`**: Agent waits for calls

### Agent Status
- **`Available`**: Agent can receive calls
- **`On Break`**: Agent temporarily unavailable
- **`Logged Out`**: Agent not available

### Agent Parameters
- **`max-no-answer`**: Maximum unanswered calls
- **`wrap-up-time`**: Time after call before next call
- **`reject-delay-time`**: Delay after rejecting call
- **`busy-delay-time`**: Delay when busy
- **`no-answer-delay-time`**: Delay after no answer

## Testing Queues

### Manual Testing
```bash
# Test queue from CLI
fs_cli -x "originate loopback/2000 &echo"

# Check queue status
fs_cli -x "callcenter_config queue list"

# Check agent status
fs_cli -x "callcenter_config agent list"
```

### Call Flow Testing
1. Call extension 2000 or 2001
2. Should enter queue and play hold music
3. Should ring assigned agent
4. Agent answers call

## Troubleshooting

### Common Issues
- **"Queue not found"**: Check queue name includes `@default` suffix
- **No agents available**: Verify agents are registered and available
- **No hold music**: Check `moh-sound` parameter
- **Calls not routing**: Verify tier assignments

### Debug Commands
```bash
# Check queue status
fs_cli -x "callcenter_config queue list"

# Check agent status
fs_cli -x "callcenter_config agent list"

# Check tier assignments
fs_cli -x "callcenter_config tier list"

# Reload callcenter
fs_cli -x "reload mod_callcenter"
```
