import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import {
  changeOwnPassword,
  fetchCurrentUser,
  loginUser,
  logoutUser,
  SafeApiError,
  setAuthenticationFailureHandler,
  type CurrentUser,
} from "./api.js";

type AuthState =
  | { kind: "loading" }
  | { kind: "unauthenticated" }
  | { kind: "authenticated"; user: CurrentUser }
  | { kind: "error"; message: string };

interface AuthContextValue {
  state: AuthState;
  user: CurrentUser | null;
  retryBootstrap: () => void;
  login: (email: string, password: string) => Promise<CurrentUser>;
  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) => Promise<CurrentUser>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function roleHome(role: CurrentUser["role"]): string {
  if (role === "REQUESTER") return "#/tickets";
  if (role === "IT_STAFF") return "#/staff/tickets";
  return "#/admin/users";
}

export function roleLabel(role: CurrentUser["role"]): string {
  if (role === "REQUESTER") return "Requester";
  if (role === "IT_STAFF") return "IT Staff";
  return "Administrator";
}

export function AuthProvider({ children, initialUser }: { children: ReactNode; initialUser?: CurrentUser }) {
  const [state, setState] = useState<AuthState>(initialUser
    ? { kind: "authenticated", user: initialUser }
    : { kind: "loading" });
  const [bootstrapToken, setBootstrapToken] = useState(0);
  const generation = useRef(0);

  useEffect(() => {
    for (const store of [window.sessionStorage, window.localStorage]) {
      try {
        store.removeItem("toktickit.developmentRequesterId");
      } catch {
        // Storage availability is not part of authentication authority.
      }
    }
  }, []);

  useEffect(() => {
    if (initialUser) return;
    const requestGeneration = ++generation.current;
    setState({ kind: "loading" });
    void fetchCurrentUser()
      .then((user) => {
        if (generation.current === requestGeneration) setState({ kind: "authenticated", user });
      })
      .catch((error: unknown) => {
        if (generation.current !== requestGeneration) return;
        if (error instanceof SafeApiError && error.status === 401) {
          setState({ kind: "unauthenticated" });
          return;
        }
        setState({ kind: "error", message: "Unable to check your session. Please try again." });
      });
  }, [bootstrapToken, initialUser]);

  useEffect(() => setAuthenticationFailureHandler((error) => {
    generation.current += 1;
    setState((current) => {
      if (error.code === "PASSWORD_CHANGE_REQUIRED" && current.kind === "authenticated") {
        return { kind: "authenticated", user: { ...current.user, mustChangePassword: true } };
      }
      return { kind: "unauthenticated" };
    });
  }), []);

  const login = useCallback(async (email: string, password: string) => {
    const user = await loginUser(email, password);
    generation.current += 1;
    setState({ kind: "authenticated", user });
    return user;
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string, confirmPassword: string) => {
    const user = await changeOwnPassword(currentPassword, newPassword, confirmPassword);
    generation.current += 1;
    setState({ kind: "authenticated", user });
    return user;
  }, []);

  const logout = useCallback(async () => {
    await logoutUser();
    generation.current += 1;
    setState({ kind: "unauthenticated" });
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    state,
    user: state.kind === "authenticated" ? state.user : null,
    retryBootstrap: () => setBootstrapToken((token) => token + 1),
    login,
    changePassword,
    logout,
  }), [state, login, changePassword, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
