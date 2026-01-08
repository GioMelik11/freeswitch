# Quick Start Guide for WSL Debian

This guide will help you build and run FreeSWITCH in Docker using WSL Debian on Windows.

## Prerequisites

1. Make sure Docker is installed in WSL:
   ```bash
   sudo apt-get update
   sudo apt-get install -y docker.io docker-compose
   sudo systemctl start docker
   sudo systemctl enable docker
   ```

2. Add your user to the docker group (optional, to avoid using sudo):
   ```bash
   sudo usermod -aG docker $USER
   # Log out and log back in for this to take effect
   ```

## Step-by-Step Instructions

### 1. Navigate to the project directory

From Windows, the path is:
```
C:\Users\csmev\OneDrive\Desktop\freeswitch
```

In WSL, navigate to:
```bash
cd /mnt/c/Users/csmev/OneDrive/Desktop/freeswitch
```

### 2. Make scripts executable

```bash
chmod +x build.sh run.sh
```

### 3. Build FreeSWITCH Docker Image

**Option A: Using the build script (recommended)**
```bash
sudo ./build.sh
# When prompted for password, enter: 1998
```

**Option B: Using docker-compose directly**
```bash
sudo docker-compose build
# When prompted for password, enter: 1998
```

**Option C: Using docker directly**
```bash
sudo docker build -t freeswitch:latest .
# When prompted for password, enter: 1998
```

**Note:** The build process will take 30-60 minutes. Be patient!

### 4. Run FreeSWITCH

**Option A: Using the run script (recommended)**
```bash
sudo ./run.sh
# When prompted for password, enter: 1998
```

**Option B: Using docker-compose**
```bash
sudo docker-compose up -d
# When prompted for password, enter: 1998
```

**Option C: Using docker directly**
```bash
sudo docker run -d \
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

### 5. Verify FreeSWITCH is Running

```bash
# Check container status
sudo docker ps

# View logs
sudo docker logs -f freeswitch

# Or with docker-compose
sudo docker-compose logs -f
```

### 6. Access FreeSWITCH CLI

```bash
sudo docker exec -it freeswitch fs_cli
```

Once in the CLI, you can run commands like:
- `status` - Check FreeSWITCH status
- `sofia status` - Check SIP status
- `help` - List available commands
- `exit` or `/exit` - Exit the CLI

### 7. Stop FreeSWITCH

```bash
# Using docker-compose
sudo docker-compose down

# Using docker directly
sudo docker stop freeswitch
sudo docker rm freeswitch
```

## Troubleshooting

### Docker daemon not running
```bash
sudo systemctl start docker
```

### Permission denied errors
If you get permission errors, make sure Docker is running:
```bash
sudo systemctl status docker
```

### Port already in use
If ports 5060, 5080, or 8021 are already in use, you can modify the port mappings in `docker-compose.yml` or use different ports in the docker run command.

### Build fails
If the build fails, try:
1. Increase Docker's memory limit (Docker Desktop settings)
2. Build with fewer parallel jobs (edit Dockerfile: change `make -j$(nproc)` to `make -j2`)

## Useful Commands

```bash
# View running containers
sudo docker ps

# View all containers (including stopped)
sudo docker ps -a

# View container logs
sudo docker logs freeswitch

# Follow logs in real-time
sudo docker logs -f freeswitch

# Execute commands in container
sudo docker exec -it freeswitch bash

# Remove container
sudo docker rm freeswitch

# Remove image
sudo docker rmi freeswitch:latest

# Clean up unused Docker resources
sudo docker system prune -a
```

## Next Steps

1. Copy default configuration files (if needed):
   ```bash
   sudo docker cp freeswitch:/usr/local/freeswitch/conf ./freeswitch_conf
   ```

2. Configure FreeSWITCH by editing files in `freeswitch_conf/`

3. Test SIP connectivity using a softphone or SIP client

4. Check the logs directory for FreeSWITCH logs: `freeswitch_logs/`

