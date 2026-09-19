import { FormEvent, useState } from "react";
import { SafeApiError } from "./api.js";
import { roleHome, useAuth } from "./auth-context.js";

function navigate(hash: string): void {
  window.location.hash = hash;
}

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!email.trim() || !password) {
      setError("Email and password are required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const user = await login(email, password);
      navigate(user.mustChangePassword ? "#/change-password" : roleHome(user.role));
    } catch (caught) {
      if (caught instanceof SafeApiError) {
        setError(caught.code === "LOGIN_RATE_LIMITED"
          ? "Too many sign-in attempts. Try again later."
          : caught.message);
      } else {
        setError("Unable to sign in. Please try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="lab2-page" aria-labelledby="login-heading">
      <section className="lab2-card lab3-auth-card">
        <p className="lab2-brand">TokTickIT</p>
        <h1 id="login-heading">Login</h1>
        <p className="lab2-muted">Sign in with your TokTickIT account.</p>
        {error && <p className="lab2-error" role="alert">{error}</p>}
        <form className="lab3-auth-form" onSubmit={(event) => { void submit(event); }}>
          <div className="lab2-field-group">
            <label htmlFor="login-email">Email</label>
            <input id="login-email" type="email" autoComplete="username" required value={email}
              onChange={(event) => setEmail(event.target.value)} disabled={busy} />
          </div>
          <div className="lab2-field-group">
            <label htmlFor="login-password">Password</label>
            <input id="login-password" type="password" autoComplete="current-password" required value={password}
              onChange={(event) => setPassword(event.target.value)} disabled={busy} />
          </div>
          <button className="lab2-button lab2-button-primary" type="submit" disabled={busy}>
            {busy ? "Signing in..." : "Login"}
          </button>
        </form>
      </section>
    </main>
  );
}
