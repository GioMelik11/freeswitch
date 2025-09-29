# Testing Guide

## Overview
This guide provides comprehensive testing procedures for all FreeSWITCH components.

## Pre-Testing Checklist

### System Requirements
- [ ] FreeSWITCH is running
- [ ] All modules are loaded
- [ ] Configurations are loaded
- [ ] Network connectivity is working
- [ ] Softphones are configured and registered

### Test Environment
- [ ] Test in non-production environment first
- [ ] Have backup configurations ready
- [ ] Monitor logs during testing
- [ ] Have rollback plan ready

## Component Testing

### 1. System Status Testing

#### Basic System Check
```bash
# Check FreeSWITCH status
fs_cli -x "status"

# Check loaded modules
fs_cli -x "module list loaded"

# Check calls
fs_cli -x "show calls"

# Check channels
fs_cli -x "show channels"
```

#### Expected Results
- FreeSWITCH shows "UP" status
- Essential modules loaded (mod_sofia, mod_ivr, mod_callcenter)
- No active calls initially
- No active channels initially

### 2. Extension Testing

#### Registration Testing
```bash
# Check registrations
fs_cli -x "sofia status profile internal reg"

# Check specific extension
fs_cli -x "sofia status profile internal reg 1001"
fs_cli -x "sofia status profile internal reg 1003"
```

#### Expected Results
- Extensions 1001 and 1003 show as registered
- Other extensions show as not registered
- Registration shows correct IP and port

#### Call Testing
```bash
# Test internal call
fs_cli -x "originate loopback/1001 &echo"

# Test extension to extension
fs_cli -x "originate user/1001@$${domain} &echo"
```

#### Expected Results
- Calls connect successfully
- Audio works in both directions
- Calls end normally

### 3. SIP Trunk Testing

#### Gateway Status
```bash
# Check gateway status
fs_cli -x "sofia status gateway"

# Check specific gateway
fs_cli -x "sofia status gateway sip_trunk_provider"
```

#### Expected Results
- Gateway shows as "UP" and registered
- Registration shows correct provider details
- No registration errors

#### Outbound Call Testing
```bash
# Test outbound call
fs_cli -x "originate loopback/91234567890 &echo"

# Test with different numbers
fs_cli -x "originate loopback/911234567890 &echo"
```

#### Expected Results
- Calls route through SIP trunk
- Audio works in both directions
- Calls complete successfully

### 4. IVR Testing

#### IVR Status
```bash
# Check IVR menus
fs_cli -x "ivr list"

# Check specific menu
fs_cli -x "ivr list main_ivr"
```

#### Expected Results
- IVR menu "main_ivr" is listed
- Menu shows correct configuration
- No errors in IVR status

#### IVR Functionality
```bash
# Test IVR
fs_cli -x "originate loopback/5000 &echo"
```

#### Expected Results
- IVR answers call
- Welcome message plays
- Menu options work correctly
- Routing to queues works

### 5. Queue Testing

#### Queue Status
```bash
# Check queues
fs_cli -x "callcenter_config queue list"

# Check agents
fs_cli -x "callcenter_config agent list"

# Check tiers
fs_cli -x "callcenter_config tier list"
```

#### Expected Results
- Queues "queue1@default" and "queue2@default" are listed
- Agents 1001 and 1003 are listed
- Tier assignments are correct

#### Queue Functionality
```bash
# Test queue access
fs_cli -x "originate loopback/2000 &echo"
fs_cli -x "originate loopback/2001 &echo"
fs_cli -x "originate loopback/251144 &echo"
fs_cli -x "originate loopback/255431 &echo"
```

#### Expected Results
- Calls enter queues successfully
- Hold music plays
- Agents are notified
- Calls route to agents

## End-to-End Testing

### 1. Inbound Call Flow

#### Test Procedure
1. Call DID number from external phone
2. Verify call reaches FreeSWITCH
3. Check IVR plays welcome message
4. Press "1" for Queue 1
5. Verify call routes to Queue 1
6. Check agent 1001 rings
7. Answer call and verify audio

#### Expected Results
- Call connects successfully
- IVR works correctly
- Queue routing works
- Agent receives call
- Audio works in both directions

### 2. Outbound Call Flow

#### Test Procedure
1. From extension 1001, dial 9 + external number
2. Verify call routes through SIP trunk
3. Check external phone rings
4. Answer call and verify IVR message plays automatically
5. Verify call continues normally between extension and external party
6. Test audio in both directions

#### Expected Results
- Call routes through trunk
- External phone rings
- IVR message plays automatically when answered
- Call continues normally between parties
- Audio works in both directions
- Call completes successfully

### 3. Internal Call Flow

#### Test Procedure
1. From extension 1001, dial 1003
2. Verify call routes internally
3. Check extension 1003 rings
4. Answer call and verify audio
5. Test both directions

#### Expected Results
- Call routes internally
- Extension 1003 rings
- Audio works in both directions
- Call completes successfully

## Performance Testing

### 1. Load Testing

#### Concurrent Calls
```bash
# Test multiple concurrent calls
fs_cli -x "originate loopback/1001 &echo"
fs_cli -x "originate loopback/1003 &echo"
fs_cli -x "originate loopback/5000 &echo"
```

#### Expected Results
- Multiple calls work simultaneously
- No audio quality degradation
- System remains stable

### 2. Stress Testing

#### High Call Volume
- Test with maximum concurrent calls
- Monitor system resources
- Check for errors or failures

#### Expected Results
- System handles load gracefully
- No crashes or failures
- Audio quality maintained

## Troubleshooting Tests

### 1. Error Scenarios

#### Invalid Extensions
```bash
# Test invalid extension
fs_cli -x "originate loopback/9999 &echo"
```

#### Expected Results
- Call fails gracefully
- Appropriate error message
- No system crashes

#### Invalid Numbers
```bash
# Test invalid outbound number
fs_cli -x "originate loopback/9invalid &echo"
```

#### Expected Results
- Call fails gracefully
- Appropriate error message
- No system crashes

### 2. Recovery Testing

#### Module Reload
```bash
# Reload modules
fs_cli -x "reload mod_ivr"
fs_cli -x "reload mod_callcenter"
fs_cli -x "reload mod_sofia"
```

#### Expected Results
- Modules reload successfully
- Functionality restored
- No data loss

#### Configuration Reload
```bash
# Reload configuration
fs_cli -x "reloadxml"
```

#### Expected Results
- Configuration reloads successfully
- All components work
- No errors

## Test Documentation

### Test Results Template
```
Test Date: [DATE]
Test Environment: [ENVIRONMENT]
Tester: [NAME]

Component: [COMPONENT]
Test: [TEST_NAME]
Expected: [EXPECTED_RESULT]
Actual: [ACTUAL_RESULT]
Status: [PASS/FAIL]
Notes: [NOTES]
```

### Test Checklist
- [ ] System status tests
- [ ] Extension registration tests
- [ ] Extension call tests
- [ ] SIP trunk tests
- [ ] Outbound call tests
- [ ] IVR tests
- [ ] Queue tests
- [ ] End-to-end tests
- [ ] Performance tests
- [ ] Error scenario tests
- [ ] Recovery tests

## Best Practices

### Testing Guidelines
1. **Test systematically**: Follow test procedures in order
2. **Document results**: Record all test results
3. **Test edge cases**: Test error scenarios
4. **Monitor performance**: Watch system resources
5. **Verify audio**: Test audio quality
6. **Check logs**: Review logs for errors

### Test Environment
1. **Use test environment**: Never test in production
2. **Backup configurations**: Keep working configs backed up
3. **Monitor logs**: Watch for errors during testing
4. **Test incrementally**: Test one component at a time
5. **Verify rollback**: Ensure rollback procedures work

### Test Data
1. **Use test numbers**: Use non-production numbers
2. **Test with real devices**: Use actual phones when possible
3. **Test different scenarios**: Test various call patterns
4. **Test audio quality**: Verify audio in both directions
5. **Test error handling**: Test failure scenarios
