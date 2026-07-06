import { useEffect, useState } from "react";

const LOGS_ENDPOINT = "http://localhost:3000/logs";
const POLL_INTERVAL_MS = 3000;

interface LogEntry {
  timestamp: string;
  method: string;
  path: string;
  status: number;
  duration_ms: number;
}

function statusColor(status: number): string {
  if (status >= 500) return "text-red-600";
  if (status >= 400) return "text-amber-600";
  if (status >= 200 && status < 300) return "text-green-600";
  return "text-slate-500";
}

export default function SystemLogsPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    let cancelled = false;

    function fetchLogs() {
      fetch(LOGS_ENDPOINT)
        .then((res) => {
          if (!res.ok) throw new Error(`Failed to load logs (status ${res.status})`);
          return res.json();
        })
        .then((data: { logs: LogEntry[] }) => {
          if (!cancelled) setLogs(data.logs);
        })
        .catch((err) => {
          if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load logs.");
        });
    }

    fetchLogs();
    if (!autoRefresh) return;

    const interval = setInterval(fetchLogs, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [autoRefresh]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
        <p className="text-sm text-slate-500">
          Every request the server has handled this session, newest first.
        </p>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/30"
          />
          Live (auto-refresh every 3s)
        </label>
      </div>

      {error && <div className="px-5 py-4 text-sm text-red-600">{error}</div>}

      {!error && logs.length === 0 && (
        <div className="px-5 py-8 text-center text-sm text-slate-400">No requests recorded yet.</div>
      )}

      {!error && logs.length > 0 && (
        <div className="max-h-[36rem] overflow-y-auto">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-400">
              <tr>
                <th className="px-5 py-2 font-medium">Time</th>
                <th className="px-5 py-2 font-medium">Method</th>
                <th className="px-5 py-2 font-medium">Path</th>
                <th className="px-5 py-2 font-medium">Status</th>
                <th className="px-5 py-2 font-medium">Duration</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, index) => (
                <tr key={`${log.timestamp}-${index}`} className="border-t border-slate-100">
                  <td className="whitespace-nowrap px-5 py-2 font-mono text-xs text-slate-500">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="px-5 py-2 font-mono text-xs font-semibold text-slate-700">
                    {log.method}
                  </td>
                  <td className="px-5 py-2 font-mono text-xs text-slate-600">{log.path}</td>
                  <td className={`px-5 py-2 font-mono text-xs font-semibold ${statusColor(log.status)}`}>
                    {log.status}
                  </td>
                  <td className="px-5 py-2 font-mono text-xs text-slate-400">{log.duration_ms}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
