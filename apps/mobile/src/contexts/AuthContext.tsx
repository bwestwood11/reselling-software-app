import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  getSession,
  signIn as authSignIn,
  signInWithGoogle as authSignInWithGoogle,
  signOut as authSignOut,
  signUp as authSignUp,
} from "../lib/auth";

type AuthUser = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Restore session on mount
  useEffect(() => {
    getSession()
      .then(setUser)
      .finally(() => setIsLoading(false));
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const authUser = await authSignIn(email, password);
    setUser(authUser);
  }, []);

  const signUp = useCallback(
    async (name: string, email: string, password: string) => {
      const authUser = await authSignUp(name, email, password);
      setUser(authUser);
    },
    [],
  );

  const signOut = useCallback(async () => {
    await authSignOut();
    setUser(null);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const authUser = await authSignInWithGoogle();
    setUser(authUser);
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, isLoading, signIn, signInWithGoogle, signUp, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
