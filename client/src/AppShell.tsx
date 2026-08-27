import { useRequesterContext } from "./requester-context.js";
import CreateTicketForm from "./CreateTicketForm.js";
import MyTickets from "./MyTickets.js";
import { useState } from "react";

type Page = "my-tickets" | "create-ticket";

export default function AppShell() {
  const { currentRequester, clearRequester } = useRequesterContext();
  const [page, setPage] = useState<Page>("create-ticket");

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
        <button type="button" className={`lab2-nav-item ${page === "my-tickets" ? "lab2-nav-item-active" : ""}`}
          aria-current={page === "my-tickets" ? "page" : undefined}
          onClick={() => setPage("my-tickets")}>
          My Tickets
        </button>
        <button type="button" className={`lab2-nav-item ${page === "create-ticket" ? "lab2-nav-item-active" : ""}`}
          aria-current={page === "create-ticket" ? "page" : undefined}
          onClick={() => setPage("create-ticket")}>
          Create Ticket
        </button>
      </nav>

      <main className="lab2-shell-content" key={currentRequester.id}>
        {page === "my-tickets"
          ? <MyTickets onCreateTicket={() => setPage("create-ticket")} />
          : <CreateTicketForm />}
      </main>
    </div>
  );
}
