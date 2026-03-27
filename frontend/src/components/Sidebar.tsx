import { useState } from "react";
import {
  LayoutDashboard, Upload, Users, Send, FileText, Settings,
  ChevronLeft, ChevronRight, Crosshair,
} from "lucide-react";

export type Page = "dashboard" | "search" | "leads" | "campaigns" | "templates" | "settings";

const NAV: { id: Page; label: string; icon: React.ElementType }[] = [
  { id: "dashboard",  label: "Dashboard",  icon: LayoutDashboard },
  { id: "search",     label: "Importar",   icon: Upload },
  { id: "leads",      label: "Leads",      icon: Users },
  { id: "campaigns",  label: "Campaigns",  icon: Send },
  { id: "templates",  label: "Templates",  icon: FileText },
  { id: "settings",   label: "Settings",   icon: Settings },
];

export function Sidebar({ current, onChange }: { current: Page; onChange: (p: Page) => void }) {
  const [collapsed, setCollapsed] = useState(false);
  const W = collapsed ? 56 : 224;

  return (
    <aside
      style={{
        width: W,
        minWidth: W,
        background: "var(--surface-1)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        flexShrink: 0,
        transition: `width 220ms cubic-bezier(0.23,1,0.32,1), min-width 220ms cubic-bezier(0.23,1,0.32,1)`,
        overflow: "hidden",
      }}
    >
      {/* Logo */}
      <div
        style={{
          height: 56,
          display: "flex",
          alignItems: "center",
          padding: collapsed ? "0 16px" : "0 18px",
          gap: 10,
          borderBottom: "1px solid var(--border)",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 28, height: 28,
            borderRadius: 8,
            background: "var(--green-mid)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 0 16px rgba(74,222,128,0.28), 0 0 0 1px rgba(74,222,128,0.2)",
          }}
        >
          <Crosshair size={14} color="#050a05" strokeWidth={2.5} />
        </div>
        <span
          style={{
            fontWeight: 600,
            fontSize: 14,
            letterSpacing: "-0.3px",
            color: "var(--text-1)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            opacity: collapsed ? 0 : 1,
            maxWidth: collapsed ? 0 : 120,
            transition: "opacity 160ms, max-width 160ms",
          }}
        >
          Prospector
        </span>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: "6px 8px", overflowY: "auto", overflowX: "hidden" }}>
        {NAV.map(({ id, label, icon: Icon }) => {
          const active = current === id;
          return (
            <div key={id} style={{ position: "relative", marginBottom: 2 }}>
              {active && (
                <span style={{
                  position: "absolute",
                  left: 0, top: "50%", transform: "translateY(-50%)",
                  width: 3, height: 20,
                  borderRadius: "0 2px 2px 0",
                  background: "var(--green-bright)",
                }} />
              )}
              <button
                onClick={() => onChange(id)}
                title={collapsed ? label : undefined}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: collapsed ? 0 : 9,
                  justifyContent: collapsed ? "center" : "flex-start",
                  padding: collapsed ? "9px 0" : "8px 11px",
                  borderRadius: 7,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 500,
                  background: active ? "var(--surface-4)" : "transparent",
                  color: active ? "var(--green-bright)" : "var(--text-2)",
                  transition: "background 80ms, color 80ms",
                  fontFamily: "inherit",
                }}
                onMouseEnter={e => {
                  if (!active) {
                    (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-3)";
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--text-1)";
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    (e.currentTarget as HTMLButtonElement).style.background = "transparent";
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--text-2)";
                  }
                }}
              >
                <Icon size={15} style={{ flexShrink: 0, color: active ? "var(--green-bright)" : "var(--text-3)" }} />
                <span style={{
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  opacity: collapsed ? 0 : 1,
                  maxWidth: collapsed ? 0 : 140,
                  transition: "opacity 140ms, max-width 140ms",
                }}>
                  {label}
                </span>
              </button>
            </div>
          );
        })}
      </nav>

      {/* Collapse */}
      <div style={{ padding: "8px", borderTop: "1px solid var(--border)", flexShrink: 0 }}>
        <button
          onClick={() => setCollapsed(!collapsed)}
          title={collapsed ? "Expand" : "Collapse"}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: collapsed ? "center" : "flex-start",
            gap: collapsed ? 0 : 8,
            padding: collapsed ? "9px 0" : "8px 11px",
            borderRadius: 7,
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: "var(--text-3)",
            fontSize: 12,
            fontFamily: "inherit",
            transition: "background 80ms, color 80ms",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.background = "var(--surface-3)";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text-2)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.background = "transparent";
            (e.currentTarget as HTMLButtonElement).style.color = "var(--text-3)";
          }}
        >
          {collapsed ? <ChevronRight size={14} /> : (
            <>
              <ChevronLeft size={14} />
              <span style={{ whiteSpace: "nowrap", overflow: "hidden", opacity: collapsed ? 0 : 1, transition: "opacity 120ms" }}>
                Collapse
              </span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
