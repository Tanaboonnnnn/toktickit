import { useState } from "react";
import { checkSystem, Category } from "./api.js";

// UI states you must handle for Issue 4: idle, loading, success, error.
type UiState = "idle" | "loading" | "success" | "error";

export default function App() {
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
    <div className="container py-5" style={{ maxWidth: 640 }}>
      <h1 className="h3 mb-4">
        TokTickIT <span className="text-success">IT Service Desk</span>
      </h1>

      <button className="btn btn-success" onClick={handleCheck} disabled={state === "loading"}>
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
    </div>
  );
}
