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
  sendVerificationOtp as authSendVerificationOtp,
  signIn as authSignIn,
  signInWithGoogle as authSignInWithGoogle,
  signOut as authSignOut,
  signUp as authSignUp,
  verifyEmailOtp as authVerifyEmailOtp,
  type AuthUser,
} from "../lib/auth";

type AuthContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  // Resolves to true if the account still needs email verification before it can sign in.
  signUp: (name: string, email: string, password: string) => Promise<boolean>;
  verifyEmail: (email: string, otp: string) => Promise<void>;
  resendVerificationOtp: (email: string) => Promise<void>;
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
      const { user: authUser, requiresVerification } = await authSignUp(name, email, password);
      if (!requiresVerification) setUser(authUser);
      return requiresVerification;
    },
    [],
  );

  const verifyEmail = useCallback(async (email: string, otp: string) => {
    const authUser = await authVerifyEmailOtp(email, otp);
    setUser(authUser);
  }, []);

  const resendVerificationOtp = useCallback(async (email: string) => {
    await authSendVerificationOtp(email);
  }, []);

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
      value={{
        user,
        isLoading,
        signIn,
        signInWithGoogle,
        signUp,
        verifyEmail,
        resendVerificationOtp,
        signOut,
      }}
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
