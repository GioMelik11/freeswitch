## sip-rtp-go (minimal SIP REGISTER + RTP echo bot)

This service registers to your FreeSWITCH internal SIP profile as an extension and answers calls by **echoing RTP back over UDP**.

### Default settings (matches this repo)

- **Extension**: `1098`
- **Password**: `1234` (from `freeswitch/vars.xml` → `default_password`)
- **SIP listen (INVITE/UAS)**: `0.0.0.0:5090`
- **SIP register client socket**: `0.0.0.0:5091`
- **RTP listen**: `0.0.0.0:40000`
- **SDP IP**: `127.0.0.1` (works because your containers use `network_mode: host`)

### Run

From WSL Debian (project root):

If you build via the build folder:

```bash
cd sip-rtp-go-build
docker compose up -d --build
```

If you build the image elsewhere, the root `docker-compose.yml` runs it by image name:

```bash
docker compose up -d sip-rtp-go
```

Reload XML (optional, restart also reloads):

```bash
docker exec -it freeswitch fs_cli -x "reloadxml"
```

### Test

1. Register a softphone as **1001** (password `1234`) to your FreeSWITCH.
2. Dial **1098**.
3. You should hear your own voice echoed back.


