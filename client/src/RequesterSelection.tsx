import { useEffect, useState } from "react";
import { useRequesterContext } from "./requester-context.js";

export default function RequesterSelection() {
  const {
    requesters,
    status,
    error,
    retry,
    selectRequester,
  } = useRequesterContext();
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    if (status === "selection") setSelectedId("");
  }, [status]);

  function handleContinue() {
    if (selectedId) selectRequester(Number(selectedId));
  }

  return (
    <main className="lab2-page" aria-labelledby="requester-selection-heading">
      <section className="lab2-card requester-selection-card">
        <p className="lab2-brand">TokTickIT</p>
        <h1 id="requester-selection-heading">Select a Development Requester</h1>
        <p className="lab2-muted">
          This selector is for Lab 2 testing only. It is not authentication or login;
          real authentication comes later.
        </p>

        {status === "loading" && (
          <p className="lab2-status" role="status" aria-live="polite">
            Loading Development Requesters…
          </p>
        )}

        {status === "error" && (
          <div className="lab2-error" role="alert">
            <p>{error ?? "Unable to load Development Requesters"}</p>
            <button className="lab2-button lab2-button-secondary" type="button" onClick={retry}>
              Retry
            </button>
          </div>
        )}

        {status === "selection" && requesters.length === 0 && (
          <p className="lab2-status" role="status" aria-live="polite">
            No active Development Requesters are available.
          </p>
        )}

        {status === "selection" && requesters.length > 0 && (
          <div className="requester-selection-controls">
            <label htmlFor="development-requester">Development Requester</label>
            <select
              id="development-requester"
              value={selectedId}
              onChange={(event) => setSelectedId(event.target.value)}
            >
              <option value="">Select a Development Requester</option>
              {requesters.map((requester) => (
                <option key={requester.id} value={requester.id}>
                  {requester.name} — {requester.email}
                </option>
              ))}
            </select>
            <button
              className="lab2-button lab2-button-primary"
              type="button"
              disabled={!selectedId}
              onClick={handleContinue}
            >
              Continue
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
