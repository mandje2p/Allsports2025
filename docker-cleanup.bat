@echo off
REM ============================================
REM AllSports Docker Cleanup Script (Windows Batch)
REM ============================================
REM This script removes all Docker resources for this project
REM to allow building fresh images and containers
REM ============================================

echo.
echo ======================================
echo   AllSports Docker Cleanup
echo ======================================
echo.

REM Step 1: Stop containers with docker-compose
echo [1/5] Stopping containers with docker-compose...
docker-compose down 2>nul
docker-compose -f docker-compose.dev.yml down 2>nul
echo      Done.
echo.

REM Step 2: Remove containers
echo [2/5] Removing containers...
docker stop allsports-frontend 2>nul
docker stop allsports-backend 2>nul
docker stop allsports-frontend-dev 2>nul
docker stop allsports-backend-dev 2>nul
docker rm -f allsports-frontend 2>nul
docker rm -f allsports-backend 2>nul
docker rm -f allsports-frontend-dev 2>nul
docker rm -f allsports-backend-dev 2>nul
echo      Done.
echo.

REM Step 3: Remove images
echo [3/5] Removing images...
docker rmi -f allsports2025-frontend 2>nul
docker rmi -f allsports2025-backend 2>nul
echo      Done.
echo.

REM Step 4: Remove networks
echo [4/5] Removing networks...
docker network rm allsports2025_allsports-network 2>nul
docker network rm allsports2025_allsports-dev-network 2>nul
echo      Done.
echo.

REM Step 5: Clean up dangling images
echo [5/5] Cleaning up dangling resources...
docker image prune -f 2>nul
echo      Done.
echo.

REM Optional: Remove build cache
set /p CLEANCACHE="Remove Docker build cache? (y/N): "
if /i "%CLEANCACHE%"=="y" (
    echo Removing build cache...
    docker builder prune -f 2>nul
    echo      Done.
)
echo.

echo ======================================
echo   Cleanup complete!
echo ======================================
echo.
echo To rebuild, run:
echo    docker-compose up -d --build
echo.
echo Or for development:
echo    docker-compose -f docker-compose.dev.yml up --build
echo ======================================
echo.

pause

