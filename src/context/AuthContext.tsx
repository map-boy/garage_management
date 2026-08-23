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
  /** Non-null when sign-in or profile resolution failed. */
  error: string | null;
  retry: () => void;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      try {
        if (!u) {
          // No session yet on this device: sign in silently, no UI, no
          // password. This callback fires again with the new user, and that
          // pass is what finishes loading — clearing it here would flash the
          // app with no profile for a frame.
          await signInAnonymously(auth);
          return;
        }

        if (cancelled) return;
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

        if (cancelled) return;
        setProfile(resolvedProfile);
        settingsService.subscribe(resolvedProfile.garageId);
        setError(null);
      } catch (err) {
        // Previously any failure here (offline on first launch, auth
        // misconfigured, denied profile read) left `loading` true forever and
        // the app sat on its splash spinner with no way out. Surface it and
        // offer a retry instead.
        if (cancelled) return;
        console.error('Auth initialisation failed', err);
        setError(
          err instanceof Error
            ? err.message
            : 'Could not start a session. Check your connection and try again.'
        );
        // An error always ends loading, even with no user — otherwise a
        // failed anonymous sign-in leaves the splash spinner up forever.
        setLoading(false);
      } finally {
        // Otherwise only stop loading once there is a signed-in user to
        // render for; a pending anonymous sign-in keeps the splash up.
        if (!cancelled && auth.currentUser) setLoading(false);
      }
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [attempt]);

  const retry = () => {
    setError(null);
    setLoading(true);
    setAttempt((n) => n + 1);
  };

  return (
    <AuthContext.Provider value={{ user, profile, loading, error, retry }}>
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}