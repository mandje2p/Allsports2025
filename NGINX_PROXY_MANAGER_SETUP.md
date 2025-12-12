# Nginx Proxy Manager Setup Guide

This guide explains how to set up AllSports with Nginx Proxy Manager (NPM).

## Architecture

```
Internet
    │
    ▼
┌─────────────────────────────────┐
│    Nginx Proxy Manager          │
│                                 │
│  app.yourdomain.com ──────┐     │
│  api.yourdomain.com ──────┼──┐  │
│                           │  │  │
└───────────────────────────┼──┼──┘
                            │  │
    ┌───────────────────────┘  │
    │  ┌───────────────────────┘
    ▼  ▼
┌─────────────────────────────────┐
│         Docker Network          │
│                                 │
│  ┌─────────────┐ ┌────────────┐ │
│  │  Frontend   │ │  Backend   │ │
│  │  :5004      │ │  :5001     │ │
│  └─────────────┘ └────────────┘ │
│                                 │
└─────────────────────────────────┘
```

## Step 1: Configure Environment Variables

In your `.env` file, set the backend URL to your API domain:

```env
# Your domains (examples)
# Frontend: https://app.yourdomain.com
# Backend:  https://api.yourdomain.com

VITE_BACKEND_URL=https://api.yourdomain.com
FRONTEND_URL=https://app.yourdomain.com
```

## Step 2: Build and Run Docker Containers

```bash
# Clean previous builds
sh docker-cleanup.sh

# Build and start
docker-compose up -d --build
```

Containers will be running on:
- Frontend: `your-server-ip:5004`
- Backend: `your-server-ip:5001`

## Step 3: Configure Nginx Proxy Manager

### Proxy Host 1: Frontend (app.yourdomain.com)

1. Go to NPM Dashboard → **Proxy Hosts** → **Add Proxy Host**

2. **Details tab:**
   | Field | Value |
   |-------|-------|
   | Domain Names | `app.yourdomain.com` |
   | Scheme | `http` |
   | Forward Hostname / IP | `your-server-ip` or `host.docker.internal` |
   | Forward Port | `5004` |
   | Cache Assets | ✅ Enabled |
   | Block Common Exploits | ✅ Enabled |
   | Websockets Support | ❌ Not needed |

3. **SSL tab:**
   | Field | Value |
   |-------|-------|
   | SSL Certificate | Request a new SSL Certificate |
   | Force SSL | ✅ Enabled |
   | HTTP/2 Support | ✅ Enabled |

4. Click **Save**

---

### Proxy Host 2: Backend API (api.yourdomain.com)

1. Go to NPM Dashboard → **Proxy Hosts** → **Add Proxy Host**

2. **Details tab:**
   | Field | Value |
   |-------|-------|
   | Domain Names | `api.yourdomain.com` |
   | Scheme | `http` |
   | Forward Hostname / IP | `your-server-ip` or `host.docker.internal` |
   | Forward Port | `5001` |
   | Cache Assets | ❌ Disabled (API responses shouldn't be cached) |
   | Block Common Exploits | ✅ Enabled |
   | Websockets Support | ❌ Not needed |

3. **SSL tab:**
   | Field | Value |
   |-------|-------|
   | SSL Certificate | Request a new SSL Certificate |
   | Force SSL | ✅ Enabled |
   | HTTP/2 Support | ✅ Enabled |

4. **Advanced tab** - Add custom config for CORS and large payloads:
   ```nginx
   # Allow large payloads for image uploads
   client_max_body_size 50M;
   
   # Timeout for AI image generation (can take a while)
   proxy_read_timeout 300s;
   proxy_connect_timeout 75s;
   ```

5. Click **Save**

---

## Step 4: Update Firebase Auth Domain

Add your frontend domain to Firebase authorized domains:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Authentication** → **Settings** → **Authorized domains**
4. Add `app.yourdomain.com`

---

## Step 5: Test the Setup

1. **Test Frontend:**
   ```
   https://app.yourdomain.com
   ```

2. **Test Backend Health:**
   ```bash
   curl https://api.yourdomain.com/health
   ```
   
   Expected response:
   ```json
   {"status":"ok","timestamp":"...","service":"AllSports Backend"}
   ```

---

## Troubleshooting

### CORS Errors

If you see CORS errors in browser console, make sure:

1. `FRONTEND_URL` in `.env` matches your frontend domain exactly:
   ```env
   FRONTEND_URL=https://app.yourdomain.com
   ```

2. Rebuild the backend:
   ```bash
   docker-compose up -d --build backend
   ```

### API Timeout Errors

For slow AI image generation, add to NPM Advanced config:
```nginx
proxy_read_timeout 300s;
```

### Firebase Auth Not Working

Make sure your domain is added to Firebase authorized domains (Step 4).

### SSL Certificate Issues

1. Make sure your domain DNS points to your server
2. Wait a few minutes for DNS propagation
3. Try requesting the certificate again in NPM

---

## Alternative: Same Domain with Path-Based Routing

If you prefer using a single domain (e.g., `app.yourdomain.com/api`):

1. Create only one proxy host for `app.yourdomain.com` → port `5004`

2. In NPM **Advanced tab**, add:
   ```nginx
   location /api/ {
       proxy_pass http://your-server-ip:5001/api/;
       proxy_http_version 1.1;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
       proxy_read_timeout 300s;
       client_max_body_size 50M;
   }
   ```

3. Update `.env`:
   ```env
   VITE_BACKEND_URL=https://app.yourdomain.com
   FRONTEND_URL=https://app.yourdomain.com
   ```

4. Rebuild:
   ```bash
   docker-compose up -d --build
   ```

