# Docker Cleanup Scripts

This directory contains cleanup scripts to remove Docker resources for a fresh build.

## Scripts

### 1. `cleanup.sh` (Recommended)
**Safe cleanup** - Only removes AllSports-related Docker resources:
- Stops and removes AllSports containers
- Removes AllSports images
- Removes AllSports volumes
- Removes AllSports networks

**Usage:**
```bash
# Make executable (on Linux/VPS)
chmod +x cleanup.sh

# Run the script
./cleanup.sh
```

### 2. `cleanup-aggressive.sh` (Use with caution)
**Aggressive cleanup** - Removes ALL Docker resources on the system:
- Removes ALL containers (not just AllSports)
- Removes ALL images
- Removes ALL volumes
- Removes ALL networks
- Removes build cache

⚠️ **WARNING:** This will remove everything Docker-related on your system!

**Usage:**
```bash
# Make executable (on Linux/VPS)
chmod +x cleanup-aggressive.sh

# Run the script (requires confirmation)
./cleanup-aggressive.sh
```

## Quick Start on VPS

1. **Upload the script to your VPS:**
   ```bash
   scp cleanup.sh user@your-vps:/path/to/allsports/
   ```

2. **SSH into your VPS:**
   ```bash
   ssh user@your-vps
   cd /path/to/allsports
   ```

3. **Make it executable:**
   ```bash
   chmod +x cleanup.sh
   ```

4. **Run the cleanup:**
   ```bash
   ./cleanup.sh
   ```

5. **Rebuild everything:**
   ```bash
   docker-compose up -d --build
   ```

## What Gets Removed

### cleanup.sh (Safe)
- ✅ `allsports-backend` container
- ✅ `allsports-frontend` container
- ✅ All containers with "allsports" in the name
- ✅ All images with "allsports" in the name
- ✅ All volumes with "allsports" in the name
- ✅ All networks with "allsports" in the name

### cleanup-aggressive.sh (Everything)
- ⚠️ ALL containers
- ⚠️ ALL images
- ⚠️ ALL volumes
- ⚠️ ALL networks
- ⚠️ ALL build cache

## Manual Cleanup (Alternative)

If you prefer to do it manually:

```bash
# Stop and remove containers
docker-compose down --rmi all -v --remove-orphans

# Remove AllSports images
docker images | grep allsports | awk '{print $3}' | xargs docker rmi -f

# Remove AllSports volumes
docker volume ls | grep allsports | awk '{print $2}' | xargs docker volume rm

# Remove AllSports networks
docker network ls | grep allsports | awk '{print $1}' | xargs docker network rm

# Full system prune (optional - removes everything unused)
docker system prune -a --volumes -f
```

## Troubleshooting

### Permission Denied
```bash
chmod +x cleanup.sh
```

### Script Not Found
Make sure you're in the project directory:
```bash
cd /path/to/allsports
ls -la cleanup.sh
```

### Docker Not Running
```bash
sudo systemctl start docker
# or
sudo service docker start
```

## After Cleanup

Once cleanup is complete, rebuild everything:

```bash
# Pull latest code (if using git)
git pull

# Rebuild and start
docker-compose up -d --build

# Check logs
docker-compose logs -f
```

