#!/bin/bash

# ============================================
# AllSports Docker Cleanup Script
# ============================================
# This script removes all Docker resources for this project
# to allow building fresh images and containers
# ============================================

set -e

echo ""
echo "🧹 AllSports Docker Cleanup"
echo "============================================"
echo ""

# Project name (used by docker-compose)
PROJECT_NAME="allsports2025"

# Container names
CONTAINERS=(
    "allsports-frontend"
    "allsports-backend"
    "allsports-frontend-dev"
    "allsports-backend-dev"
)

# Image names
IMAGES=(
    "${PROJECT_NAME}-frontend"
    "${PROJECT_NAME}-backend"
    "allsports2025-frontend"
    "allsports2025-backend"
)

# Network names
NETWORKS=(
    "${PROJECT_NAME}_allsports-network"
    "${PROJECT_NAME}_allsports-dev-network"
    "allsports2025_allsports-network"
    "allsports2025_allsports-dev-network"
)

# Step 1: Stop and remove containers
echo "📦 Stopping and removing containers..."
for container in "${CONTAINERS[@]}"; do
    if docker ps -a --format '{{.Names}}' | grep -q "^${container}$"; then
        echo "   Removing container: $container"
        docker stop "$container" 2>/dev/null || true
        docker rm -f "$container" 2>/dev/null || true
    fi
done
echo "   ✅ Containers removed"
echo ""

# Step 2: Remove images
echo "🖼️  Removing images..."
for image in "${IMAGES[@]}"; do
    if docker images --format '{{.Repository}}' | grep -q "^${image}$"; then
        echo "   Removing image: $image"
        docker rmi -f "$image" 2>/dev/null || true
    fi
done
echo "   ✅ Images removed"
echo ""

# Step 3: Remove networks
echo "🌐 Removing networks..."
for network in "${NETWORKS[@]}"; do
    if docker network ls --format '{{.Name}}' | grep -q "^${network}$"; then
        echo "   Removing network: $network"
        docker network rm "$network" 2>/dev/null || true
    fi
done
echo "   ✅ Networks removed"
echo ""

# Step 4: Remove dangling images and build cache
echo "🗑️  Cleaning up dangling resources..."
docker image prune -f 2>/dev/null || true
echo "   ✅ Dangling images removed"
echo ""

# Step 5: Optional - Remove build cache
read -p "🔧 Do you want to remove Docker build cache? (y/N): " -n 1 -r
echo ""
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "   Removing build cache..."
    docker builder prune -f 2>/dev/null || true
    echo "   ✅ Build cache removed"
fi
echo ""

echo "============================================"
echo "✅ Cleanup complete!"
echo ""
echo "To rebuild, run:"
echo "   docker-compose up -d --build"
echo ""
echo "Or for development:"
echo "   docker-compose -f docker-compose.dev.yml up --build"
echo "============================================"
echo ""

