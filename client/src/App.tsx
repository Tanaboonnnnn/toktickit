import { useState } from "react";
import { checkHealth, Category } from "./api.js";

// UI states you must handle for Issue 4: idle, loading, success, error.
type UiState = "idle" | "loading" | "success" | "error";

export default function App() {
  const [state, setState] = useState<UiState>("idle");
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState("");
  void categories;

  async function handleCheck() {
    // TODO(Issue 4): set loading, call checkSystem(), then either
    //   - success: store categories and show Online + the list, or
    //   - error: show Offline + a useful message.
    setState("loading");
    setError("");

    try {
      await checkHealth();
      setState("success");
    } catch {
      setState("error");
      setError("Unable to connect to TokTickIT API");
    }
  }

  return (
    <div className="container py-5" style={{ maxWidth: 640 }}>
      <h1 className="h3 mb-4">
        TokTickIT <span className="text-success">IT Service Desk</span>
      </h1>

      <button className="btn btn-success" onClick={handleCheck} disabled={state === "loading"}>
        {state === "loading" ? "Loading…" : "Check System"}
      </button>

      {state === "success" && <p className="mt-3 text-success">System Status: Online</p>}
      {state === "error" && (
        <div className="mt-3 text-danger">
          <p className="mb-1">System Status: Offline</p>
          <p className="mb-0">{error}</p>
        </div>
      )}

      {/* TODO(Issue 4): render loading / success (Online + categories) / error (Offline) states. */}
    </div>
  );
}
