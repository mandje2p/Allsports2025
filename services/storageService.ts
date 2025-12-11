
import { Match } from "../types";
import { auth, db, storage } from "../config/firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  serverTimestamp,
  Timestamp,
  FieldValue
} from 'firebase/firestore';
import {
  ref,
  uploadString,
  getDownloadURL,
  deleteObject
} from 'firebase/storage';

export interface SavedPoster {
  id: string;
  match: Match;
  backgroundImage: string;
  finalPosterUrl?: string;
  style: 'stadium' | 'players';
  type?: 'program' | 'classic';
  createdAt: number | Timestamp | FieldValue;
  matchDate: string; // ISO date string for filtering
  userId: string; // User ID who owns this poster
}

/**
 * Check if user is authenticated before allowing storage operations
 */
const requireAuth = () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Authentication required. Please log in to access your gallery.");
  }
  return user;
};

/**
 * Get the current date in YYYY-MM-DD format for comparison
 */
const getTodayDateString = (): string => {
  return new Date().toISOString().split('T')[0];
};

/**
 * Check if a poster's match date has passed
 */
const isDatePassed = (matchDate: string): boolean => {
  const today = getTodayDateString();
  return matchDate < today;
};

/**
 * Check if a string is a base64 data URL
 */
const isBase64DataUrl = (url: string): boolean => {
  return url.startsWith('data:image/');
};

/**
 * Check if a URL is from Firebase Storage
 */
const isStorageUrl = (url: string): boolean => {
  return url.includes('firebasestorage.googleapis.com') || url.includes('/o/');
};

/**
 * Extract Storage path from a download URL
 * Firebase Storage download URLs have format:
 * https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?alt=media&token={token}
 */
const extractStoragePath = (downloadUrl: string): string | null => {
  try {
    // Extract the path from the URL
    // The pathname is: /v0/b/{bucket}/o/{encoded-path}
    // The query string (?alt=media&token=xxx) is NOT part of pathname
    const urlObj = new URL(downloadUrl);
    
    // Match /o/ followed by the encoded path (without the query string which is separate)
    const pathMatch = urlObj.pathname.match(/\/o\/(.+)$/);
    if (pathMatch && pathMatch[1]) {
      // Decode the path (it's URL encoded, e.g., %2F for /)
      const decodedPath = decodeURIComponent(pathMatch[1]);
      console.log("[Storage] Extracted path:", decodedPath);
      return decodedPath;
    }
    
    console.warn("[Storage] Could not extract path from pathname:", urlObj.pathname);
    return null;
  } catch (error) {
    console.warn("[Storage] Failed to extract storage path from URL:", downloadUrl, error);
    return null;
  }
};

/**
 * Delete an image from Firebase Storage if it's a Storage URL
 */
const deleteImageFromStorage = async (imageUrl: string | undefined): Promise<void> => {
  if (!imageUrl) {
    console.log("[Storage] No image URL provided, skipping deletion");
    return;
  }
  
  if (!isStorageUrl(imageUrl)) {
    console.log("[Storage] Not a Firebase Storage URL, skipping:", imageUrl.substring(0, 50) + "...");
    return;
  }

  console.log("[Storage] Attempting to delete image from Storage:", imageUrl.substring(0, 100) + "...");

  try {
    const storagePath = extractStoragePath(imageUrl);
    if (storagePath) {
      console.log("[Storage] Deleting file at path:", storagePath);
      const storageRef = ref(storage, storagePath);
      await deleteObject(storageRef);
      console.log("[Storage] Successfully deleted:", storagePath);
    } else {
      console.warn("[Storage] Could not extract path from URL:", imageUrl);
    }
  } catch (error: any) {
    // Ignore errors if file doesn't exist (already deleted)
    if (error.code === 'storage/object-not-found') {
      console.log("[Storage] File already deleted or not found:", imageUrl.substring(0, 50));
    } else {
      console.error("[Storage] Failed to delete image:", error.code, error.message);
      throw error; // Re-throw so caller knows deletion failed
    }
  }
};

/**
 * Upload an image to Firebase Storage and return the download URL
 * Handles both regular URLs (returns as-is) and base64 data URLs (uploads to Storage)
 */
const uploadImageToStorage = async (imageUrl: string, userId: string, posterId: string, imageType: 'background' | 'final'): Promise<string> => {
  // If it's already a regular URL (http/https), return it as-is
  if (!isBase64DataUrl(imageUrl)) {
    return imageUrl;
  }

  // If it's a base64 data URL, upload it to Storage
  try {
    const timestamp = Date.now();
    const fileExtension = imageUrl.match(/data:image\/(\w+);base64/)?.[1] || 'jpg';
    const storagePath = `posters/${userId}/${posterId}/${imageType}_${timestamp}.${fileExtension}`;
    const storageRef = ref(storage, storagePath);

    // Upload the base64 string
    await uploadString(storageRef, imageUrl, 'data_url');
    
    // Get the download URL
    const downloadURL = await getDownloadURL(storageRef);
    return downloadURL;
  } catch (error) {
    console.error("Storage Upload Error:", error);
    throw new Error("Failed to upload image to storage.");
  }
};

/**
 * Save a poster to Firestore
 * Posters are stored in: posters/{posterId} with userId as a field
 * Large images (base64) are uploaded to Firebase Storage first
 */
export const savePoster = async (poster: Omit<SavedPoster, 'id' | 'createdAt' | 'matchDate' | 'userId'>): Promise<void> => {
  const user = requireAuth();
  
  try {
    const posterId = Date.now().toString() + Math.random().toString(36).substring(7);
    const matchDate = poster.match.date; // YYYY-MM-DD format
    
    // Upload images to Storage if they're base64 data URLs
    const backgroundImageUrl = await uploadImageToStorage(poster.backgroundImage, user.uid, posterId, 'background');
    const finalPosterUrl = poster.finalPosterUrl 
      ? await uploadImageToStorage(poster.finalPosterUrl, user.uid, posterId, 'final')
      : undefined;
    
    const posterData = {
      ...poster,
      backgroundImage: backgroundImageUrl,
      finalPosterUrl: finalPosterUrl,
      matchDate,
      userId: user.uid,
      createdAt: serverTimestamp() as FieldValue
    };

    // Store in: posters/{posterId}
    const posterRef = doc(db, 'posters', posterId);
    await setDoc(posterRef, posterData);
  } catch (error: any) {
    console.error("Firestore Save Error:", error);
    if (error.message && error.message.includes("upload")) {
      throw error;
    }
    throw new Error("Failed to save poster. Please try again.");
  }
};

/**
 * Get all saved posters for the current user
 * Only returns posters where the match date hasn't passed yet
 */
export const getSavedPosters = async (): Promise<SavedPoster[]> => {
  const user = requireAuth();
  
  try {
    const today = getTodayDateString();
    
    // Query posters for this user where matchDate >= today
    // Note: Firestore requires a composite index for multiple orderBy
    // We'll order by matchDate first, then sort by createdAt in memory
    const postersRef = collection(db, 'posters');
    const q = query(
      postersRef,
      where('userId', '==', user.uid),
      where('matchDate', '>=', today),
      orderBy('matchDate', 'asc')
    );

    const querySnapshot = await getDocs(q);
    const posters: SavedPoster[] = [];

    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      // Convert Firestore Timestamp to number if needed
      const createdAt = data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt || Date.now());
      
      posters.push({
        id: docSnapshot.id,
        ...data,
        createdAt
      } as SavedPoster);
    });

    // Additional client-side filter as backup (in case of timezone issues)
    const validPosters = posters.filter(poster => !isDatePassed(poster.matchDate));
    
    // Sort by createdAt desc (newest first) for display
    validPosters.sort((a, b) => {
      const aTime = typeof a.createdAt === 'number' ? a.createdAt : (a.createdAt as Timestamp).toMillis();
      const bTime = typeof b.createdAt === 'number' ? b.createdAt : (b.createdAt as Timestamp).toMillis();
      return bTime - aTime;
    });

    return validPosters;
  } catch (error) {
    console.error("Firestore Read Error:", error);
    // If query fails (e.g., no index), fallback to getting all and filtering
    try {
      const postersRef = collection(db, 'posters');
      const querySnapshot = await getDocs(postersRef);
      const posters: SavedPoster[] = [];
      const today = getTodayDateString();

      querySnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        // Only process posters belonging to this user
        if (data.userId !== user.uid) return;
        
        const createdAt = data.createdAt?.toMillis ? data.createdAt.toMillis() : (data.createdAt || Date.now());
        
        const poster = {
          id: docSnapshot.id,
          ...data,
          createdAt
        } as SavedPoster;

        // Only include posters that haven't passed
        if (!isDatePassed(poster.matchDate)) {
          posters.push(poster);
        }
      });

      // Sort by createdAt desc
      posters.sort((a, b) => {
        const aTime = typeof a.createdAt === 'number' ? a.createdAt : (a.createdAt as Timestamp).toMillis();
        const bTime = typeof b.createdAt === 'number' ? b.createdAt : (b.createdAt as Timestamp).toMillis();
        return bTime - aTime;
      });

      return posters;
    } catch (fallbackError) {
      console.error("Firestore Fallback Read Error:", fallbackError);
      return [];
    }
  }
};

/**
 * Delete a poster from Firestore and its images from Storage
 */
export const deletePoster = async (id: string): Promise<void> => {
  const user = requireAuth();
  
  try {
    // Get the poster document directly
    const posterRef = doc(db, 'posters', id);
    const posterDoc = await getDoc(posterRef);
    
    if (!posterDoc.exists()) {
      throw new Error("Poster not found.");
    }
    
    const posterData = posterDoc.data();
    
    // Verify the poster belongs to the current user
    if (posterData.userId !== user.uid) {
      throw new Error("You don't have permission to delete this poster.");
    }
    
    // Extract image URLs
    const backgroundImageUrl = posterData.backgroundImage;
    const finalPosterUrl = posterData.finalPosterUrl;
    
    // Delete images from Storage (await to ensure they're deleted)
    try {
      await Promise.all([
        deleteImageFromStorage(backgroundImageUrl),
        deleteImageFromStorage(finalPosterUrl)
      ]);
    } catch (storageError: any) {
      // Log but don't fail if Storage deletion fails (file might already be deleted)
      console.warn("Some images failed to delete from Storage:", storageError);
      // Continue with Firestore deletion even if Storage deletion fails
    }
    
    // Delete the poster document from Firestore
    await deleteDoc(posterRef);
  } catch (error: any) {
    console.error("Firestore Delete Error:", error);
    if (error.message && (error.message.includes("permission") || error.message.includes("not found"))) {
      throw error;
    }
    throw new Error("Failed to delete poster. Please try again.");
  }
};

/**
 * Clean up expired posters (optional - can be called periodically)
 * This function deletes all posters where the match date has passed
 * Also deletes associated images from Firebase Storage
 */
export const cleanupExpiredPosters = async (): Promise<number> => {
  const user = requireAuth();
  
  try {
    const today = getTodayDateString();
    const postersRef = collection(db, 'posters');
    
    // Get all posters for this user
    const q = query(postersRef, where('userId', '==', user.uid));
    const querySnapshot = await getDocs(q);
    const expiredPosters: Array<{ id: string; backgroundImage?: string; finalPosterUrl?: string }> = [];

    querySnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      if (data.matchDate && isDatePassed(data.matchDate)) {
        expiredPosters.push({
          id: docSnapshot.id,
          backgroundImage: data.backgroundImage,
          finalPosterUrl: data.finalPosterUrl
        });
      }
    });

    if (expiredPosters.length === 0) {
      console.log("[Cleanup] No expired posters found");
      return 0;
    }

    console.log(`[Cleanup] Found ${expiredPosters.length} expired poster(s) to delete`);

    // Delete each expired poster (Storage images first, then Firestore document)
    for (const poster of expiredPosters) {
      console.log(`[Cleanup] Deleting expired poster: ${poster.id}`);
      
      // Delete images from Storage first
      try {
        await Promise.all([
          deleteImageFromStorage(poster.backgroundImage),
          deleteImageFromStorage(poster.finalPosterUrl)
        ]);
        console.log(`[Cleanup] Storage images deleted for poster: ${poster.id}`);
      } catch (storageError) {
        console.warn(`[Cleanup] Some images failed to delete for poster ${poster.id}:`, storageError);
        // Continue with Firestore deletion even if Storage fails
      }
      
      // Delete the Firestore document
      try {
        const posterRef = doc(db, 'posters', poster.id);
        await deleteDoc(posterRef);
        console.log(`[Cleanup] Firestore document deleted for poster: ${poster.id}`);
      } catch (firestoreError) {
        console.error(`[Cleanup] Failed to delete Firestore document for poster ${poster.id}:`, firestoreError);
      }
    }

    console.log(`[Cleanup] Completed cleanup of ${expiredPosters.length} expired poster(s)`);
    return expiredPosters.length;
  } catch (error) {
    console.error("[Cleanup] Error during cleanup:", error);
    throw error;
  }
};
