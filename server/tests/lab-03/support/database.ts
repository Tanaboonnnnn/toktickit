import path from "node:path";

export interface DatabaseSafetyInput {
  developmentUrl?: string;
  testUrl?: string;
}

interface DatabaseIdentity {
  protocol: "postgresql";
  hostname: string;
  port: string;
  database: string;
}

function canonicalDatabaseHost(hostname: string): string {
  let normalized = hostname.trim().toLowerCase();
  if (normalized.endsWith(".")) normalized = normalized.slice(0, -1);
  if (normalized.startsWith("[") && normalized.endsWith("]")) {
    normalized = normalized.slice(1, -1);
  }

  if (normalized === "localhost" || normalized === "::1") return "loopback";

  const ipv4Octets = normalized.split(".");
  if (
    ipv4Octets.length === 4
    && ipv4Octets.every((part) => /^\d+$/.test(part) && Number(part) >= 0 && Number(part) <= 255)
    && Number(ipv4Octets[0]) === 127
  ) {
    return "loopback";
  }

  if (/^::ffff:7f[0-9a-f]{2}:[0-9a-f]{1,4}$/i.test(normalized)) return "loopback";

  return normalized;
}

function parsePostgresIdentity(value: string, label: string): DatabaseIdentity {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${label} must be a valid PostgreSQL URL`);
  }
  if (url.protocol !== "postgres:" && url.protocol !== "postgresql:") {
    throw new Error(`${label} must be a valid PostgreSQL URL`);
  }
  const database = decodeURIComponent(url.pathname.replace(/^\/+/, "")).trim().toLowerCase();
  if (!database) throw new Error(`${label} must be a valid PostgreSQL URL with a database name`);
  return {
    protocol: "postgresql",
    hostname: canonicalDatabaseHost(url.hostname),
    port: url.port || "5432",
    database,
  };
}

export function assertDistinctTestDatabase({ developmentUrl, testUrl }: DatabaseSafetyInput): void {
  if (!developmentUrl) throw new Error("DATABASE_URL is required before test database use");
  if (!testUrl) throw new Error("TEST_DATABASE_URL is required before test database use");
  const development = parsePostgresIdentity(developmentUrl, "DATABASE_URL");
  const test = parsePostgresIdentity(testUrl, "TEST_DATABASE_URL");
  if (
    development.hostname === test.hostname
    && development.port === test.port
    && development.database === test.database
  ) {
    throw new Error("TEST_DATABASE_URL must not resolve to the development database");
  }
}

function canonicalPath(value: string): string {
  return path.resolve(value).replace(/[\\/]+$/, "").toLowerCase();
}

function isSameOrChild(parent: string, candidate: string): boolean {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

export function assertSeparateUploadRoots(liveRoot: string, testRoot: string): void {
  if (!liveRoot?.trim() || !testRoot?.trim()) throw new Error("Live and test upload roots are required");
  const live = canonicalPath(liveRoot);
  const test = canonicalPath(testRoot);
  if (isSameOrChild(live, test) || isSameOrChild(test, live)) {
    throw new Error("Test upload root must not overlap the live upload root");
  }
}
