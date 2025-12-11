# Docker Setup Guide

This guide explains how to build and run AllSports using Docker.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) installed
- [Docker Compose](https://docs.docker.com/compose/install/) installed

## Quick Start

### 1. Configure Environment Variables

```bash
# Copy the example environment file
cp docker.env.example .env
```

Edit `.env` and fill in your values:
- Firebase configuration (from Firebase Console)
- Gemini API key
- Firebase service account key (JSON on one line)

### 2. Build and Run (Production)

```bash
# Build and start all services
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

The app will be available at:
- **Frontend**: http://localhost:5002
- **Backend**: http://localhost:5001

### 3. Development Mode

For development with hot reloading:

```bash
# Start development servers
docker-compose -f docker-compose.dev.yml up

# Stop
docker-compose -f docker-compose.dev.yml down
```

Development URLs:
- **Frontend**: http://localhost:5002
- **Backend**: http://localhost:5001

## Docker Files Overview

| File | Description |
|------|-------------|
| `Dockerfile` | Frontend production build (Nginx) |
| `backend/Dockerfile` | Backend production build (Node.js) |
| `docker-compose.yml` | Production orchestration |
| `docker-compose.dev.yml` | Development with hot reload |
| `nginx.conf` | Nginx config for SPA routing |
| `.dockerignore` | Frontend build exclusions |
| `backend/.dockerignore` | Backend build exclusions |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Docker Network                       │
│                                                          │
│  ┌──────────────────┐      ┌──────────────────┐         │
│  │    Frontend      │      │     Backend      │         │
│  │    (Nginx)       │      │    (Node.js)     │         │
│  │                  │      │                  │         │
│  │  Port 5000 ──────┼──────┼── Port 5001      │         │
│  │                  │ API  │                  │         │
│  │  Static files    │ calls│  Gemini API      │         │
│  │  SPA routing     │      │  Firebase Auth   │         │
│  └──────────────────┘      └──────────────────┘         │
│                                                          │
└─────────────────────────────────────────────────────────┘
           │                          │
           ▼                          ▼
      Browser                   External APIs
    (Port 5000)               (Gemini, Firebase)
```

## Building Individual Images

### Frontend Only

```bash
# Build
docker build -t allsports-frontend \
  --build-arg VITE_FIREBASE_API_KEY=xxx \
  --build-arg VITE_FIREBASE_AUTH_DOMAIN=xxx \
  --build-arg VITE_FIREBASE_PROJECT_ID=xxx \
  --build-arg VITE_FIREBASE_STORAGE_BUCKET=xxx \
  --build-arg VITE_FIREBASE_MESSAGING_SENDER_ID=xxx \
  --build-arg VITE_FIREBASE_APP_ID=xxx \
  --build-arg VITE_BACKEND_URL=http://localhost:5001 \
  .

# Run
docker run -p 5000:80 allsports-frontend
```

### Backend Only

```bash
# Build
cd backend
docker build -t allsports-backend .

# Run
docker run -p 5001:5001 \
  -e GEMINI_API_KEY=xxx \
  -e FIREBASE_SERVICE_ACCOUNT_KEY='{"type":"service_account",...}' \
  -e FRONTEND_URL=http://localhost:5002 \
  allsports-backend
```

## Production Deployment

### Using Docker Compose

1. Update `.env` with production values:
   ```env
   VITE_BACKEND_URL=https://api.yourdomain.com
   FRONTEND_URL=https://yourdomain.com
   ```

2. Deploy:
   ```bash
   docker-compose up -d --build
   ```

### Using Container Registry

1. Build and tag images:
   ```bash
   docker build -t your-registry/allsports-frontend:latest .
   docker build -t your-registry/allsports-backend:latest ./backend
   ```

2. Push to registry:
   ```bash
   docker push your-registry/allsports-frontend:latest
   docker push your-registry/allsports-backend:latest
   ```

3. Deploy on your server using the pushed images.

## Environment Variables Reference

### Frontend (Build-time)

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_FIREBASE_API_KEY` | ✅ | Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | ✅ | Firebase auth domain |
| `VITE_FIREBASE_PROJECT_ID` | ✅ | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | ✅ | Firebase storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | ✅ | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | ✅ | Firebase app ID |
| `VITE_FIREBASE_MEASUREMENT_ID` | ❌ | Firebase analytics ID |
| `VITE_BACKEND_URL` | ✅ | Backend API URL |

### Backend (Runtime)

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | ❌ | Server port (default: 3001) |
| `NODE_ENV` | ❌ | Environment (default: production) |
| `FRONTEND_URL` | ✅ | Frontend URL for CORS |
| `GEMINI_API_KEY` | ✅ | Google Gemini API key |
| `FIREBASE_SERVICE_ACCOUNT_KEY` | ✅ | Firebase service account JSON |

## Troubleshooting

### Container won't start

Check logs:
```bash
docker-compose logs backend
docker-compose logs frontend
```

### Firebase auth errors

Ensure `FIREBASE_SERVICE_ACCOUNT_KEY` is valid JSON on a single line.

### CORS errors

Make sure `FRONTEND_URL` in backend matches where the frontend is served from.

### Build fails

Clear Docker cache and rebuild:
```bash
docker-compose build --no-cache
```

## Health Checks

The backend includes a health check endpoint:

```bash
curl http://localhost:5001/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-12-11T21:00:00.000Z",
  "service": "AllSports Backend"
}
```

