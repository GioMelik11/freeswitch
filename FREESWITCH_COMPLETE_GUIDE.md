# FreeSWITCH Complete Configuration Guide

## Overview
This guide provides comprehensive instructions for configuring FreeSWITCH with IVRs, queues, extensions, and SIP trunks. Based on the current working configuration.

## Table of Contents
1. [System Architecture](#system-architecture)
2. [File Structure](#file-structure)
3. [Adding Extensions](#adding-extensions)
4. [Adding SIP Trunks](#adding-sip-trunks)
5. [Adding IVR Menus](#adding-ivr-menus)
6. [Adding Call Center Queues](#adding-call-center-queues)
7. [Dialplan Configuration](#dialplan-configuration)
8. [Troubleshooting](#troubleshooting)
9. [Reload Commands](#reload-commands)

## System Architecture

### Current Working Configuration
- **Extensions**: 1001, 1003 (active), 1000, 1002, 1004, 1005 (inactive)
- **SIP Trunk**: `sip_trunk_provider` (89.150.1.126)
- **IVR**: `main_ivr` with 2 options (1→Queue1, 2→Queue2)
- **Queues**: `queue1@default`, `queue2@default`
- **DID**: 2200405 (routes to IVR)

## File Structure

```
freeswitch/
├── freeswitch.xml                 # Main configuration file
├── vars.xml                       # Global variables
├── autoload_configs/              # Auto-loaded configurations
│   ├── ivr.conf.xml              # IVR menu definitions
│   ├── callcenter.conf.xml       # Queue and agent definitions
│   ├── modules.conf.xml          # Module loading
│   └── sofia.conf.xml            # SIP profile settings
├── dialplan/                      # Call routing logic
│   ├── default.xml               # Internal call routing
│   ├── public.xml                # Inbound call routing
│   └── features.xml              # Feature codes
├── directory/                     # User/extension definitions
│   └── default/                  # Default domain users
│       ├── 1001.xml              # Extension 1001
│       ├── 1003.xml              # Extension 1003
│       └── default.xml           # Default user settings
├── sip_profiles/                 # SIP profile configurations
│   ├── internal.xml              # Internal SIP profile
│   ├── external.xml              # External SIP profile
│   └── external/                 # SIP trunk gateways
│       └── sip_trunk_provider.xml # Provider gateway
└── ivr_menus/                    # IVR menu definitions
    └── main_ivr.xml              # Main IVR menu
```

### Removed Components
- **`skinny_profiles/`** - Cisco IP phone support (not needed for SIP)
- **`dialplan/skinny-patterns/`** - Skinny dialplan patterns
- **`lang/`** - Language files (using system defaults)

## Adding Extensions

### 1. Create Extension User File
Create a new file in `directory/default/` (e.g., `1002.xml`):

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

### 2. Update Dialplan (if needed)
Extensions 1000-1099 are automatically handled by the `Local_Extension` pattern in `dialplan/default.xml`.

### 3. Reload Configuration
```bash
fs_cli -x "reloadxml"
fs_cli -x "reload mod_sofia"
```

## Adding SIP Trunks

### 1. Create Gateway File
Create a new file in `sip_profiles/external/` (e.g., `new_provider.xml`):

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

### 2. Update Outbound Dialplan
Modify `dialplan/default.xml` to use the new gateway:

```xml
<!-- Outbound Calls (9 + number) -->
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

## Adding IVR Menus

### 1. Edit IVR Configuration
Modify `autoload_configs/ivr.conf.xml`:

```xml
<configuration name="ivr.conf" description="IVR menus">
  <menus>
    <!-- Existing menu -->
    <menu name="main_ivr" greet-long="/usr/share/freeswitch/sounds/ivr/incoming.wav" 
          greet-short="/usr/share/freeswitch/sounds/ivr/incoming.wav" 
          invalid-sound="/usr/share/freeswitch/sounds/ivr/incoming.wav" 
          exit-sound="/usr/share/freeswitch/sounds/ivr/voicemail/incoming.wav" 
          timeout="15000" inter-digit-timeout="3000" 
          max-failures="3" max-timeouts="3" digit-len="1">
      <entry action="menu-exec-app" digits="1" param="transfer 251144 XML default"/>
      <entry action="menu-exec-app" digits="2" param="transfer 255431 XML default"/>
    </menu>
    
    <!-- New menu example -->
    <menu name="support_ivr" greet-long="/usr/share/freeswitch/sounds/ivr/support.wav" 
          timeout="10000" digit-len="1">
      <entry action="menu-exec-app" digits="1" param="transfer 2000 XML default"/>
      <entry action="menu-exec-app" digits="2" param="transfer 2001 XML default"/>
      <entry action="menu-exec-app" digits="0" param="transfer operator XML default"/>
    </menu>
  </menus>
</configuration>
```

### 2. Add IVR Access to Dialplan
Add to `dialplan/default.xml`:

```xml
<!-- New IVR Access -->
<extension name="Support_IVR">
  <condition field="destination_number" expression="^5001$">
    <action application="answer"/>
    <action application="sleep" data="1000"/>
    <action application="ivr" data="support_ivr"/>
  </condition>
</extension>
```

### 3. Reload Configuration
```bash
fs_cli -x "reloadxml"
```

## Adding Call Center Queues

### 1. Edit Queue Configuration
Modify `autoload_configs/callcenter.conf.xml`:

```xml
<configuration name="callcenter.conf" description="CallCenter">
  <settings>
    <param name="dbname" value="/dev/shm/callcenter.db"/>
    <param name="cc-instance-id" value="single_box"/>
  </settings>

  <queues>
    <!-- Existing queues -->
    <queue name="queue1@default">
      <param name="strategy" value="ring-all"/>
      <param name="moh-sound" value="local_stream://moh"/>
      <!-- ... other params ... -->
    </queue>
    
    <!-- New queue example -->
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
      <param name="abandon-resume-allowed" value="false"/>
    </queue>
  </queues>

  <!-- Add new agent -->
  <agents>
    <!-- Existing agents -->
    <agent name="1001@default" type="callback" contact="user/1001@$${domain}" status="Available"/>
    <agent name="1003@default" type="callback" contact="user/1003@$${domain}" status="Available"/>
    
    <!-- New agent -->
    <agent name="1002@default" type="callback" contact="user/1002@$${domain}" status="Available"/>
  </agents>

  <!-- Add tier assignments -->
  <tiers>
    <!-- Existing tiers -->
    <tier agent="1001@default" queue="queue1@default" level="1" position="1"/>
    <tier agent="1003@default" queue="queue2@default" level="1" position="1"/>
    
    <!-- New tier -->
    <tier agent="1002@default" queue="queue3@default" level="1" position="1"/>
  </tiers>
</configuration>
```

### 2. Add Queue Access to Dialplan
Add to `dialplan/default.xml`:

```xml
<!-- New Queue Access -->
<extension name="Queue_3">
  <condition field="destination_number" expression="^2002$">
    <action application="answer"/>
    <action application="callcenter" data="queue3@default"/>
  </condition>
</extension>
```

### 3. Reload Configuration
```bash
fs_cli -x "reloadxml"
fs_cli -x "reload mod_callcenter"
```

## Dialplan Configuration

### Key Patterns in `dialplan/default.xml`

#### Local Extensions (1000-1099)
```xml
<extension name="Local_Extension">
  <condition field="destination_number" expression="^(10[0-9][0-9])$">
    <action application="bridge" data="user/${dialed_extension}@${domain_name}"/>
  </condition>
</extension>
```

#### Outbound Calls (9 + number)
```xml
<extension name="Outbound_Calls">
  <condition field="destination_number" expression="^9(.*)$">
    <action application="bridge" data="sofia/gateway/sip_trunk_provider/$1"/>
  </condition>
</extension>
```

#### IVR Access
```xml
<extension name="IVR_Main">
  <condition field="destination_number" expression="^5000$">
    <action application="ivr" data="main_ivr"/>
  </condition>
</extension>
```

#### Queue Access
```xml
<extension name="Queue_1">
  <condition field="destination_number" expression="^2000$">
    <action application="callcenter" data="queue1@default"/>
  </condition>
</extension>
```

### Key Patterns in `dialplan/public.xml`

#### Inbound DID Routing
```xml
<extension name="Inbound_DID">
  <condition field="destination_number" expression="^(.*)$">
    <action application="transfer" data="5000 XML default"/>
  </condition>
</extension>
```

## Troubleshooting

### Common Issues and Solutions

#### 1. "Unable to find menu" Error
**Problem**: `[ERR] mod_dptools.c:2194 Unable to find menu`
**Solution**: 
- Ensure `mod_ivr` is loaded in `autoload_configs/modules.conf.xml`
- Check IVR menu is defined in `autoload_configs/ivr.conf.xml`
- Reload configuration: `fs_cli -x "reloadxml"`

#### 2. "Queue not found" Error
**Problem**: `[WARNING] mod_callcenter.c:3028 Queue queue1@default not found`
**Solution**:
- Check queue is defined in `autoload_configs/callcenter.conf.xml`
- Ensure queue name includes `@default` suffix
- Reload callcenter: `fs_cli -x "reload mod_callcenter"`

#### 3. Extension Not Registering
**Problem**: Extension shows as offline
**Solution**:
- Check user file exists in `directory/default/`
- Verify password in user file matches softphone
- Check SIP profile settings in `sip_profiles/internal.xml`

#### 4. One-Way Audio
**Problem**: Can hear one direction but not the other
**Solution**:
- Check NAT settings in SIP profiles
- Verify media proxying settings
- Check firewall rules for RTP ports

#### 5. SIP Trunk Not Registering
**Problem**: Gateway shows as offline
**Solution**:
- Verify credentials in gateway file
- Check network connectivity to provider
- Review provider's requirements (codecs, DTMF, etc.)

### Debug Commands

```bash
# Check module status
fs_cli -x "module_exists mod_ivr"
fs_cli -x "module_exists mod_callcenter"

# Check IVR menus
fs_cli -x "ivr list"

# Check queues
fs_cli -x "callcenter_config queue list"

# Check agents
fs_cli -x "callcenter_config agent list"

# Check gateways
fs_cli -x "sofia status gateway"

# Check registrations
fs_cli -x "sofia status profile internal reg"

# Check calls
fs_cli -x "show calls"
```

## Reload Commands

### Essential Reload Commands
```bash
# Reload entire XML configuration
fs_cli -x "reloadxml"

# Reload specific modules
fs_cli -x "reload mod_ivr"
fs_cli -x "reload mod_callcenter"
fs_cli -x "reload mod_sofia"

# Rescan SIP profiles
fs_cli -x "sofia profile internal rescan"
fs_cli -x "sofia profile external rescan"

# Restart specific profiles
fs_cli -x "sofia profile internal restart"
fs_cli -x "sofia profile external restart"
```

### Testing Commands
```bash
# Test IVR
fs_cli -x "originate loopback/5000 &echo"

# Test queue
fs_cli -x "originate loopback/2000 &echo"

# Test extension
fs_cli -x "originate loopback/1001 &echo"

# Test outbound
fs_cli -x "originate loopback/91234567890 &echo"
```

## Best Practices

### 1. Configuration Management
- Always backup configurations before changes
- Test changes in a non-production environment
- Use version control for configuration files
- Document all customizations

### 2. Security
- Use strong passwords for extensions
- Implement ACLs for SIP profiles
- Regular security updates
- Monitor logs for suspicious activity

### 3. Performance
- Monitor system resources
- Optimize codec preferences
- Use appropriate queue strategies
- Regular maintenance and cleanup

### 4. Monitoring
- Set up log monitoring
- Monitor call quality metrics
- Track queue performance
- Monitor system health

This guide provides a complete reference for managing FreeSWITCH configurations. Always test changes thoroughly and maintain backups of working configurations.
