import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, User, signInAnonymously } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { DEFAULT_SETTINGS } from '../types/settings.types';
import { settingsService } from '../services/settingsService';

export type UserRole = 'owner' | 'manager' | 'technician' | 'receptionist' | 'store_keeper' | 'cashier';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  garageId: string;
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      if (!u) {
        // No session yet on this device: sign in silently, no UI, no password.
        await signInAnonymously(auth);
        return;
      }

      setUser(u);
      const profileRef = doc(db, 'users', u.uid);
      const profileSnap = await getDoc(profileRef);
      let resolvedProfile: UserProfile;

      if (profileSnap.exists()) {
        resolvedProfile = profileSnap.data() as UserProfile;
      } else {
        const garageId = u.uid;
        const garageRef = doc(db, 'garages', garageId);
        await setDoc(garageRef, {
          ...DEFAULT_SETTINGS,
          id: garageId,
          garageName: 'My Garage',
          ownerId: u.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        resolvedProfile = {
          uid: u.uid,
          email: null,
          displayName: null,
          role: 'owner',
          garageId,
          createdAt: new Date().toISOString(),
        };
        await setDoc(profileRef, resolvedProfile);
      }

      setProfile(resolvedProfile);
      settingsService.subscribe(resolvedProfile.garageId);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ user, profile, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}