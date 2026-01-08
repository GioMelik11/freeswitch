# FreeSWITCH Docker Setup

This repository contains a Docker setup for building and running FreeSWITCH from source.

## Prerequisites

- Docker installed on your system
- Docker Compose (optional, but recommended)
- WSL Debian (for Windows users)

## Building FreeSWITCH Docker Image

### Option 1: Using Docker Compose (Recommended)

```bash
docker-compose build
```

### Option 2: Using Docker directly

```bash
docker build -t freeswitch:latest .
```

**Note:** The build process can take 30-60 minutes depending on your system resources, as it compiles FreeSWITCH from source.

## Running FreeSWITCH

### Option 1: Using Docker Compose

```bash
docker-compose up -d
```

### Option 2: Using Docker directly

```bash
docker run -d \
  --name freeswitch \
  -p 5060:5060/tcp -p 5060:5060/udp \
  -p 5080:5080/tcp -p 5080:5080/udp \
  -p 8021:8021/tcp \
  -p 16384-32768:16384-32768/udp \
  -v $(pwd)/freeswitch_conf:/usr/local/freeswitch/conf \
  -v $(pwd)/freeswitch_logs:/usr/local/freeswitch/log \
  -v $(pwd)/freeswitch_recordings:/usr/local/freeswitch/recordings \
  -v $(pwd)/freeswitch_storage:/usr/local/freeswitch/storage \
  freeswitch:latest
```

## Accessing FreeSWITCH

- **SIP Ports:** 5060 (TCP/UDP) and 5080 (TCP/UDP)
- **Event Socket Interface:** 8021 (TCP)
- **RTP Ports:** 16384-32768 (UDP)

### Connecting via Event Socket Interface (FS CLI)

```bash
docker exec -it freeswitch fs_cli
```

Or from outside the container:

```bash
docker exec -it freeswitch bin/fs_cli -H localhost
```

## Viewing Logs

```bash
# Using Docker Compose
docker-compose logs -f

# Using Docker directly
docker logs -f freeswitch
```

## Stopping FreeSWITCH

```bash
# Using Docker Compose
docker-compose down

# Using Docker directly
docker stop freeswitch
docker rm freeswitch
```

## Configuration Files

Configuration files are mounted from the `freeswitch_conf` directory. If the directory doesn't exist, Docker will create it, but you may need to copy the default configuration:

```bash
docker cp freeswitch:/usr/local/freeswitch/conf ./freeswitch_conf
```

## Building Specific FreeSWITCH Version

To build a specific version, edit the Dockerfile and change the git checkout line:

```dockerfile
RUN git checkout v1.10.10
```

Replace `v1.10.10` with your desired version tag.

## Troubleshooting

### Build fails due to memory
If the build fails, try building with fewer parallel jobs:

```dockerfile
RUN make -j2  # Instead of make -j$(nproc)
```

### Port conflicts
If ports are already in use, modify the port mappings in `docker-compose.yml` or the docker run command.

### Permission issues
The container runs as the `freeswitch` user. If you encounter permission issues with mounted volumes, ensure proper permissions:

```bash
sudo chown -R 999:999 freeswitch_conf freeswitch_logs freeswitch_recordings freeswitch_storage
```

## Notes

- The build process compiles FreeSWITCH from source, which includes many modules and dependencies
- The image is based on Debian Bullseye (slim)
- FreeSWITCH runs as a non-root user for security
- RTP ports (16384-32768) are exposed for media handling

