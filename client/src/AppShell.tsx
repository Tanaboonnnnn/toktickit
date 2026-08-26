import { useRequesterContext } from "./requester-context.js";
import CreateTicketForm from "./CreateTicketForm.js";

export default function AppShell() {
  const { currentRequester, clearRequester } = useRequesterContext();

  if (!currentRequester) return null;

  return (
    <div className="lab2-shell">
      <header className="lab2-shell-header">
        <div>
          <p className="lab2-brand">TokTickIT</p>
          <p className="lab2-muted">Requester application</p>
        </div>
        <div className="lab2-context" aria-label="Current Development Requester">
          <span>Current Development Requester</span>
          <strong>{currentRequester.name}</strong>
          <small>Lab 2 testing context — not authentication</small>
        </div>
        <button className="lab2-button lab2-button-secondary" type="button" onClick={clearRequester}>
          Change Requester
        </button>
      </header>

      <nav className="lab2-navigation" aria-label="Primary navigation">
        <button type="button" className="lab2-nav-item" disabled>
          My Tickets
        </button>
        <button type="button" className="lab2-nav-item lab2-nav-item-active" aria-current="page">
          Create Ticket
        </button>
      </nav>

      <main className="lab2-shell-content">
        <CreateTicketForm />
      </main>
    </div>
  );
}
