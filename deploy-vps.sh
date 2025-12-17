#!/bin/sh

# Quick VPS Deployment Script
# This script cleans, rebuilds, and restarts the Docker containers

set -e

echo "=========================================="
echo "AllSports VPS Deployment Script"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_info() {
    printf "${GREEN}[INFO]${NC} %s\n" "$1"
}

print_warn() {
    printf "${YELLOW}[WARN]${NC} %s\n" "$1"
}

print_error() {
    printf "${RED}[ERROR]${NC} %s\n" "$1"
}

# Check if we're in the right directory
if [ ! -f "docker-compose.yml" ]; then
    print_error "docker-compose.yml not found. Please run this script from the project root."
    exit 1
fi

# Step 1: Cleanup
print_info "Step 1: Cleaning up old containers..."
if [ -f "cleanup.sh" ]; then
    chmod +x cleanup.sh
    ./cleanup.sh
else
    print_warn "cleanup.sh not found, using docker-compose down..."
    docker-compose down --rmi all -v --remove-orphans 2>/dev/null || true
fi

echo ""

# Step 2: Rebuild
print_info "Step 2: Rebuilding containers with latest code..."
docker-compose build --no-cache

echo ""

# Step 3: Start containers
print_info "Step 3: Starting containers..."
docker-compose up -d

echo ""

# Step 4: Wait for containers to start
print_info "Step 4: Waiting for containers to start..."
sleep 5

# Step 5: Check status
print_info "Step 5: Checking container status..."
docker-compose ps

echo ""

# Step 6: Check CORS configuration in logs
print_info "Step 6: Verifying CORS configuration..."
if docker-compose logs backend 2>/dev/null | grep -q "CORS configured to accept all origins"; then
    print_info "✓ CORS is properly configured in backend"
else
    print_warn "⚠ CORS message not found in logs. Check backend logs manually."
fi

echo ""

# Step 7: Check if Nginx needs reloading
print_info "Step 7: Checking Nginx configuration..."
if command -v nginx >/dev/null 2>&1; then
    if sudo nginx -t 2>/dev/null; then
        print_info "Nginx configuration is valid"
        read -p "Do you want to reload Nginx? (y/N): " reload_nginx
        if [ "$reload_nginx" = "y" ] || [ "$reload_nginx" = "Y" ]; then
            sudo systemctl reload nginx
            print_info "✓ Nginx reloaded"
        fi
    else
        print_warn "Nginx configuration test failed. Please check manually."
    fi
else
    print_info "Nginx not found, skipping Nginx reload"
fi

echo ""
print_info "=========================================="
print_info "Deployment completed!"
print_info "=========================================="
echo ""
print_info "Next steps:"
print_info "1. Check backend logs: docker-compose logs -f backend"
print_info "2. Test API: curl https://api.all-sports.co/health"
print_info "3. Check browser console for CORS errors"
echo ""

