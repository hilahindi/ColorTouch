import type { ReactNode } from "react";
import Sidebar, { type PageKey } from "./Sidebar";

interface DashboardLayoutProps {
  activePage: PageKey;
  onNavigate: (page: PageKey) => void;
  title: string;
  subtitle: string;
  children: ReactNode;
}

/**
 * "Modern Clean Intelligence": crisp white content area, a subtly-tinted
 * grey sidebar/surface color, thin light-grey borders instead of heavy
 * shadows, and a single indigo accent used only for the active nav item,
 * primary buttons, and focus rings — not decoratively elsewhere.
 */
export default function DashboardLayout({
  activePage,
  onNavigate,
  title,
  subtitle,
  children,
}: DashboardLayoutProps) {
  return (
    <div className="flex h-screen w-full overflow-hidden bg-white text-slate-900">
      <Sidebar activePage={activePage} onNavigate={onNavigate} />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-6 py-8 sm:px-10">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>
          {children}
        </div>
      </main>
    </div>
  );
}
