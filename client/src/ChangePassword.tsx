import { FormEvent, useRef, useState } from "react";
import { SafeApiError } from "./api.js";
import { roleHome, useAuth } from "./auth-context.js";

function codePoints(value: string): number {
  return Array.from(value).length;
}

export default function ChangePassword() {
  const { changePassword, user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const currentRef = useRef<HTMLInputElement>(null);
  const newRef = useRef<HTMLInputElement>(null);
  const confirmRef = useRef<HTMLInputElement>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    if (!currentPassword) {
      setError("Current password is required.");
      currentRef.current?.focus();
      return;
    }
    const length = codePoints(newPassword);
    if (length < 15 || length > 128) {
      setError("New password must contain 15 to 128 characters.");
      newRef.current?.focus();
      return;
    }
    if (newPassword === currentPassword) {
      setError("New password must differ from the current password.");
      newRef.current?.focus();
      return;
    }
    if (confirmPassword !== newPassword) {
      setError("Password confirmation must match the new password.");
      confirmRef.current?.focus();
      return;
    }

    setBusy(true);
    try {
      const changed = await changePassword(currentPassword, newPassword, confirmPassword);
      window.location.hash = roleHome(changed.role);
    } catch (caught) {
      setError(caught instanceof SafeApiError ? caught.message : "Unable to change password. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="lab2-page" aria-labelledby="change-password-heading">
      <section className="lab2-card lab3-auth-card">
        <p className="lab2-brand">TokTickIT</p>
        <h1 id="change-password-heading">Change Password</h1>
        <p className="lab2-muted">
          {user?.mustChangePassword
            ? "Choose a new password before continuing to TokTickIT."
            : "Update your TokTickIT password."}
        </p>
        <p className="lab2-muted">Use 15–128 characters. Your new password must differ from your current password.</p>
        {error && <p className="lab2-error" role="alert">{error}</p>}
        <form className="lab3-auth-form" onSubmit={(event) => { void submit(event); }}>
          <div className="lab2-field-group">
            <label htmlFor="current-password">Current password</label>
            <input ref={currentRef} id="current-password" type="password" autoComplete="current-password" required
              value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} disabled={busy} />
          </div>
          <div className="lab2-field-group">
            <label htmlFor="new-password">New password</label>
            <input ref={newRef} id="new-password" type="password" autoComplete="new-password" required
              value={newPassword} onChange={(event) => setNewPassword(event.target.value)} disabled={busy} />
          </div>
          <div className="lab2-field-group">
            <label htmlFor="confirm-password">Confirm new password</label>
            <input ref={confirmRef} id="confirm-password" type="password" autoComplete="new-password" required
              value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} disabled={busy} />
          </div>
          <button className="lab2-button lab2-button-primary" type="submit" disabled={busy}>
            {busy ? "Changing password..." : "Change Password"}
          </button>
        </form>
      </section>
    </main>
  );
}
