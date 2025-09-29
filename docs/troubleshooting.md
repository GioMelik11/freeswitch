# Troubleshooting Guide

## Overview
This guide covers common issues and solutions for FreeSWITCH configuration problems.

## Common Issues

### 1. Extension Registration Issues

#### Problem: "USER_NOT_REGISTERED"
**Symptoms**: Calls to extensions fail with "USER_NOT_REGISTERED"
**Causes**:
- Extension not registered
- Wrong credentials
- Network issues
- SIP profile problems

**Solutions**:
```bash
# Check registrations
fs_cli -x "sofia status profile internal reg"

# Check specific extension
fs_cli -x "sofia status profile internal reg 1001"

# Reload SIP profile
fs_cli -x "sofia profile internal rescan"
```

**Prevention**:
- Verify softphone credentials
- Check network connectivity
- Ensure SIP profile is correct

#### Problem: Extension Shows Offline
**Symptoms**: Extension appears offline in status
**Causes**:
- Softphone not running
- Wrong server settings
- Firewall blocking
- NAT issues

**Solutions**:
1. Check softphone configuration
2. Verify server IP and port
3. Check firewall rules
4. Test network connectivity

### 2. Audio Issues

#### Problem: One-Way Audio
**Symptoms**: Can hear one direction but not the other
**Causes**:
- NAT traversal issues
- Media proxying problems
- Codec mismatches
- RTP port issues

**Solutions**:
```bash
# Check media settings
fs_cli -x "sofia status profile internal"

# Check codecs
fs_cli -x "codec list"

# Check RTP settings
fs_cli -x "rtp list"
```

**Configuration Fixes**:
- Enable media proxying in SIP profiles
- Check NAT settings
- Verify codec preferences
- Check RTP port ranges

#### Problem: No Audio
**Symptoms**: No audio in either direction
**Causes**:
- Codec issues
- RTP problems
- Media settings
- Network issues

**Solutions**:
1. Check codec compatibility
2. Verify RTP settings
3. Check media configuration
4. Test network connectivity

### 3. IVR Issues

#### Problem: "Unable to find menu"
**Symptoms**: `[ERR] mod_dptools.c:2194 Unable to find menu`
**Causes**:
- IVR menu not defined
- mod_ivr not loaded
- Configuration not loaded

**Solutions**:
```bash
# Check IVR menus
fs_cli -x "ivr list"

# Check module status
fs_cli -x "module_exists mod_ivr"

# Reload configuration
fs_cli -x "reloadxml"
```

**Prevention**:
- Ensure IVR menu is defined in `ivr.conf.xml`
- Check mod_ivr is loaded in `modules.conf.xml`
- Verify configuration syntax

#### Problem: No Sound in IVR
**Symptoms**: IVR works but no sound plays
**Causes**:
- Sound file not found
- Wrong file path
- Audio codec issues

**Solutions**:
1. Check sound file exists
2. Verify file path
3. Check audio codecs
4. Test with different sound file

### 4. Queue Issues

#### Problem: "Queue not found"
**Symptoms**: `[WARNING] mod_callcenter.c:3028 Queue queue1@default not found`
**Causes**:
- Queue not defined
- Wrong queue name
- Configuration not loaded

**Solutions**:
```bash
# Check queues
fs_cli -x "callcenter_config queue list"

# Check agents
fs_cli -x "callcenter_config agent list"

# Reload callcenter
fs_cli -x "reload mod_callcenter"
```

**Prevention**:
- Ensure queue is defined in `callcenter.conf.xml`
- Check queue name includes `@default` suffix
- Verify configuration syntax

#### Problem: No Agents Available
**Symptoms**: Calls enter queue but no agents ring
**Causes**:
- Agents not registered
- Wrong tier assignments
- Agent status issues

**Solutions**:
1. Check agent registrations
2. Verify tier assignments
3. Check agent status
4. Test agent availability

### 5. SIP Trunk Issues

#### Problem: Gateway Offline
**Symptoms**: SIP trunk shows offline status
**Causes**:
- Registration failed
- Wrong credentials
- Network issues
- Provider problems

**Solutions**:
```bash
# Check gateway status
fs_cli -x "sofia status gateway"

# Check specific gateway
fs_cli -x "sofia status gateway sip_trunk_provider"

# Reload external profile
fs_cli -x "sofia profile external rescan"
```

**Prevention**:
- Verify provider credentials
- Check network connectivity
- Test with provider
- Monitor registration status

#### Problem: Outbound Calls Fail
**Symptoms**: Cannot make outbound calls
**Causes**:
- Gateway offline
- Wrong dialplan
- Provider restrictions
- Authentication issues

**Solutions**:
1. Check gateway status
2. Verify dialplan patterns
3. Check provider requirements
4. Test authentication

### 6. Configuration Issues

#### Problem: "Configuration parameter not valid"
**Symptoms**: `[WARNING] switch_xml_config.c:437 Configuration parameter [param] is not valid`
**Causes**:
- Invalid parameter name
- Wrong parameter value
- Outdated configuration

**Solutions**:
1. Check parameter documentation
2. Verify parameter syntax
3. Update configuration
4. Remove invalid parameters

#### Problem: Module Not Found
**Symptoms**: `[ERR] Module not found`
**Causes**:
- Module not installed
- Module not loaded
- Wrong module name

**Solutions**:
```bash
# Check loaded modules
fs_cli -x "module_exists mod_name"

# Load module
fs_cli -x "load mod_name"

# Check module list
fs_cli -x "module list"
```

## Debug Commands

### System Status
```bash
# Check system status
fs_cli -x "status"

# Check calls
fs_cli -x "show calls"

# Check registrations
fs_cli -x "sofia status profile internal reg"

# Check gateways
fs_cli -x "sofia status gateway"
```

### Module Status
```bash
# Check specific modules
fs_cli -x "module_exists mod_ivr"
fs_cli -x "module_exists mod_callcenter"
fs_cli -x "module_exists mod_sofia"

# List all modules
fs_cli -x "module list"
```

### Configuration Status
```bash
# Check IVR
fs_cli -x "ivr list"

# Check queues
fs_cli -x "callcenter_config queue list"

# Check agents
fs_cli -x "callcenter_config agent list"

# Check dialplan
fs_cli -x "dialplan default"
```

### Testing Commands
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

## Log Analysis

### Log Levels
- **0**: Console
- **1**: Alert
- **2**: Critical
- **3**: Error
- **4**: Warning
- **5**: Notice
- **6**: Info
- **7**: Debug

### Common Log Messages
- **`USER_NOT_REGISTERED`**: Extension not registered
- **`NO_ROUTE_DESTINATION`**: No dialplan match
- **`CALL_REJECTED`**: Call rejected by destination
- **`NO_ANSWER`**: Destination not answering
- **`NORMAL_CLEARING`**: Call ended normally

### Log Locations
- **Console**: Real-time output
- **Log files**: `/usr/local/freeswitch/log/`
- **CDR**: Call Detail Records

## Prevention Strategies

### Regular Maintenance
1. **Monitor logs**: Check for errors and warnings
2. **Test functionality**: Regular testing of all components
3. **Update configurations**: Keep configurations current
4. **Backup configurations**: Regular backups of working configs

### Best Practices
1. **Test changes**: Test all changes before production
2. **Document changes**: Keep track of all modifications
3. **Use version control**: Track configuration changes
4. **Monitor performance**: Watch system performance metrics

### Security Considerations
1. **Change passwords**: Use strong, unique passwords
2. **Limit access**: Restrict access to configuration files
3. **Monitor calls**: Watch for suspicious call patterns
4. **Update regularly**: Keep FreeSWITCH updated
