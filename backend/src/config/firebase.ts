import admin from 'firebase-admin';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

// Initialize Firebase Admin SDK
// You can provide credentials in two ways:
// 1. FIREBASE_SERVICE_ACCOUNT_KEY - JSON string of the service account key
// 2. FIREBASE_SERVICE_ACCOUNT_PATH - Path to the service account JSON file

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;

let parsedServiceAccount: admin.ServiceAccount | null = null;

// Try to load from file path first
if (serviceAccountPath) {
  try {
    const fullPath = path.resolve(serviceAccountPath);
    const fileContent = fs.readFileSync(fullPath, 'utf-8');
    parsedServiceAccount = JSON.parse(fileContent);
    console.log('✅ Loaded Firebase credentials from file:', serviceAccountPath);
  } catch (error: any) {
    console.error('Failed to load service account from file:', error.message);
  }
}

// Fall back to environment variable
if (!parsedServiceAccount && serviceAccountKey) {
  try {
    // Handle different formats:
    // 1. Already valid JSON
    // 2. JSON with escaped newlines in private_key
    // 3. Base64 encoded JSON
    let jsonString = serviceAccountKey.trim();
    
    // Check if it's base64 encoded
    if (!jsonString.startsWith('{')) {
      try {
        jsonString = Buffer.from(jsonString, 'base64').toString('utf-8');
      } catch {
        // Not base64, continue with original string
      }
    }
    
    // Remove surrounding quotes if present (common copy-paste issue)
    if ((jsonString.startsWith('"') && jsonString.endsWith('"')) ||
        (jsonString.startsWith("'") && jsonString.endsWith("'"))) {
      jsonString = jsonString.slice(1, -1);
    }
    
    // Replace escaped newlines in private_key
    jsonString = jsonString.replace(/\\\\n/g, '\\n');
    
    parsedServiceAccount = JSON.parse(jsonString);
    console.log('✅ Loaded Firebase credentials from environment variable');
  } catch (error: any) {
    console.error('');
    console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY');
    console.error('   Error:', error.message);
    console.error('');
    console.error('   Make sure the JSON is valid. You can either:');
    console.error('   1. Use FIREBASE_SERVICE_ACCOUNT_PATH=/path/to/serviceAccount.json');
    console.error('   2. Or set FIREBASE_SERVICE_ACCOUNT_KEY to the JSON content');
    console.error('');
    console.error('   Tip: Download the key from Firebase Console:');
    console.error('   Project Settings > Service accounts > Generate new private key');
    console.error('');
  }
}

if (!parsedServiceAccount) {
  console.error('');
  console.error('❌ Firebase service account not configured');
  console.error('');
  console.error('   Set one of these in your .env file:');
  console.error('   - FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json');
  console.error('   - FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}');
  console.error('');
  process.exit(1);
}

try {
  admin.initializeApp({
    credential: admin.credential.cert(parsedServiceAccount),
  });
  
  console.log('✅ Firebase Admin SDK initialized');
} catch (error: any) {
  console.error('Failed to initialize Firebase Admin SDK:', error.message);
  process.exit(1);
}

export const auth = admin.auth();
export default admin;


