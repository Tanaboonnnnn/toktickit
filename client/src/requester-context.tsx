import {
  createContext,
  Fragment,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  fetchDevelopmentRequesters,
  type DevelopmentRequester,
} from "./api.js";

export const DEVELOPMENT_REQUESTER_STORAGE_KEY = "toktickit.developmentRequesterId";

export type RequesterContextStatus = "loading" | "selection" | "ready" | "error";

export interface RequesterContextValue {
  requesters: DevelopmentRequester[];
  currentRequester: DevelopmentRequester | null;
  status: RequesterContextStatus;
  error: string | null;
  selectRequester: (id: number) => boolean;
  clearRequester: () => void;
  retry: () => void;
}

const RequesterContext = createContext<RequesterContextValue | null>(null);

function storage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function readPersistedRequesterId(): number | null {
  const store = storage();
  if (!store) return null;

  const raw = store.getItem(DEVELOPMENT_REQUESTER_STORAGE_KEY);
  if (raw === null) return null;

  const parsed = Number(raw);
  const valid = /^[1-9]\d*$/.test(raw)
    && Number.isSafeInteger(parsed)
    && String(parsed) === raw;
  if (valid) return parsed;

  store.removeItem(DEVELOPMENT_REQUESTER_STORAGE_KEY);
  return null;
}

export function RequesterContextProvider({ children }: { children: ReactNode }) {
  const persistedRequesterId = useRef<number | null>(readPersistedRequesterId());
  const [requesters, setRequesters] = useState<DevelopmentRequester[]>([]);
  const [currentRequester, setCurrentRequester] = useState<DevelopmentRequester | null>(null);
  const [status, setStatus] = useState<RequesterContextStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  const loadRequesters = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const loadedRequesters = await fetchDevelopmentRequesters();
      setRequesters(loadedRequesters);

      const restored = persistedRequesterId.current === null
        ? null
        : loadedRequesters.find(({ id }) => id === persistedRequesterId.current) ?? null;
      if (persistedRequesterId.current !== null && restored === null) {
        storage()?.removeItem(DEVELOPMENT_REQUESTER_STORAGE_KEY);
        persistedRequesterId.current = null;
      }

      setCurrentRequester(restored);
      setStatus(restored ? "ready" : "selection");
    } catch {
      setCurrentRequester(null);
      setStatus("error");
      setError("Unable to load Development Requesters");
    }
  }, []);

  useEffect(() => {
    void loadRequesters();
  }, [loadRequesters]);

  const selectRequester = useCallback((id: number) => {
    const selected = requesters.find((requester) => requester.id === id);
    if (!selected) return false;

    storage()?.setItem(DEVELOPMENT_REQUESTER_STORAGE_KEY, String(selected.id));
    persistedRequesterId.current = selected.id;
    setCurrentRequester(selected);
    setStatus("ready");
    setError(null);
    return true;
  }, [requesters]);

  const clearRequester = useCallback(() => {
    storage()?.removeItem(DEVELOPMENT_REQUESTER_STORAGE_KEY);
    persistedRequesterId.current = null;
    setCurrentRequester(null);
    setStatus("selection");
    setError(null);
  }, []);

  const value = useMemo<RequesterContextValue>(() => ({
    requesters,
    currentRequester,
    status,
    error,
    selectRequester,
    clearRequester,
    retry: () => { void loadRequesters(); },
  }), [clearRequester, currentRequester, error, loadRequesters, requesters, selectRequester, status]);

  return <RequesterContext.Provider value={value}>{children}</RequesterContext.Provider>;
}

export function useRequesterContext(): RequesterContextValue {
  const context = useContext(RequesterContext);
  if (!context) throw new Error("useRequesterContext must be used within RequesterContextProvider");
  return context;
}

export function RequesterScoped({ children }: { children: ReactNode }) {
  const { currentRequester } = useRequesterContext();
  if (!currentRequester) return null;
  return <Fragment key={currentRequester.id}>{children}</Fragment>;
}
