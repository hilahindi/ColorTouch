export type PageKey =
  | "dashboard"
  | "app-config"
  | "simulator"
  | "prompt-tuning"
  | "system-logs";

interface NavItem {
  key: PageKey;
  label: string;
  description: string;
}

const NAV_ITEMS: NavItem[] = [
  { key: "dashboard", label: "Dashboard", description: "Analytics" },
  { key: "app-config", label: "App Configuration", description: "Base palette & metadata" },
  { key: "simulator", label: "Personalization Simulator", description: "The core debug view" },
  { key: "prompt-tuning", label: "Prompt Tuning", description: "Edit the system prompt" },
  { key: "system-logs", label: "System Logs", description: "Live SDK call feed" },
];

interface SidebarProps {
  activePage: PageKey;
  onNavigate: (page: PageKey) => void;
}

export default function Sidebar({ activePage, onNavigate }: SidebarProps) {
  return (
    <aside className="flex h-full w-64 flex-shrink-0 flex-col border-r border-slate-200 bg-[#F8F9FA] px-3 py-6">
      <div className="mb-6 px-3">
        <p className="text-sm font-bold tracking-tight text-slate-900">ColorTouch</p>
        <p className="text-xs text-slate-400">Developer Dashboard</p>
      </div>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = item.key === activePage;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onNavigate(item.key)}
              className={`rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                active
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900"
              }`}
            >
              <div className="font-medium">{item.label}</div>
              <div className={`text-xs ${active ? "text-indigo-100" : "text-slate-400"}`}>
                {item.description}
              </div>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
