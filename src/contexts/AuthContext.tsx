import React, { 
  createContext, 
  useState, 
  useContext, 
  useEffect 
} from 'react';
import { supabase } from '../config/supabaseClient';
import { errorHandler, ErrorSeverity } from '../utils/errorHandler';
import { logger, LogLevel } from '../utils/logger';
import { configManager } from '../config/configManager';

export interface User {
  id: string;
  email: string;
  name?: string;
  role?: 'admin' | 'manager' | 'user';
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  signup: (email: string, password: string, name?: string) => Promise<boolean>;
  resetPassword: (email: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check initial authentication state
    const checkAuthStatus = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        const userData: User = {
          id: session.user.id,
          email: session.user.email!,
          name: session.user.user_metadata?.name,
          role: session.user.user_metadata?.role || 'user'
        };
        
        setUser(userData);
        setIsAuthenticated(true);
        
        logger.log(LogLevel.INFO, 'User authenticated', { userId: userData.id });
      }
    };

    checkAuthStatus();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const userData: User = {
            id: session.user.id,
            email: session.user.email!,
            name: session.user.user_metadata?.name,
            role: session.user.user_metadata?.role || 'user'
          };
          
          setUser(userData);
          setIsAuthenticated(true);
          
          logger.log(LogLevel.INFO, 'User signed in', { 
            userId: userData.id, 
            event 
          });
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setIsAuthenticated(false);
          
          logger.log(LogLevel.INFO, 'User signed out');
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        throw error;
      }

      logger.log(LogLevel.INFO, 'Login successful', { email });
      return true;
    } catch (error) {
      const processedError = error instanceof Error 
        ? error 
        : new Error(String(error));
      
      errorHandler.log(
        processedError, 
        ErrorSeverity.MEDIUM, 
        { context: 'Login attempt' }
      );
      
      logger.log(LogLevel.ERROR, 'Login failed', { 
        email, 
        error: processedError 
      });
      
      return false;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await supabase.auth.signOut();
      
      logger.log(LogLevel.INFO, 'Logout successful');
    } catch (error) {
      const processedError = error instanceof Error 
        ? error 
        : new Error(String(error));
      
      errorHandler.log(
        processedError, 
        ErrorSeverity.LOW, 
        { context: 'Logout attempt' }
      );
    }
  };

  const signup = async (
    email: string, 
    password: string, 
    name?: string
  ): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role: 'user'
          }
        }
      });

      if (error) {
        throw error;
      }

      logger.log(LogLevel.INFO, 'Signup successful', { email, name });
      return true;
    } catch (error) {
      const processedError = error instanceof Error 
        ? error 
        : new Error(String(error));
      
      errorHandler.log(
        processedError, 
        ErrorSeverity.MEDIUM, 
        { context: 'Signup attempt' }
      );
      
      logger.log(LogLevel.ERROR, 'Signup failed', { 
        email, 
        error: processedError 
      });
      
      return false;
    }
  };

  const resetPassword = async (email: string): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${configManager.getConfig().apiBaseUrl}/reset-password`
      });

      if (error) {
        throw error;
      }

      logger.log(LogLevel.INFO, 'Password reset initiated', { email });
      return true;
    } catch (error) {
      const processedError = error instanceof Error 
        ? error 
        : new Error(String(error));
      
      errorHandler.log(
        processedError, 
        ErrorSeverity.MEDIUM, 
        { context: 'Password reset attempt' }
      );
      
      logger.log(LogLevel.ERROR, 'Password reset failed', { 
        email, 
        error: processedError 
      });
      
      return false;
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      login,
      logout,
      signup,
      resetPassword
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}