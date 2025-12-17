#!/bin/bash

# AllSports Docker Aggressive Cleanup Script
# WARNING: This script removes ALL Docker containers, images, volumes, and networks
# Use with caution - it will remove everything, not just AllSports-related resources

set -e  # Exit on error

echo "=========================================="
echo "AllSports Docker AGGRESSIVE Cleanup Script"
echo "=========================================="
echo ""
echo "WARNING: This will remove ALL Docker resources!"
echo "This includes:"
echo "  - All containers (running and stopped)"
echo "  - All images"
echo "  - All volumes"
echo "  - All networks (except default)"
echo "  - All build cache"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Confirmation prompt
read -p "Are you SURE you want to remove ALL Docker resources? Type 'yes' to confirm: " confirmation
if [ "$confirmation" != "yes" ]; then
    print_warn "Cleanup cancelled."
    exit 0
fi

print_info "Starting aggressive cleanup..."
echo ""

# Step 1: Stop all containers
print_info "Step 1: Stopping all containers..."
docker stop $(docker ps -aq) 2>/dev/null || print_warn "No containers to stop"
print_info "✓ Stopped all containers"
echo ""

# Step 2: Remove all containers
print_info "Step 2: Removing all containers..."
docker rm $(docker ps -aq) 2>/dev/null || print_warn "No containers to remove"
print_info "✓ Removed all containers"
echo ""

# Step 3: Remove all images
print_info "Step 3: Removing all images..."
docker rmi -f $(docker images -aq) 2>/dev/null || print_warn "No images to remove"
print_info "✓ Removed all images"
echo ""

# Step 4: Remove all volumes
print_info "Step 4: Removing all volumes..."
docker volume rm $(docker volume ls -q) 2>/dev/null || print_warn "No volumes to remove"
print_info "✓ Removed all volumes"
echo ""

# Step 5: Remove all networks (except default ones)
print_info "Step 5: Removing custom networks..."
docker network prune -f
print_info "✓ Removed custom networks"
echo ""

# Step 6: System prune (removes build cache and everything else)
print_info "Step 6: Performing full system prune..."
docker system prune -a --volumes -f
print_info "✓ System prune completed"
echo ""

print_info "=========================================="
print_info "Aggressive cleanup completed!"
print_info "=========================================="
echo ""
print_info "All Docker resources have been removed."
print_info "You can now run:"
print_info "  docker-compose up -d --build"
echo ""

