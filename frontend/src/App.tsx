import { useState } from "react";
import { Sidebar, type Page } from "@/components/Sidebar";
import { Dashboard } from "@/pages/Dashboard";
import { Search } from "@/pages/Search";
import { Leads } from "@/pages/Leads";
import { Campaigns } from "@/pages/Campaigns";
import { Templates } from "@/pages/Templates";
import { SettingsPage } from "@/pages/Settings";

export default function App() {
  const [page, setPage] = useState<Page>("dashboard");

  const renderPage = () => {
    switch (page) {
      case "dashboard":  return <Dashboard />;
      case "search":     return <Search />;
      case "leads":      return <Leads />;
      case "campaigns":  return <Campaigns />;
      case "templates":  return <Templates />;
      case "settings":   return <SettingsPage />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: "var(--bg)" }}>
      <Sidebar current={page} onChange={setPage} />
      <main
        className="flex-1 overflow-y-auto"
        style={{
          background: "radial-gradient(ellipse 70% 40% at 55% 0%, rgba(74,222,128,0.055) 0%, transparent 65%), var(--bg)",
        }}
      >
        {renderPage()}
      </main>
    </div>
  );
}
