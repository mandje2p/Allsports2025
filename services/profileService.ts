import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc,
  serverTimestamp 
} from 'firebase/firestore';
import { 
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
  User
} from 'firebase/auth';
import { db, auth } from '../config/firebase';

export interface UserProfile {
  name: string;
  companyName: string;
  companyAddress: string;
  email: string;
  avatarUrl: string;
  subscription: 'FREE' | 'BASIC' | 'PRO' | 'PREMIUM';
  createdAt?: any;
  updatedAt?: any;
}

/**
 * Check if user is authenticated before allowing operations
 */
const requireAuth = (): User => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("Authentication required. Please log in to access your profile.");
  }
  return user;
};

/**
 * Get user profile from Firestore
 */
export const getUserProfile = async (): Promise<UserProfile | null> => {
  const user = requireAuth();
  
  try {
    const profileRef = doc(db, 'users', user.uid);
    const profileSnap = await getDoc(profileRef);
    
    if (profileSnap.exists()) {
      return profileSnap.data() as UserProfile;
    }
    
    // Return null if profile doesn't exist yet
    return null;
  } catch (error) {
    console.error("Error fetching user profile:", error);
    throw new Error("Failed to load profile. Please try again.");
  }
};

/**
 * Create or update user profile in Firestore
 */
export const saveUserProfile = async (profile: Partial<UserProfile>): Promise<void> => {
  const user = requireAuth();
  
  try {
    const profileRef = doc(db, 'users', user.uid);
    const existingProfile = await getDoc(profileRef);
    
    const profileData: Partial<UserProfile> = {
      ...profile,
      email: user.email || '',
      updatedAt: serverTimestamp()
    };
    
    if (existingProfile.exists()) {
      // Update existing profile
      await updateDoc(profileRef, profileData);
    } else {
      // Create new profile
      await setDoc(profileRef, {
        ...profileData,
        createdAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error("Error saving user profile:", error);
    throw new Error("Failed to save profile. Please try again.");
  }
};

/**
 * Change user password with reauthentication
 */
export const changeUserPassword = async (
  oldPassword: string,
  newPassword: string
): Promise<void> => {
  const user = requireAuth();
  
  // Validate that user has email/password provider (not social login)
  if (!user.email || !user.providerData.some(provider => provider.providerId === 'password')) {
    throw new Error("Password change is only available for email/password accounts.");
  }
  
  // Validate new password
  if (newPassword.length < 6) {
    throw new Error("New password must be at least 6 characters long.");
  }
  
  try {
    // Reauthenticate user with old password
    const credential = EmailAuthProvider.credential(user.email, oldPassword);
    await reauthenticateWithCredential(user, credential);
    
    // Update password
    await updatePassword(user, newPassword);
  } catch (error: any) {
    console.error("Error changing password:", error);
    
    // Handle specific Firebase errors
    if (error.code === 'auth/wrong-password') {
      throw new Error("L'ancien mot de passe est incorrect.");
    } else if (error.code === 'auth/weak-password') {
      throw new Error("Le nouveau mot de passe est trop faible.");
    } else if (error.code === 'auth/requires-recent-login') {
      throw new Error("Veuillez vous reconnecter avant de changer votre mot de passe.");
    }
    
    throw new Error(error.message || "Échec du changement de mot de passe. Veuillez réessayer.");
  }
};



