import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session, getSession, getStoredUserEmail as getStoredUserEmail, isAuthenticated } from '@/services/authService';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  refreshSession: async () => {},
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshSession = async () => {
    try {
      const { data, error } = await getSession();
      if (error || !data) {
        setUser(null);
        setSession(null);
      } else {
        setUser({email: data.email} as User);
        setSession(data);
      }
    } catch (error) {
      console.error('Error refreshing session:', error);
      setUser(null);
      setSession(null);
    }
  };

  useEffect(() => {
    // Check for existing session on mount
    const initAuth = async () => {
      setLoading(true);
      
      // First check if we have stored auth data
      if (isAuthenticated()) {
        const storedUserEmail = getStoredUserEmail();
        if (storedUserEmail) {
          setUser({email: storedUserEmail} as User); 
        }
      }
      
      setLoading(false);
    };

    initAuth();  
  }, []);

  return (
    <AuthContext.Provider value={{ user, session, loading, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
};
