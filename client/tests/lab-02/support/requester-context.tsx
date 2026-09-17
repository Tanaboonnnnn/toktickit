import { type ReactNode } from "react";
import { AuthProvider } from "../../../src/auth-context.js";

// Retained filename/import surface for historical Lab 2 component tests only.
// Production Development Requester selection was retired by Issue #45. The
// evolved regression harness supplies one authenticated Requester instead of
// recreating client-controlled identity or an impersonation switcher.
export interface DevelopmentRequester {
  id: number;
  name: string;
  email: string;
}

export const DEFAULT_AUTHENTICATED_REQUESTER: DevelopmentRequester = {
  id: 1,
  name: "Anan Student",
  email: "anan.student@example.test",
};

export function RequesterContextProvider({
  children,
  requester = DEFAULT_AUTHENTICATED_REQUESTER,
}: {
  children: ReactNode;
  requester?: DevelopmentRequester;
}) {
  return (
    <AuthProvider initialUser={{ ...requester, role: "REQUESTER", mustChangePassword: false }}>
      {children}
    </AuthProvider>
  );
}
