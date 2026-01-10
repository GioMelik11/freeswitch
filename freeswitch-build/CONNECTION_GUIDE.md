# FreeSWITCH to Backend Connection Guide

## Overview
This guide explains how to connect your FreeSWITCH Docker container to the backend NestJS service running in the "asterisk test" directory.

## Architecture

```
External Call → FreeSWITCH (Docker) → SIP registrations (sip-rtp-go) → (future) Gemini AI
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

The legacy `mod_audio_stream` WebSocket approach has been removed from this repo. SIP AI is now controlled via `sip-rtp-go` registrations configured in `admin-panel/data/sip-ai.json`.

### 3. Connection Method

We now use:
- **`sip-rtp-go`** to register SIP users and handle calls (echo now; Gemini later)

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

1. Configure SIP AI agents in Admin Panel → SIP AI
2. Call the configured extension(s)
3. Check logs:
   ```bash
   docker logs -f freeswitch
   ```
4. Check `sip-rtp-go` logs:
   ```bash
   docker logs -f sip-rtp-go
   ```

## Dialplan Configuration

### Current Setup

Inbound call routing depends on your trunks/time conditions. SIP AI routing is done by calling the SIP user(s) registered by `sip-rtp-go`.

```xml
<!-- Legacy mod_audio_stream dialplan removed -->
```

## Notes (important)

- The previous `audio_stream_url` / backend IP notes were for the removed `mod_audio_stream` path.

### To Route to IVR Instead

If you want to route to IVR first, edit `freeswitch/dialplan/public.xml` and:
1. Comment out the `Inbound_DID_AI` extension
2. Uncomment the `Inbound_DID` extension

## Troubleshooting

### SIP AI not registering / not answering

1. Check `sip-rtp-go` logs:
   ```bash
   docker logs -f sip-rtp-go
   ```
2. Check registrations in FreeSWITCH:
   ```bash
   docker exec freeswitch fs_cli -x "sofia status profile internal reg"
   ```

3. **Check FreeSWITCH logs:**
   ```bash
   docker exec freeswitch fs_cli -x "console loglevel 7"
   docker logs -f freeswitch
   ```

### Audio not echoing

- If the agent’s `geminiSocketUrl` is **empty**, `sip-rtp-go` should echo audio.
- If it’s **set**, the call is “AI pending” (no echo yet).

### Network notes

This stack uses `network_mode: "host"` for FreeSWITCH and `sip-rtp-go` to simplify SIP/RTP and SDP addressing under WSL2.

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

