// Minimal identity shape consumed by retained Requester domain services.
// Issue #45 supplies this value from the authenticated server Actor; no
// client-controlled header or body field resolves it.
export type RequesterIdentity = {
  id: number;
  name: string;
  email: string;
};
