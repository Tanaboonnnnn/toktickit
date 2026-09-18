import { type FormEvent, useCallback, useEffect, useState } from "react";
import { SafeApiError, type UserRole } from "../api.js";
import {
  createAdminUser,
  fetchAdminUsers,
  resetAdminInitialPassword,
  updateAdminUser,
  type AdminUser,
} from "../api/admin.js";
import { roleLabel } from "../auth-context.js";

const roleOptions: UserRole[] = ["REQUESTER", "IT_STAFF", "ADMINISTRATOR"];

function statusLabel(active: boolean): string { return active ? "Active" : "Inactive"; }

function FieldError({ message }: { message?: string }) {
  return message ? <small className="lab2-field-error">{message}</small> : null;
}

export default function UserManagement() {
  const [items, setItems] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<UserRole | "">("");
  const [success, setSuccess] = useState("");
  const [actionError, setActionError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createRole, setCreateRole] = useState<UserRole>("REQUESTER");
  const [createActive, setCreateActive] = useState(true);
  const [createPassword, setCreatePassword] = useState("");
  const [createConfirmPassword, setCreateConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState<UserRole>("REQUESTER");
  const [editActive, setEditActive] = useState(true);
  const [resetPassword, setResetPassword] = useState("");
  const [resetConfirmPassword, setResetConfirmPassword] = useState("");
  const [resetConfirmed, setResetConfirmed] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    setForbidden(false);
    try {
      setItems(await fetchAdminUsers({ ...(search ? { search } : {}), ...(role ? { role } : {}) }));
    } catch (error) {
      if (error instanceof SafeApiError && error.status === 403 && error.code === "FORBIDDEN") setForbidden(true);
      else setLoadError(error instanceof Error ? error.message : "Unable to load users");
    } finally {
      setLoading(false);
    }
  }, [search, role]);

  useEffect(() => { void loadUsers(); }, [loadUsers]);

  function clearFeedback(): void {
    setSuccess("");
    setActionError("");
    setFieldErrors({});
  }

  function reportActionError(error: unknown): void {
    if (error instanceof SafeApiError) {
      setActionError(error.message);
      setFieldErrors(error.fieldErrors ?? {});
    } else {
      setActionError("Unable to complete the request. Please try again.");
      setFieldErrors({});
    }
  }

  function openEdit(user: AdminUser): void {
    clearFeedback();
    setShowCreate(false);
    setEditing(user);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditRole(user.role);
    setEditActive(user.active);
    setResetPassword("");
    setResetConfirmPassword("");
    setResetConfirmed(false);
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    clearFeedback();
    setBusy(true);
    try {
      await createAdminUser({
        name: createName,
        email: createEmail,
        role: createRole,
        active: createActive,
        initialPassword: createPassword,
        confirmPassword: createConfirmPassword,
      });
      setSuccess("User created successfully");
      setShowCreate(false);
      setCreateName(""); setCreateEmail(""); setCreateRole("REQUESTER"); setCreateActive(true);
      setCreatePassword(""); setCreateConfirmPassword("");
      await loadUsers();
    } catch (error) { reportActionError(error); }
    finally { setBusy(false); }
  }

  async function handleEdit(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    clearFeedback();
    setBusy(true);
    try {
      const updated = await updateAdminUser(editing.id, {
        name: editName,
        email: editEmail,
        role: editRole,
        active: editActive,
        expectedVersion: editing.version,
      });
      setEditing(updated);
      setEditName(updated.name); setEditEmail(updated.email); setEditRole(updated.role); setEditActive(updated.active);
      setSuccess("User updated successfully");
      await loadUsers();
    } catch (error) { reportActionError(error); }
    finally { setBusy(false); }
  }

  async function handleReset(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    clearFeedback();
    setBusy(true);
    try {
      const updated = await resetAdminInitialPassword(editing.id, {
        initialPassword: resetPassword,
        confirmPassword: resetConfirmPassword,
        expectedVersion: editing.version,
        confirmed: resetConfirmed as true,
      });
      setEditing(updated);
      setResetPassword(""); setResetConfirmPassword(""); setResetConfirmed(false);
      setSuccess("Initial password reset successfully");
      await loadUsers();
    } catch (error) { reportActionError(error); }
    finally { setBusy(false); }
  }

  if (forbidden) return <section className="lab2-card lab3-route-state"><h1>Access Denied</h1><p>You do not have permission to manage users.</p></section>;

  return (
    <section className="lab3-user-management">
      <div className="lab2-list-heading">
        <div><h1>User Management</h1><p className="lab2-muted">Create and maintain TokTickIT accounts without deleting users.</p></div>
        <button type="button" className="lab2-button" onClick={() => { clearFeedback(); setEditing(null); setShowCreate((shown) => !shown); }}>Create User</button>
      </div>

      <form className="lab2-ticket-controls lab3-user-controls" onSubmit={(event) => { event.preventDefault(); setSearch(searchInput.trim()); }}>
        <div className="lab2-search-field lab2-field">
          <label htmlFor="admin-user-search">Search users by name or email</label>
          <input id="admin-user-search" type="search" value={searchInput} maxLength={120} onChange={(event) => setSearchInput(event.target.value)} />
        </div>
        <div className="lab2-field">
          <label htmlFor="admin-role-filter">Role</label>
          <select id="admin-role-filter" value={role} onChange={(event) => setRole(event.target.value as UserRole | "")}>
            <option value="">All roles</option>
            {roleOptions.map((value) => <option key={value} value={value}>{roleLabel(value)}</option>)}
          </select>
        </div>
        <button type="submit" className="lab2-button lab2-button-secondary">Search</button>
        <button type="button" className="lab2-button lab2-button-secondary" onClick={() => { setSearchInput(""); setSearch(""); setRole(""); }}>Clear search/filters</button>
      </form>

      {success && <div className="lab2-success" role="status">{success}</div>}
      {actionError && <div className="lab2-error" role="alert">{actionError}</div>}

      {showCreate && (
        <form className="lab2-card lab3-user-form" onSubmit={(event) => { void handleCreate(event); }}>
          <div className="lab3-user-form-heading"><h2>Create User</h2><button type="button" className="lab2-button lab2-button-secondary" onClick={() => setShowCreate(false)}>Cancel create</button></div>
          <div className="lab3-user-form-grid">
            <div className="lab2-field"><label htmlFor="create-user-name">Name</label><input id="create-user-name" value={createName} onChange={(event) => setCreateName(event.target.value)} /><FieldError message={fieldErrors.name} /></div>
            <div className="lab2-field"><label htmlFor="create-user-email">Email</label><input id="create-user-email" type="email" value={createEmail} onChange={(event) => setCreateEmail(event.target.value)} /><FieldError message={fieldErrors.email} /></div>
            <div className="lab2-field"><label htmlFor="create-user-role">User role</label><select id="create-user-role" value={createRole} onChange={(event) => setCreateRole(event.target.value as UserRole)}>{roleOptions.map((value) => <option key={value} value={value}>{roleLabel(value)}</option>)}</select><FieldError message={fieldErrors.role} /></div>
            <label className="lab3-confirm"><input type="checkbox" checked={createActive} onChange={(event) => setCreateActive(event.target.checked)} /> Active account</label>
            <div className="lab2-field"><label htmlFor="create-initial-password">Initial password</label><input id="create-initial-password" type="password" value={createPassword} onChange={(event) => setCreatePassword(event.target.value)} /><FieldError message={fieldErrors.initialPassword} /></div>
            <div className="lab2-field"><label htmlFor="create-confirm-password">Confirm initial password</label><input id="create-confirm-password" type="password" value={createConfirmPassword} onChange={(event) => setCreateConfirmPassword(event.target.value)} /><FieldError message={fieldErrors.confirmPassword} /></div>
          </div>
          <button className="lab2-button" type="submit" disabled={busy}>{busy ? "Creating..." : "Create account"}</button>
        </form>
      )}

      {editing && (
        <section className="lab2-card lab3-user-edit" aria-label={`Editing ${editing.name}`}>
          <div className="lab3-user-form-heading"><h2>Edit User</h2><button type="button" className="lab2-button lab2-button-secondary" onClick={() => setEditing(null)}>Close edit</button></div>
          <form className="lab3-user-form-grid" onSubmit={(event) => { void handleEdit(event); }}>
            <div className="lab2-field"><label htmlFor="edit-user-name">Edit name</label><input id="edit-user-name" value={editName} onChange={(event) => setEditName(event.target.value)} /><FieldError message={fieldErrors.name} /></div>
            <div className="lab2-field"><label htmlFor="edit-user-email">Edit email</label><input id="edit-user-email" type="email" value={editEmail} onChange={(event) => setEditEmail(event.target.value)} /><FieldError message={fieldErrors.email} /></div>
            <div className="lab2-field"><label htmlFor="edit-user-role">Edit role</label><select id="edit-user-role" value={editRole} onChange={(event) => setEditRole(event.target.value as UserRole)}>{roleOptions.map((value) => <option key={value} value={value}>{roleLabel(value)}</option>)}</select><FieldError message={fieldErrors.role} /></div>
            <label className="lab3-confirm"><input type="checkbox" checked={editActive} onChange={(event) => setEditActive(event.target.checked)} /> Active account</label>
            <div><button className="lab2-button" type="submit" disabled={busy}>{busy ? "Saving..." : "Save user"}</button></div>
          </form>

          <form className="lab3-password-reset" onSubmit={(event) => { void handleReset(event); }}>
            <h3>Set new initial password</h3>
            <p className="lab2-muted">This revokes prior authenticated access and requires a password change at the next login.</p>
            <div className="lab3-user-form-grid">
              <div className="lab2-field"><label htmlFor="reset-initial-password">New initial password</label><input id="reset-initial-password" type="password" value={resetPassword} onChange={(event) => setResetPassword(event.target.value)} /><FieldError message={fieldErrors.initialPassword} /></div>
              <div className="lab2-field"><label htmlFor="reset-confirm-password">Confirm new initial password</label><input id="reset-confirm-password" type="password" value={resetConfirmPassword} onChange={(event) => setResetConfirmPassword(event.target.value)} /><FieldError message={fieldErrors.confirmPassword} /></div>
            </div>
            <label className="lab3-confirm"><input type="checkbox" checked={resetConfirmed} onChange={(event) => setResetConfirmed(event.target.checked)} /> Confirm setting a new initial password for {editing.name}</label>
            <FieldError message={fieldErrors.confirmed} />
            <button className="lab2-button lab2-button-destructive" type="submit" disabled={busy || !resetConfirmed}>{busy ? "Saving..." : "Set new initial password"}</button>
          </form>
        </section>
      )}

      {loading ? <p className="lab2-status" role="status">Loading users...</p> : loadError ? (
        <div className="lab2-error" role="alert"><p>{loadError}</p><button className="lab2-button lab2-button-secondary" type="button" onClick={() => { void loadUsers(); }}>Retry</button></div>
      ) : items.length === 0 ? (
        <section className="lab2-card lab2-list-empty"><h2>{search || role ? "No matching users" : "No users"}</h2><p>{search || role ? "Try a different search or role filter." : "Create a user to get started."}</p></section>
      ) : (
        <div className="lab2-table-wrap lab3-user-table-wrap">
          <table className="lab2-table lab3-user-table">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Action</th></tr></thead>
            <tbody>{items.map((user) => (
              <tr key={user.id}>
                <td data-label="Name">{user.name}</td>
                <td data-label="Email">{user.email}</td>
                <td data-label="Role">{roleLabel(user.role)}</td>
                <td data-label="Status"><span className={`lab3-account-badge ${user.active ? "is-active" : "is-inactive"}`}>{statusLabel(user.active)}</span></td>
                <td data-label="Action"><button className="lab2-button lab2-button-secondary" type="button" onClick={() => openEdit(user)} aria-label={`Edit ${user.name}`}>Edit</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </section>
  );
}
