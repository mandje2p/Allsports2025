# AllSports Backend

Secure Node.js Express backend for AllSports app. Handles Gemini AI image generation with Firebase authentication.

## Features

- 🔐 **Firebase Authentication Middleware** - Verifies Firebase ID tokens
- 🎨 **Gemini AI Integration** - Server-side image generation (API key secure)
- 🚀 **Express + TypeScript** - Modern, type-safe backend

## Setup

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the `backend` folder:

```bash
# Copy the example (create manually since .env.example may be blocked)
```

Add the following variables to your `.env`:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173

# Gemini API Key
# Get this from: https://makersuite.google.com/app/apikey
GEMINI_API_KEY=your-gemini-api-key-here

# Firebase Service Account Key (JSON string on one line)
FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"..."}
```

### 3. Get Firebase Service Account Key

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Project Settings** (gear icon)
4. Click **Service accounts** tab
5. Click **Generate new private key**
6. Download the JSON file
7. Copy the entire JSON content and paste it as a single line in `FIREBASE_SERVICE_ACCOUNT_KEY`

**Important**: Keep this key secret! Never commit it to git.

### 4. Run the Server

**Development mode** (with hot reload):
```bash
npm run dev
```

**Production build**:
```bash
npm run build
npm start
```

## API Endpoints

All `/api/gemini/*` endpoints require authentication via `Authorization: Bearer <firebaseIdToken>` header.

### Health Check

```
GET /health
```

No authentication required. Returns server status.

### Generate Match Background

```
POST /api/gemini/generate-match-background
```

**Headers:**
```
Authorization: Bearer <firebaseIdToken>
Content-Type: application/json
```

**Body:**
```json
{
  "homeTeam": "PSG",
  "awayTeam": "Real Madrid",
  "style": "stadium"  // or "players"
}
```

**Response:**
```json
{
  "success": true,
  "image": "data:image/png;base64,..."
}
```

### Generate Program Background

```
POST /api/gemini/generate-program-background
```

**Headers:**
```
Authorization: Bearer <firebaseIdToken>
Content-Type: application/json
```

**Body:**
```json
{
  "matchCount": 3
}
```

**Response:**
```json
{
  "success": true,
  "image": "data:image/png;base64,..."
}
```

## Security

- ✅ API keys stored server-side only
- ✅ Firebase ID token verification on all protected routes
- ✅ CORS configured for frontend origin only
- ✅ Rate limiting handled by Gemini service

## Project Structure

```
backend/
├── src/
│   ├── index.ts           # Express server entry
│   ├── config/
│   │   └── firebase.ts    # Firebase Admin SDK setup
│   ├── middleware/
│   │   └── auth.ts        # Authentication middleware
│   ├── routes/
│   │   └── gemini.ts      # Gemini API routes
│   └── services/
│       └── geminiService.ts  # Gemini image generation
├── package.json
├── tsconfig.json
└── .gitignore
```

