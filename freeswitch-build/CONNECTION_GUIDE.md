# FreeSWITCH to Backend Connection Guide

## Overview
This guide explains how to connect your FreeSWITCH Docker container to the backend NestJS service running in the "asterisk test" directory.

## Architecture

```
External Call → FreeSWITCH (Docker) → Backend WebSocket (mod_audio_stream, Port 9094) → Gemini AI
```

## Configuration

### 1. FreeSWITCH Configuration

The FreeSWITCH container is configured to:
- Use **host networking** mode (shares host's network stack)
- Listen on ports:
  - **5060/5080**: SIP (TCP/UDP)
  - **8021**: Event Socket
  - **16384-32768**: RTP (UDP)

### 2. Backend Service Configuration

Your backend service (`FreeswitchService`) listens on:
- **Port 9094**: WebSocket for `mod_audio_stream` (configurable via `FREESWITCH_AUDIO_SOCKET_PORT`)

### 3. Connection Method

Since `mod_audio_socket` is not available in FreeSWITCH v1.10.10, we use:
- **`mod_audio_stream`** (compiled into FreeSWITCH image)
- **Lua script** (`start_audio_stream.lua`) to start streaming for the current call
- **Dialplan** routes calls to start the stream and keep the call open

## Setup Steps

### Step 1: Ensure Backend is Running (Docker)

Start backend + postgres from the `asterisk test` docker folder:

```bash
cd "C:\Users\csmev\OneDrive\Desktop\asterisk test\docker"
docker compose up -d postgres backend
```

Check that you see:
```
📡 FreeSWITCH mod_audio_stream WebSocket server: ws://0.0.0.0:9094
```

### Step 2: Start FreeSWITCH Container

```bash
cd "C:\Users\csmev\OneDrive\Desktop\freeswitch"
docker compose up -d
```

### Step 3: Test Connection

1. Make a call to your FreeSWITCH DID (e.g., 2200405)
2. The call should be routed to the AI Voice Service
3. Check FreeSWITCH logs:
   ```bash
   docker logs -f freeswitch
   ```
4. Check backend logs for AudioSocket connections

## Dialplan Configuration

### Current Setup

Inbound calls are routed to AI Voice Service via `dialplan/public.xml`:

```xml
<extension name="Inbound_DID_AI">
  <condition field="destination_number" expression="^(.*)$">
    <action application="answer"/>
    <action application="sleep" data="500"/>
    <action application="lua" data="/usr/local/freeswitch/etc/freeswitch/scripts/start_audio_stream.lua $${audio_stream_url} mono 16k"/>
    <action application="hangup"/>
  </condition>
</extension>
```

## Notes (important)

- **`audio_stream_url`**: This is defined in `freeswitch/vars.xml` and used by the dialplan via `$${audio_stream_url}`.
- **Container IP vs localhost**: With FreeSWITCH running in host-network mode, connecting to `ws://127.0.0.1:9094` may not work reliably through Docker port publishing. The most reliable target is the backend container IP (example `ws://172.23.0.3:9094`).
- **Find backend container IP**:

```bash
docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' whizio-backend
```

### To Route to IVR Instead

If you want to route to IVR first, edit `freeswitch/dialplan/public.xml` and:
1. Comment out the `Inbound_DID_AI` extension
2. Uncomment the `Inbound_DID` extension

## Troubleshooting

### Backend Not Receiving Connections

1. **Check if backend is running:**
   ```bash
   netstat -an | findstr 9094
   ```

2. **Check FreeSWITCH can reach backend:**
   ```bash
   docker exec freeswitch ping -c 2 172.17.100.11
   ```

3. **Check FreeSWITCH logs:**
   ```bash
   docker exec freeswitch fs_cli -x "console loglevel 7"
   docker logs -f freeswitch
   ```

### Audio Not Working

1. **Check Lua script is loaded:**
   ```bash
   docker exec freeswitch ls -la /usr/local/freeswitch/etc/freeswitch/scripts/audio_socket_client.lua
   ```

2. **Test Lua script manually:**
   ```bash
   docker exec freeswitch fs_cli -x "lua /usr/local/freeswitch/etc/freeswitch/scripts/audio_socket_client.lua test-uuid 188.93.89.141 9094"
   ```

3. **Check backend logs for connection errors**

### Network Issues

Since using `network_mode: "host"`:
- FreeSWITCH uses the host's network directly
- `172.17.100.11` in the Lua script is the backend service IP
- Backend service must be accessible on `172.17.100.11:9094` from the host

## Alternative: Bridge Network Mode

If you prefer bridge networking:

1. Update `docker-compose.yml`:
   ```yaml
   network_mode: "bridge"  # Change from "host"
   ports:
     - "5060:5060/tcp"
     - "5060:5060/udp"
     - "5080:5080/tcp"
     - "5080:5080/udp"
     - "8021:8021/tcp"
   ```

2. Update Lua script to use backend IP:
   ```lua
   local backend_host = argv[2] or "172.17.100.11"  -- Backend service IP
   ```

3. Ensure backend is accessible from container network

## Environment Variables

Backend service uses:
- `FREESWITCH_AUDIO_SOCKET_PORT`: Port for AudioSocket (default: 9094)
- `AUDIO_SOCKET_HOST`: Host to bind (default: 0.0.0.0)

FreeSWITCH uses:
- `TZ`: Timezone (Asia/Tbilisi)

## Next Steps

1. Test with a real call
2. Monitor logs on both sides
3. Adjust dialplan routing as needed
4. Configure specific DIDs to route to AI or IVR

