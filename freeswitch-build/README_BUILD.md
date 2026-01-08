# FreeSWITCH Docker Build Guide - Optimized Approach

This setup uses a **two-stage build process** to optimize build times:

1. **Base Image** (`freeswitch-base:latest`) - Contains all dependencies
2. **FreeSWITCH Image** (`freeswitch:latest`) - Builds FreeSWITCH on top of the base

## Why This Approach?

- ✅ **Faster rebuilds**: Dependencies are cached in the base image
- ✅ **Easy dependency updates**: Add dependencies without rebuilding FreeSWITCH
- ✅ **Iterative development**: Rebuild FreeSWITCH quickly while testing

## Quick Start

### Option 1: Build Everything (First Time)

```bash
./build_all.sh
```

This will:
1. Build the base image with all dependencies (5-10 minutes)
2. Build FreeSWITCH on top (20-40 minutes)

### Option 2: Build Step by Step

**Step 1: Build base image (dependencies only)**
```bash
./build_base.sh
```

**Step 2: Build FreeSWITCH**
```bash
./build_freeswitch.sh
```

## Adding Missing Dependencies

If the build fails due to a missing dependency, you can add it without rebuilding everything:

```bash
./add_dependency.sh libzrtp-dev
```

Then rebuild FreeSWITCH:
```bash
./build_freeswitch.sh
```

## Manual Dependency Addition

If you prefer to edit the Dockerfile directly:

1. Edit `Dockerfile.base` and add the package to the `apt-get install` list
2. Rebuild the base image:
   ```bash
   ./build_base.sh
   ```
3. Rebuild FreeSWITCH:
   ```bash
   ./build_freeswitch.sh
   ```

## Workflow Examples

### First Time Build
```bash
# Build everything
./build_all.sh

# If dependency missing, add it
./add_dependency.sh missing-package-name

# Rebuild FreeSWITCH only (fast!)
./build_freeswitch.sh
```

### After Code Changes
```bash
# Only rebuild FreeSWITCH (dependencies already cached)
./build_freeswitch.sh
```

### Adding Multiple Dependencies
```bash
# Edit Dockerfile.base and add packages
nano Dockerfile.base

# Rebuild base image
./build_base.sh

# Rebuild FreeSWITCH
./build_freeswitch.sh
```

## Image Management

### List Images
```bash
docker images | grep freeswitch
```

### Remove Images
```bash
# Remove FreeSWITCH image (keep base)
docker rmi freeswitch:latest

# Remove base image (will need to rebuild)
docker rmi freeswitch-base:latest
```

### Update Base Image
```bash
# Edit Dockerfile.base
# Then rebuild
./build_base.sh
```

## File Structure

```
.
├── Dockerfile.base          # Base image with dependencies
├── Dockerfile               # FreeSWITCH build (uses base)
├── build_base.sh            # Build base image
├── build_freeswitch.sh      # Build FreeSWITCH
├── build_all.sh             # Build everything
├── add_dependency.sh        # Add dependency to base image
└── run.sh                   # Run FreeSWITCH container
```

## Benefits

1. **Time Savings**: Base image rebuilds in 5-10 min vs 30-60 min for full build
2. **Iteration Speed**: Rebuild FreeSWITCH in 20-40 min instead of 30-60 min
3. **Dependency Management**: Easy to add/update dependencies
4. **Caching**: Docker caches the base image layer

## Troubleshooting

### Base image not found
```bash
./build_base.sh
```

### Need to update dependencies
```bash
# Option 1: Use script
./add_dependency.sh package-name

# Option 2: Edit Dockerfile.base
nano Dockerfile.base
./build_base.sh
```

### Clean rebuild
```bash
docker rmi freeswitch:latest freeswitch-base:latest
./build_all.sh
```

