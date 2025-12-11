#!/bin/sh

# ============================================
# AllSports Docker Cleanup Script
# ============================================
# This script removes all Docker resources for this project
# to allow building fresh images and containers
# ============================================

echo ""
echo "=== AllSports Docker Cleanup ==="
echo "================================"
echo ""

# Step 1: Stop containers with docker-compose
echo "[1/5] Stopping containers with docker-compose..."
docker-compose down 2>/dev/null || true
docker-compose -f docker-compose.dev.yml down 2>/dev/null || true
echo "      Done."
echo ""

# Step 2: Stop and remove containers
echo "[2/5] Removing containers..."
docker stop allsports-frontend 2>/dev/null || true
docker stop allsports-backend 2>/dev/null || true
docker stop allsports-frontend-dev 2>/dev/null || true
docker stop allsports-backend-dev 2>/dev/null || true
docker rm -f allsports-frontend 2>/dev/null || true
docker rm -f allsports-backend 2>/dev/null || true
docker rm -f allsports-frontend-dev 2>/dev/null || true
docker rm -f allsports-backend-dev 2>/dev/null || true
echo "      Done."
echo ""

# Step 3: Remove images
echo "[3/5] Removing images..."
docker rmi -f allsports2025-frontend 2>/dev/null || true
docker rmi -f allsports2025-backend 2>/dev/null || true
docker rmi -f allsports2025_frontend 2>/dev/null || true
docker rmi -f allsports2025_backend 2>/dev/null || true
echo "      Done."
echo ""

# Step 4: Remove networks
echo "[4/5] Removing networks..."
docker network rm allsports2025_allsports-network 2>/dev/null || true
docker network rm allsports2025_allsports-dev-network 2>/dev/null || true
echo "      Done."
echo ""

# Step 5: Clean up dangling images
echo "[5/5] Cleaning up dangling resources..."
docker image prune -f 2>/dev/null || true
echo "      Done."
echo ""

# Optional: Remove build cache
printf "Remove Docker build cache? (y/N): "
read REPLY
case "$REPLY" in
    [yY]|[yY][eE][sS])
        echo "Removing build cache..."
        docker builder prune -f 2>/dev/null || true
        echo "      Done."
        ;;
esac
echo ""

echo "================================"
echo "Cleanup complete!"
echo ""
echo "To rebuild, run:"
echo "   docker-compose up -d --build"
echo ""
echo "Or for development:"
echo "   docker-compose -f docker-compose.dev.yml up --build"
echo "================================"
echo ""

