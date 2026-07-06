export interface LogEntry {
  timestamp: string;
  method: string;
  path: string;
  status: number;
  duration_ms: number;
}

const MAX_LOGS = 200;

// In-memory ring buffer, newest first. Resets on server restart — fine for
// a dev/debug feed, not a substitute for real request logging in production.
const logs: LogEntry[] = [];

export function recordLog(entry: LogEntry): void {
  logs.unshift(entry);
  if (logs.length > MAX_LOGS) logs.length = MAX_LOGS;
}

export function getRecentLogs(): LogEntry[] {
  return logs;
}
