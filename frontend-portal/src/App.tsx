import { useState } from "react";
import DashboardLayout from "./components/DashboardLayout";
import type { PageKey } from "./components/Sidebar";
import DashboardPage from "./pages/DashboardPage";
import AppConfigPage from "./pages/AppConfigPage";
import PersonalizationSimulator from "./components/PersonalizationSimulator";
import PromptTuningPage from "./pages/PromptTuningPage";
import SystemLogsPage from "./pages/SystemLogsPage";

const PAGE_META: Record<PageKey, { title: string; subtitle: string }> = {
  dashboard: {
    title: "Dashboard",
    subtitle: "Live analytics for this ColorTouch server instance.",
  },
  "app-config": {
    title: "App Configuration",
    subtitle: "Onboard an app and generate its base Material3 palette.",
  },
  simulator: {
    title: "Personalization Simulator",
    subtitle: "The core debug view: questionnaire in, AI request and response out.",
  },
  "prompt-tuning": {
    title: "Prompt Tuning",
    subtitle: "Edit the system prompt and test it live against real questionnaire answers.",
  },
  "system-logs": {
    title: "System Logs",
    subtitle: "A live feed of every request this server has handled.",
  },
};

function App() {
  const [activePage, setActivePage] = useState<PageKey>("dashboard");
  const { title, subtitle } = PAGE_META[activePage];

  return (
    <DashboardLayout activePage={activePage} onNavigate={setActivePage} title={title} subtitle={subtitle}>
      {activePage === "dashboard" && <DashboardPage />}
      {activePage === "app-config" && <AppConfigPage />}
      {activePage === "simulator" && <PersonalizationSimulator />}
      {activePage === "prompt-tuning" && <PromptTuningPage />}
      {activePage === "system-logs" && <SystemLogsPage />}
    </DashboardLayout>
  );
}

export default App;
