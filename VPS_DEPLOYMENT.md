# VPS Deployment Guide - CORS Fix

If you're experiencing CORS errors on your VPS even after updating the backend code, follow these steps:

## Problem

The issue is likely that:
1. The Docker container hasn't been rebuilt with the new code
2. Nginx reverse proxy might be interfering with CORS headers

## Solution Steps

### Step 1: Update Code on VPS

```bash
# SSH into your VPS
ssh user@your-vps

# Navigate to project directory
cd /path/to/allsports

# Pull latest code (if using git)
git pull

# Or manually upload the updated backend/index.js file
```

### Step 2: Clean and Rebuild Docker Containers

```bash
# Run the cleanup script
chmod +x cleanup.sh
./cleanup.sh

# Rebuild everything from scratch
docker-compose up -d --build

# Check logs to verify CORS is working
docker-compose logs backend | grep CORS
```

You should see: `[CORS] CORS configured to accept all origins`

### Step 3: Update Nginx Configuration

If you have Nginx as a reverse proxy in front of your backend, update the configuration:

```bash
# Edit the Nginx config for your API
sudo nano /etc/nginx/sites-available/api.all-sports.co
```

Replace the content with the configuration from `nginx-backend-api.conf` in this repository.

**OR** manually add CORS handling to your existing config:

```nginx
location / {
    # Handle preflight OPTIONS requests
    if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Allow-Origin' '$http_origin' always;
        add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS, PATCH' always;
        add_header 'Access-Control-Allow-Headers' 'Content-Type, Authorization, X-Requested-With, Accept, Origin' always;
        add_header 'Access-Control-Allow-Credentials' 'true' always;
        add_header 'Access-Control-Max-Age' '86400' always;
        return 204;
    }

    # Proxy to backend (keep your existing proxy settings)
    proxy_pass http://localhost:5001;
    # ... rest of your proxy config
}
```

### Step 4: Test and Reload Nginx

```bash
# Test Nginx configuration
sudo nginx -t

# If test passes, reload Nginx
sudo systemctl reload nginx
```

### Step 5: Verify Backend is Running

```bash
# Check if backend container is running
docker-compose ps

# Check backend logs
docker-compose logs backend

# Test the API directly (bypassing Nginx)
curl -X OPTIONS http://localhost:5001/api/profile/test \
  -H "Origin: https://app.all-sports.co" \
  -H "Access-Control-Request-Method: GET" \
  -v

# You should see CORS headers in the response
```

### Step 6: Test CORS from Browser

Open browser console on `https://app.all-sports.co` and check if CORS errors are gone.

## Troubleshooting

### Check if backend has new code

```bash
# Check backend logs for CORS message
docker-compose logs backend | grep -i cors

# Should show: [CORS] CORS configured to accept all origins
```

### Check if Nginx is interfering

```bash
# Test backend directly (bypass Nginx)
curl -I http://localhost:5001/health

# Test through Nginx
curl -I https://api.all-sports.co/health
```

### Force rebuild without cache

```bash
docker-compose build --no-cache backend
docker-compose up -d backend
```

### Check Docker container status

```bash
# List containers
docker-compose ps

# Check if backend is running
docker ps | grep allsports-backend

# Restart if needed
docker-compose restart backend
```

## Quick Fix Script

If you want to do everything at once:

```bash
#!/bin/bash
cd /path/to/allsports
./cleanup.sh
docker-compose up -d --build
sudo nginx -t && sudo systemctl reload nginx
docker-compose logs backend | grep CORS
```

## Verification Checklist

- [ ] Backend code is updated on VPS
- [ ] Docker containers rebuilt with `--build` flag
- [ ] Backend logs show "CORS configured to accept all origins"
- [ ] Nginx config handles OPTIONS requests
- [ ] Nginx reloaded after config change
- [ ] Backend container is running
- [ ] CORS errors are gone in browser console

## Still Having Issues?

1. **Check backend logs:**
   ```bash
   docker-compose logs -f backend
   ```

2. **Test OPTIONS request:**
   ```bash
   curl -X OPTIONS https://api.all-sports.co/api/profile/test \
     -H "Origin: https://app.all-sports.co" \
     -H "Access-Control-Request-Method: GET" \
     -v
   ```

3. **Verify Nginx is passing requests:**
   ```bash
   sudo tail -f /var/log/nginx/error.log
   ```

4. **Check if port 5001 is accessible:**
   ```bash
   netstat -tlnp | grep 5001
   ```

