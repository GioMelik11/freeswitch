# Commands Reference

## Overview
This document provides a comprehensive reference for FreeSWITCH CLI commands and procedures.

## Essential Commands

### Configuration Reload
```bash
# Reload entire XML configuration
fs_cli -x "reloadxml"

# Reload specific modules
fs_cli -x "reload mod_callcenter"
fs_cli -x "reload mod_sofia"

# Rescan SIP profiles
fs_cli -x "sofia profile internal rescan"
fs_cli -x "sofia profile external rescan"

# Restart profiles
fs_cli -x "sofia profile internal restart"
fs_cli -x "sofia profile external restart"
```

### System Status
```bash
# Check system status
fs_cli -x "status"

# Check calls
fs_cli -x "show calls"

# Check channels
fs_cli -x "show channels"

# Check registrations
fs_cli -x "sofia status profile internal reg"

# Check gateways
fs_cli -x "sofia status gateway"
```

## Module Commands

### Module Management
```bash
# Check if module exists
fs_cli -x "module_exists mod_ivr"
fs_cli -x "module_exists mod_callcenter"
fs_cli -x "module_exists mod_sofia"

# Load module
fs_cli -x "load mod_ivr"

# Unload module
fs_cli -x "unload mod_ivr"

# List all modules
fs_cli -x "module list"

# List loaded modules
fs_cli -x "module list loaded"
```

### Module Status
```bash
# Check IVR status
fs_cli -x "ivr list"

# Check callcenter status
fs_cli -x "callcenter_config queue list"
fs_cli -x "callcenter_config agent list"
fs_cli -x "callcenter_config tier list"

# Check Sofia status
fs_cli -x "sofia status"
fs_cli -x "sofia status profile internal"
fs_cli -x "sofia status profile external"
```

## SIP Commands

### Registration Management
```bash
# Check internal registrations
fs_cli -x "sofia status profile internal reg"

# Check external registrations
fs_cli -x "sofia status profile external reg"

# Check specific registration
fs_cli -x "sofia status profile internal reg 1001"

# Unregister user
fs_cli -x "sofia profile internal unreg 1001"

# Register user
fs_cli -x "sofia profile internal reg 1001"
```

### Gateway Management
```bash
# Check gateway status
fs_cli -x "sofia status gateway"

# Check specific gateway
fs_cli -x "sofia status gateway sip_trunk_provider"

# Start gateway
fs_cli -x "sofia profile external start gateway sip_trunk_provider"

# Stop gateway
fs_cli -x "sofia profile external stop gateway sip_trunk_provider"

# Restart gateway
fs_cli -x "sofia profile external restart gateway sip_trunk_provider"
```

## Dialplan Commands

### Dialplan Testing
```bash
# Check dialplan
fs_cli -x "dialplan"

# Check specific context
fs_cli -x "dialplan default"

# Check specific extension
fs_cli -x "dialplan default 1001"

# Test dialplan
fs_cli -x "dialplan default 1001"
```

### Call Testing
```bash
# Test internal call
fs_cli -x "originate loopback/1001 &echo"

# Test outbound call
fs_cli -x "originate loopback/91234567890 &echo"

# Test IVR
fs_cli -x "originate loopback/5000 &echo"

# Test queue
fs_cli -x "originate loopback/2000 &echo"

# Test conference
fs_cli -x "originate loopback/3000 &echo"
```

## IVR Commands

### IVR Management
```bash
# List IVR menus
fs_cli -x "ivr list"

# Check specific menu
fs_cli -x "ivr list main_ivr"

# Launch IVR
fs_cli -x "originate loopback/5000 &echo"
```

### IVR Testing
```bash
# Test IVR from CLI
fs_cli -x "originate loopback/5000 &echo"

# Test IVR with specific menu
fs_cli -x "originate loopback/5000 &ivr(main_ivr)"
```

## Call Center Commands

### Queue Management
```bash
# List queues
fs_cli -x "callcenter_config queue list"

# Check specific queue
fs_cli -x "callcenter_config queue list queue1@default"

# Add queue
fs_cli -x "callcenter_config queue add queue3@default"

# Remove queue
fs_cli -x "callcenter_config queue remove queue3@default"
```

### Agent Management
```bash
# List agents
fs_cli -x "callcenter_config agent list"

# Check specific agent
fs_cli -x "callcenter_config agent list 1001@default"

# Add agent
fs_cli -x "callcenter_config agent add 1002@default"

# Remove agent
fs_cli -x "callcenter_config agent remove 1002@default"

# Set agent status
fs_cli -x "callcenter_config agent set status 1001@default Available"
```

### Tier Management
```bash
# List tiers
fs_cli -x "callcenter_config tier list"

# Add tier
fs_cli -x "callcenter_config tier add 1002@default queue1@default 1 1"

# Remove tier
fs_cli -x "callcenter_config tier remove 1002@default queue1@default"
```

## User Management

### User Commands
```bash
# Check if user exists
fs_cli -x "user_exists 1001"

# Get user info
fs_cli -x "user_data 1001@$${domain}"

# Check user status
fs_cli -x "user_status 1001@$${domain}"
```

### Directory Commands
```bash
# Reload directory
fs_cli -x "reload mod_sofia"

# Check directory
fs_cli -x "directory default"
```

## Codec Commands

### Codec Management
```bash
# List codecs
fs_cli -x "codec list"

# Check codec status
fs_cli -x "codec list loaded"

# Load codec
fs_cli -x "load mod_codec_g729"

# Unload codec
fs_cli -x "unload mod_codec_g729"
```

## RTP Commands

### RTP Management
```bash
# List RTP sessions
fs_cli -x "rtp list"

# Check RTP status
fs_cli -x "rtp status"

# Check RTP ports
fs_cli -x "rtp port"
```

## Log Commands

### Log Management
```bash
# Set log level
fs_cli -x "log level 7"

# Check log level
fs_cli -x "log level"

# Enable logging
fs_cli -x "log level 7"

# Disable logging
fs_cli -x "log level 0"
```

### Debug Commands
```bash
# Enable debug
fs_cli -x "debug all"

# Disable debug
fs_cli -x "no debug"

# Check debug status
fs_cli -x "debug"
```

## Testing Procedures

### Complete System Test
```bash
# 1. Check system status
fs_cli -x "status"

# 2. Check registrations
fs_cli -x "sofia status profile internal reg"

# 3. Check gateways
fs_cli -x "sofia status gateway"

# 4. Test internal call
fs_cli -x "originate loopback/1001 &echo"

# 5. Test outbound call
fs_cli -x "originate loopback/91234567890 &echo"

# 6. Test IVR
fs_cli -x "originate loopback/5000 &echo"

# 7. Test queue
fs_cli -x "originate loopback/2000 &echo"
```

### Component Testing
```bash
# Test extensions
fs_cli -x "originate loopback/1001 &echo"
fs_cli -x "originate loopback/1003 &echo"

# Test outbound
fs_cli -x "originate loopback/91234567890 &echo"

# Test IVR
fs_cli -x "originate loopback/5000 &echo"

# Test queues
fs_cli -x "originate loopback/2000 &echo"
fs_cli -x "originate loopback/2001 &echo"
fs_cli -x "originate loopback/251144 &echo"
fs_cli -x "originate loopback/255431 &echo"
```

## Emergency Commands

### System Recovery
```bash
# Restart FreeSWITCH
systemctl restart freeswitch

# Reload all configurations
fs_cli -x "reloadxml"

# Restart all profiles
fs_cli -x "sofia profile internal restart"
fs_cli -x "sofia profile external restart"

# Reload all modules
fs_cli -x "reload mod_sofia"
fs_cli -x "reload mod_ivr"
fs_cli -x "reload mod_callcenter"
```

### Call Management
```bash
# Hangup all calls
fs_cli -x "hupall"

# Hangup specific call
fs_cli -x "uuid_kill <uuid>"

# Transfer call
fs_cli -x "uuid_transfer <uuid> 1001"
```

## Best Practices

### Command Usage
1. **Test first**: Always test commands in non-production
2. **Backup**: Backup configurations before changes
3. **Monitor**: Watch logs after changes
4. **Document**: Keep track of changes made

### Troubleshooting
1. **Check status**: Always check system status first
2. **Check logs**: Review logs for errors
3. **Test components**: Test each component individually
4. **Verify configuration**: Ensure configurations are correct
