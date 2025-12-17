#!/bin/sh

# AllSports Docker Cleanup Script
# This script removes all containers, images, volumes, and networks
# related to the AllSports project for a fresh Docker build

set -e  # Exit on error

echo "=========================================="
echo "AllSports Docker Cleanup Script"
echo "=========================================="
echo ""

# Function to print colored messages (works with both sh and bash)
print_info() {
    printf "\033[0;32m[INFO]\033[0m %s\n" "$1"
}

print_warn() {
    printf "\033[1;33m[WARN]\033[0m %s\n" "$1"
}

print_error() {
    printf "\033[0;31m[ERROR]\033[0m %s\n" "$1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

print_info "Docker is running. Proceeding with cleanup..."
echo ""

# Step 1: Stop and remove containers
print_info "Step 1: Stopping and removing containers..."
if docker-compose ps -q 2>/dev/null | grep -q .; then
    docker-compose down --remove-orphans 2>/dev/null || true
    print_info "✓ Stopped and removed containers via docker-compose"
else
    print_warn "No containers found via docker-compose"
fi

# Also remove containers by name (in case docker-compose wasn't used)
for container in allsports-backend allsports-frontend; do
    if docker ps -a --format '{{.Names}}' 2>/dev/null | grep -q "^${container}$"; then
        print_info "Removing container: ${container}"
        docker stop "${container}" 2>/dev/null || true
        docker rm "${container}" 2>/dev/null || true
        print_info "✓ Removed container: ${container}"
    fi
done

# Remove any containers with "allsports" in the name
ALLSPORTS_CONTAINERS=$(docker ps -a --filter "name=allsports" --format "{{.Names}}" 2>/dev/null || true)
if [ -n "$ALLSPORTS_CONTAINERS" ]; then
    echo "$ALLSPORTS_CONTAINERS" | while IFS= read -r container; do
        if [ -n "$container" ]; then
            print_info "Removing container: ${container}"
            docker stop "${container}" 2>/dev/null || true
            docker rm "${container}" 2>/dev/null || true
        fi
    done
fi

echo ""

# Step 2: Remove images
print_info "Step 2: Removing images..."
ALLSPORTS_IMAGES=$(docker images --filter "reference=*allsports*" --format "{{.Repository}}:{{.Tag}}" 2>/dev/null || true)
if [ -n "$ALLSPORTS_IMAGES" ]; then
    echo "$ALLSPORTS_IMAGES" | while IFS= read -r image; do
        if [ -n "$image" ]; then
            print_info "Removing image: ${image}"
            docker rmi -f "${image}" 2>/dev/null || true
        fi
    done
    print_info "✓ Removed AllSports images"
else
    print_warn "No AllSports images found"
fi

# Also try to remove images built from docker-compose
if docker-compose config > /dev/null 2>&1; then
    docker-compose down --rmi all --remove-orphans 2>/dev/null || true
    print_info "✓ Removed images via docker-compose"
fi

echo ""

# Step 3: Remove volumes
print_info "Step 3: Removing volumes..."
ALLSPORTS_VOLUMES=$(docker volume ls --filter "name=allsports" --format "{{.Name}}" 2>/dev/null || true)
if [ -n "$ALLSPORTS_VOLUMES" ]; then
    echo "$ALLSPORTS_VOLUMES" | while IFS= read -r volume; do
        if [ -n "$volume" ]; then
            print_info "Removing volume: ${volume}"
            docker volume rm "${volume}" 2>/dev/null || true
        fi
    done
    print_info "✓ Removed AllSports volumes"
else
    print_warn "No AllSports volumes found"
fi

# Remove volumes via docker-compose
if docker-compose config > /dev/null 2>&1; then
    docker-compose down -v --remove-orphans 2>/dev/null || true
    print_info "✓ Removed volumes via docker-compose"
fi

echo ""

# Step 4: Remove networks
print_info "Step 4: Removing networks..."
ALLSPORTS_NETWORKS=$(docker network ls --filter "name=allsports" --format "{{.Name}}" 2>/dev/null || true)
if [ -n "$ALLSPORTS_NETWORKS" ]; then
    echo "$ALLSPORTS_NETWORKS" | while IFS= read -r network; do
        if [ -n "$network" ] && [ "$network" != "bridge" ] && [ "$network" != "host" ] && [ "$network" != "none" ]; then
            print_info "Removing network: ${network}"
            docker network rm "${network}" 2>/dev/null || true
        fi
    done
    print_info "✓ Removed AllSports networks"
else
    print_warn "No AllSports networks found"
fi

echo ""

# Step 5: Optional - Docker system prune (commented out by default)
# Uncomment the following section if you want to do a more aggressive cleanup
# This will remove ALL unused containers, networks, images, and build cache

# print_warn "Step 5: Performing Docker system prune (removes ALL unused Docker resources)..."
# printf "Do you want to remove ALL unused Docker resources? (y/N): "
# read REPLY
# if [ "$REPLY" = "y" ] || [ "$REPLY" = "Y" ]; then
#     docker system prune -a --volumes -f
#     print_info "✓ Docker system prune completed"
# else
#     print_info "Skipping system prune"
# fi

echo ""
print_info "=========================================="
print_info "Cleanup completed successfully!"
print_info "=========================================="
echo ""
print_info "You can now run:"
print_info "  docker-compose up -d --build"
echo ""

