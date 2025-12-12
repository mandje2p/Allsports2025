# Firebase Authentication Setup Guide

This guide will help you set up Firebase Authentication for the All Sports Creator app.

## Step 1: Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Follow the setup wizard:
   - Enter a project name
   - Enable/disable Google Analytics (optional)
   - Click "Create project"

## Step 2: Register Your Web App

1. In your Firebase project, click the **Web icon** (`</>`) or go to **Project Settings > General**
2. Under "Your apps", click **Add app** and select **Web**
3. Register your app with a nickname (e.g., "All Sports Creator")
4. Copy the Firebase configuration values

## Step 3: Enable Authentication Methods

1. In Firebase Console, go to **Authentication** > **Sign-in method**
2. Enable the following providers:
   - **Email/Password**: Click "Email/Password", toggle "Enable", click "Save"
   - **Google**: Click "Google", toggle "Enable", enter your support email, click "Save"
   - **Apple**: Click "Apple", toggle "Enable", follow the setup wizard:
     - You'll need an Apple Developer account
     - Configure OAuth redirect URLs
     - Enter your Apple Services ID and other required details

## Step 4: Configure Environment Variables

1. Copy `env.example` to `.env`:
   ```bash
   cp env.example .env
   ```

2. Open `.env` and fill in your Firebase configuration:
   ```env
   VITE_FIREBASE_API_KEY=your-api-key-here
   VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project-id
   VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-messaging-sender-id
   VITE_FIREBASE_APP_ID=your-app-id
   ```

   You can find these values in:
   - Firebase Console > Project Settings > General > Your apps > Web app config

## Step 5: Apple Sign-In Additional Setup

For Apple Sign-In to work, you need:

1. **Apple Developer Account**: Required for OAuth configuration
2. **Services ID**: Create one in [Apple Developer Portal](https://developer.apple.com/account/resources/identifiers/list/serviceId)
3. **Configure in Firebase**:
   - Go to Authentication > Sign-in method > Apple
   - Enter your Services ID
   - Add authorized domains (your Firebase auth domain)
   - Download the OAuth key and upload it to Firebase

## Step 6: Install Dependencies

```bash
npm install
```

## Step 7: Configure Firebase Storage Security Rules

1. In Firebase Console, go to **Storage** > **Rules**
2. Replace the default rules with the following:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    // Allow authenticated users to upload to their own posters folder
    match /posters/{userId}/{posterId}/{allPaths=**} {
      // Only allow uploads if the user is authenticated and matches the userId in the path
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
      allow delete: if request.auth != null && request.auth.uid == userId;
    }
    
    // Deny all other access
    match /{allPaths=**} {
      allow read, write: if false;
    }
  }
}
```

3. Click **Publish** to save the rules

**Important**: These rules ensure that:
- Only authenticated users can access Storage
- Users can only upload/delete files in their own `posters/{userId}/` folder
- Users can read any poster (for Gallery viewing)
- All other paths are denied

## Step 8: Test the Setup

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Try signing up with:
   - Email/Password
   - Google
   - Apple (if configured)

3. Test poster generation and saving to ensure Storage uploads work

## Troubleshooting

### "Firebase: Error (auth/configuration-not-found)"
- Make sure all environment variables are set correctly
- Restart your dev server after changing `.env` file

### "Firebase: Error (auth/operation-not-allowed)"
- The authentication method is not enabled in Firebase Console
- Go to Authentication > Sign-in method and enable the provider

### Apple Sign-In not working
- Verify Apple Services ID is correctly configured
- Check that authorized domains include your Firebase auth domain
- Ensure OAuth key is uploaded to Firebase

### Google Sign-In not working
- Verify Google Sign-In is enabled in Firebase Console
- Check that support email is set in Google provider settings

## Security Notes

- **Never commit `.env` file to version control**
- Add `.env` to your `.gitignore`
- Use different Firebase projects for development and production
- Configure authorized domains in Firebase Console for production

## Production Deployment

When deploying to production:

1. Create a separate Firebase project for production
2. Update environment variables in your hosting platform
3. Add your production domain to Firebase authorized domains
4. Configure OAuth redirect URLs for production domain


