import { useState } from "react";
import { checkSystem, type Category } from "./api.js";
import AppShell from "./AppShell.js";
import RequesterSelection from "./RequesterSelection.js";
import { RequesterContextProvider, useRequesterContext } from "./requester-context.js";
import "./styles.css";

type UiState = "idle" | "loading" | "success" | "error";

export function Lab1SystemCheck() {
  const [state, setState] = useState<UiState>("idle");
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
      <button
        className="btn btn-success"
        type="button"
        onClick={handleCheck}
        disabled={state === "loading"}
      >
        {state === "loading" ? "Loading…" : "Check System"}
      </button>

      {state === "success" && (
        <div className="mt-3 text-success">
          <p className="mb-2">System Status: Online</p>
          <h2 className="h5">Supported Request Categories</h2>
          <ul className="mb-0">
            {categories.map((category) => <li key={category.id}>{category.name}</li>)}
          </ul>
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

function AppContent() {
  const { currentRequester, status } = useRequesterContext();

  return status === "ready" && currentRequester ? <AppShell /> : <RequesterSelection />;
}

export default function App() {
  return (
    <RequesterContextProvider>
      <AppContent />
    </RequesterContextProvider>
  );
}
