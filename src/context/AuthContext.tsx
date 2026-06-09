import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile, RoleType } from '../types.js';

interface AuthContextType {
  user: any;
  profile: UserProfile | null;
  role: RoleType;
  signOut: () => void;
  isAdmin: boolean;
  isEstimator: boolean;
  isViewer: boolean;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async () => {
    try {
      const res = await fetch('/api/auth/profile');
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch (err) {
      console.error('Error fetching Auth profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const refreshProfile = async () => {
    setLoading(true);
    await fetchProfile();
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
      if (res.ok) {
        const data = await res.json();
        setProfile(data);
      }
    } catch (err) {
      console.error('Error updating Auth profile:', err);
    }
  };

  const signOut = () => {
    // Simulated sign out deletes token if any or returns to baseline profile role
    console.log('User signed out.');
  };

  const role = profile?.role || 'estimator';
  const isAdmin = role === 'admin';
  const isEstimator = role === 'estimator';
  const isViewer = role === 'viewer';

  const user = profile ? { id: profile.id, email: profile.email } : null;

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        role,
        signOut,
        isAdmin,
        isEstimator,
        isViewer,
        loading,
        refreshProfile,
        updateProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
