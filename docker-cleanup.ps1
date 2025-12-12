# ============================================
# AllSports Docker Cleanup Script (PowerShell)
# ============================================
# This script removes all Docker resources for this project
# to allow building fresh images and containers
# ============================================

Write-Host ""
Write-Host "🧹 AllSports Docker Cleanup" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Project name (used by docker-compose)
$PROJECT_NAME = "allsports2025"

# Container names
$CONTAINERS = @(
    "allsports-frontend",
    "allsports-backend",
    "allsports-frontend-dev",
    "allsports-backend-dev"
)

# Image names
$IMAGES = @(
    "${PROJECT_NAME}-frontend",
    "${PROJECT_NAME}-backend",
    "allsports2025-frontend",
    "allsports2025-backend"
)

# Network names
$NETWORKS = @(
    "${PROJECT_NAME}_allsports-network",
    "${PROJECT_NAME}_allsports-dev-network",
    "allsports2025_allsports-network",
    "allsports2025_allsports-dev-network"
)

# Step 1: Stop and remove containers using docker-compose
Write-Host "📦 Stopping containers with docker-compose..." -ForegroundColor Yellow
docker-compose down 2>$null
docker-compose -f docker-compose.dev.yml down 2>$null
Write-Host ""

# Step 2: Stop and remove any remaining containers
Write-Host "📦 Removing remaining containers..." -ForegroundColor Yellow
foreach ($container in $CONTAINERS) {
    $exists = docker ps -a --format '{{.Names}}' | Where-Object { $_ -eq $container }
    if ($exists) {
        Write-Host "   Removing container: $container"
        docker stop $container 2>$null
        docker rm -f $container 2>$null
    }
}
Write-Host "   ✅ Containers removed" -ForegroundColor Green
Write-Host ""

# Step 3: Remove images
Write-Host "🖼️  Removing images..." -ForegroundColor Yellow
foreach ($image in $IMAGES) {
    $exists = docker images --format '{{.Repository}}' | Where-Object { $_ -eq $image }
    if ($exists) {
        Write-Host "   Removing image: $image"
        docker rmi -f $image 2>$null
    }
}
Write-Host "   ✅ Images removed" -ForegroundColor Green
Write-Host ""

# Step 4: Remove networks
Write-Host "🌐 Removing networks..." -ForegroundColor Yellow
foreach ($network in $NETWORKS) {
    $exists = docker network ls --format '{{.Name}}' | Where-Object { $_ -eq $network }
    if ($exists) {
        Write-Host "   Removing network: $network"
        docker network rm $network 2>$null
    }
}
Write-Host "   ✅ Networks removed" -ForegroundColor Green
Write-Host ""

# Step 5: Remove dangling images
Write-Host "🗑️  Cleaning up dangling resources..." -ForegroundColor Yellow
docker image prune -f 2>$null
Write-Host "   ✅ Dangling images removed" -ForegroundColor Green
Write-Host ""

# Step 6: Optional - Remove build cache
$response = Read-Host "🔧 Do you want to remove Docker build cache? (y/N)"
if ($response -eq 'y' -or $response -eq 'Y') {
    Write-Host "   Removing build cache..."
    docker builder prune -f 2>$null
    Write-Host "   ✅ Build cache removed" -ForegroundColor Green
}
Write-Host ""

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "✅ Cleanup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "To rebuild, run:" -ForegroundColor White
Write-Host "   docker-compose up -d --build" -ForegroundColor Gray
Write-Host ""
Write-Host "Or for development:" -ForegroundColor White
Write-Host "   docker-compose -f docker-compose.dev.yml up --build" -ForegroundColor Gray
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

