import { useEffect, useState } from "react";
import { AuthProvider, roleHome, useAuth } from "./auth-context.js";
import AppShell from "./AppShell.js";
import ChangePassword from "./ChangePassword.js";
import Login from "./Login.js";
import { checkSystem, type Category } from "./api.js";
import "./styles.css";

type Lab1UiState = "idle" | "loading" | "success" | "error";

// Historical Lab 1 component retained only as an exported regression surface.
// It is not mounted by the authenticated Lab 3 application.
export function Lab1SystemCheck() {
  const [state, setState] = useState<Lab1UiState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");

  async function handleCheck() {
    setState("loading");
    setError("");
    setCategories([]);
    try {
      const result = await checkSystem();
      setCategories(result.categories);
      setState("success");
    } catch {
      setState("error");
      setError("Unable to connect to TokTickIT API");
    }
  }

  return (
    <section className="lab1-system-check" aria-label="System check">
      <button className="btn btn-success" type="button" onClick={() => { void handleCheck(); }} disabled={state === "loading"}>
        {state === "loading" ? "Loading…" : "Check System"}
      </button>
      {state === "success" && (
        <div className="mt-3 text-success">
          <p className="mb-2">System Status: Online</p>
          <h2 className="h5">Supported Request Categories</h2>
          <ul className="mb-0">{categories.map((category) => <li key={category.id}>{category.name}</li>)}</ul>
        </div>
      )}
      {state === "error" && (
        <div className="mt-3 text-danger">
          <p className="mb-1">System Status: Offline</p>
          <p className="mb-0">{error}</p>
        </div>
      )}
    </section>
  );
}

function normalizedHash(): string {
  const hash = window.location.hash;
  return hash === "" || hash === "#" || hash === "#/" ? "" : hash;
}

function useHash(): string {
  const [hash, setHash] = useState(normalizedHash);
  useEffect(() => {
    const update = () => setHash(normalizedHash());
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  return hash;
}

function redirect(hash: string): void {
  if (window.location.hash !== hash) window.location.hash = hash;
}

function AppContent() {
  const { state, user, retryBootstrap } = useAuth();
  const hash = useHash();

  if (state.kind === "loading") {
    return <main className="lab2-page"><p className="lab2-status" role="status">Checking your session…</p></main>;
  }

  if (state.kind === "error") {
    return (
      <main className="lab2-page">
        <section className="lab2-card">
          <p className="lab2-brand">TokTickIT</p>
          <h1>Unable to check session</h1>
          <div className="lab2-error" role="alert"><p>{state.message}</p></div>
          <button className="lab2-button lab2-button-secondary" type="button" onClick={retryBootstrap}>Retry</button>
        </section>
      </main>
    );
  }

  if (state.kind === "unauthenticated") {
    if (hash !== "#/login") redirect("#/login");
    return <Login />;
  }

  if (!user) return null;

  if (user.mustChangePassword) {
    if (hash !== "#/change-password") redirect("#/change-password");
    return <ChangePassword />;
  }

  if (hash === "#/login" || hash === "") {
    redirect(roleHome(user.role));
    return <main className="lab2-page"><p className="lab2-status" role="status">Opening TokTickIT…</p></main>;
  }

  if (hash === "#/change-password") return <ChangePassword />;
  return <AppShell route={hash} key={user.id} />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
