import { parseTicketListQuery } from "../ticket-query.js";
import { parseStaffTicketQuery } from "../staff/staff-query.js";

export function dashboardClock(): Date { return new Date(); }

export function requesterDashboardQueries(asOf: Date) {
  const resolvedWindow = { from: new Date(asOf.getTime() - 168 * 3600000).toISOString(), before: asOf.toISOString() };
  const parameters = {
    myActiveTickets: { statusGroup: "active" },
    waitingForMe: { currentStatus: "WAITING_FOR_REQUESTER" },
    recentlyResolved: { statusGroup: "resolved", resolvedFrom: resolvedWindow.from, resolvedBefore: resolvedWindow.before },
  };
  return {
    resolvedWindow,
    queries: {
      myActiveTickets: parseTicketListQuery(parameters.myActiveTickets),
      waitingForMe: parseTicketListQuery(parameters.waitingForMe),
      recentlyResolved: parseTicketListQuery(parameters.recentlyResolved),
    },
    drillDown: Object.fromEntries(Object.entries(parameters).map(([key, value]) => [key, `#/tickets?${new URLSearchParams(value)}`])),
  };
}

export function staffDashboardQueries() {
  const parameters = {
    unassignedActive: { owner: "unassigned", statusGroup: "active" },
    myActiveTickets: { owner: "me", statusGroup: "active" },
    highPriorityActive: { itPriority: "HIGH", statusGroup: "active" },
    waitingForRequester: { currentStatus: "WAITING_FOR_REQUESTER" },
  };
  return {
    queries: {
      unassignedActive: parseStaffTicketQuery(parameters.unassignedActive),
      myActiveTickets: parseStaffTicketQuery(parameters.myActiveTickets),
      highPriorityActive: parseStaffTicketQuery(parameters.highPriorityActive),
      waitingForRequester: parseStaffTicketQuery(parameters.waitingForRequester),
    },
    drillDown: Object.fromEntries(Object.entries(parameters).map(([key, value]) => [key, `#/staff/tickets?${new URLSearchParams(value)}`])),
  };
}
