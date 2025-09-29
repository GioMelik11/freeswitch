# SIP Trunks Documentation

## Overview
SIP trunks provide connectivity to external telephony providers for inbound and outbound calls.

## Current Configuration

### Active Trunk
- **Name**: `sip_trunk_provider`
- **Provider**: 89.150.1.126
- **Username**: 1054965e4
- **DID**: 2200405
- **Status**: Registered and active

### SIP Profiles
- **Internal**: For extensions (port 5060)
- **External**: For trunks (port 5080)

## Configuration Files

### Gateway Definition
- **File**: `sip_profiles/external/sip_trunk_provider.xml`
- **Purpose**: Defines SIP trunk gateway

### SIP Profiles
- **Internal**: `sip_profiles/internal.xml`
- **External**: `sip_profiles/external.xml`

## Gateway Configuration Example

```xml
<include>
    <gateway name="sip_trunk_provider">
        <param name="username" value="1054965e4"/>
        <param name="realm" value="89.150.1.126"/>
        <param name="password" value="HCXPNV"/>
        <param name="proxy" value="89.150.1.126"/>
        <param name="register-proxy" value="89.150.1.126"/>
        <param name="outbound-proxy" value="89.150.1.126"/>
        <param name="register" value="true"/>
        <param name="register-transport" value="udp"/>
        <param name="retry-seconds" value="30"/>
        <param name="register-timeout" value="20"/>
        <param name="register-retry-timeout" value="20"/>
        <param name="caller-id-in-from" value="true"/>
        <param name="supress-cng" value="true"/>
        <param name="extension" value="2200405"/>
        <param name="from-user" value="1054965e4"/>
        <param name="from-domain" value="89.150.1.126"/>
        <param name="contact-params" value="q=0.1"/>
        <param name="ping" value="25"/>
        <param name="ping-time" value="25"/>
        <param name="ping-max" value="3"/>
        <param name="ping-min" value="3"/>
        <param name="expire-seconds" value="300"/>
        <param name="codec-prefs" value="PCMA,PCMU"/>
        <param name="dtmf-type" value="rfc2833"/>
        <param name="insecure" value="very"/>
        <param name="nat-options" value="auto"/>
    </gateway>
</include>
```

## Adding New SIP Trunks

### 1. Create Gateway File
Create `sip_profiles/external/new_provider.xml`:

```xml
<include>
    <gateway name="new_provider">
        <param name="username" value="your_username"/>
        <param name="realm" value="provider_ip_or_domain"/>
        <param name="password" value="your_password"/>
        <param name="proxy" value="provider_ip_or_domain"/>
        <param name="register-proxy" value="provider_ip_or_domain"/>
        <param name="outbound-proxy" value="provider_ip_or_domain"/>
        <param name="register" value="true"/>
        <param name="register-transport" value="udp"/>
        <param name="retry-seconds" value="30"/>
        <param name="register-timeout" value="20"/>
        <param name="register-retry-timeout" value="20"/>
        <param name="caller-id-in-from" value="true"/>
        <param name="supress-cng" value="true"/>
        <param name="extension" value="your_did_number"/>
        <param name="from-user" value="your_username"/>
        <param name="from-domain" value="provider_ip_or_domain"/>
        <param name="contact-params" value="q=0.1"/>
        <param name="ping" value="25"/>
        <param name="ping-time" value="25"/>
        <param name="ping-max" value="3"/>
        <param name="ping-min" value="3"/>
        <param name="expire-seconds" value="300"/>
        <param name="codec-prefs" value="PCMA,PCMU"/>
        <param name="dtmf-type" value="rfc2833"/>
        <param name="insecure" value="very"/>
        <param name="nat-options" value="auto"/>
    </gateway>
</include>
```

### 2. Update Dialplan
Modify `dialplan/default.xml` to use new gateway:

```xml
<extension name="Outbound_Calls">
  <condition field="destination_number" expression="^9(.*)$">
    <action application="bridge" data="sofia/gateway/new_provider/$1"/>
  </condition>
</extension>
```

### 3. Reload Configuration
```bash
fs_cli -x "reloadxml"
fs_cli -x "sofia profile external rescan"
```

## Gateway Parameters

### Authentication
- **`username`**: SIP username from provider
- **`realm`**: SIP realm (usually provider IP/domain)
- **`password`**: SIP password from provider
- **`from-user`**: Username for outbound calls
- **`from-domain`**: Domain for outbound calls

### Registration
- **`register`**: Enable registration (true/false)
- **`register-proxy`**: Registration proxy server
- **`register-transport`**: Transport protocol (udp/tcp/tls)
- **`retry-seconds`**: Registration retry interval
- **`register-timeout`**: Registration timeout
- **`register-retry-timeout`**: Retry timeout

### Routing
- **`proxy`**: Outbound proxy server
- **`outbound-proxy`**: Outbound proxy for calls
- **`extension`**: DID number from provider

### Quality & Reliability
- **`ping`**: Ping interval for keep-alive
- **`ping-time`**: Ping timeout
- **`ping-max`**: Maximum ping failures
- **`ping-min`**: Minimum ping failures
- **`expire-seconds`**: Registration expiration

### Codecs & Features
- **`codec-prefs`**: Preferred codecs (PCMA,PCMU)
- **`dtmf-type`**: DTMF method (rfc2833/inband/info)
- **`insecure`**: Security level (very/invite/port)
- **`nat-options`**: NAT handling (auto/force-rport)

## SIP Profile Configuration

### Internal Profile
- **Port**: 5060 (standard SIP port)
- **Context**: `default`
- **NAT**: Asterisk-style NAT handling
- **Media**: Proxying enabled for NAT traversal

### External Profile
- **Port**: 5080 (trunk port)
- **Context**: `public`
- **NAT**: Provider-specific settings
- **Media**: Direct media for better quality

## Testing SIP Trunks

### Registration Testing
```bash
# Check gateway status
fs_cli -x "sofia status gateway"

# Check specific gateway
fs_cli -x "sofia status gateway sip_trunk_provider"

# Check registrations
fs_cli -x "sofia status profile external reg"
```

### Call Testing
```bash
# Test outbound call
fs_cli -x "originate loopback/91234567890 &echo"

# Test inbound call
# Call your DID number from external phone
```

### Manual Testing
1. **Outbound**: Dial 9 + number from extension
2. **Inbound**: Call DID from external phone
3. **Check logs**: Monitor FreeSWITCH logs
4. **Verify audio**: Test both directions

## Troubleshooting

### Common Issues
- **"Gateway not found"**: Check gateway name and file location
- **"Registration failed"**: Check credentials and network
- **"No audio"**: Check codecs and NAT settings
- **"Call rejected"**: Check provider requirements

### Debug Commands
```bash
# Check gateway status
fs_cli -x "sofia status gateway"

# Check registrations
fs_cli -x "sofia status profile external reg"

# Check calls
fs_cli -x "show calls"

# Reload profiles
fs_cli -x "sofia profile external rescan"
```

### Registration Issues
1. **Check credentials**: Username, password, realm
2. **Check network**: Firewall, routing, DNS
3. **Check provider**: Server status, requirements
4. **Check logs**: FreeSWITCH logs for errors

### Audio Issues
1. **Check codecs**: Ensure compatible codecs
2. **Check NAT**: Provider NAT requirements
3. **Check RTP**: RTP port ranges and firewall
4. **Check media**: Media proxying settings
