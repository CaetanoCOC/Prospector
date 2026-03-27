import { cn } from "@/lib/utils";

interface BadgeStyle {
  label: string;
  bg: string;
  color: string;
  border: string;
}

const STATUS_CONFIG: Record<string, BadgeStyle> = {
  new: {
    label: "New",
    bg: "rgba(74,222,128,0.12)",
    color: "#4ade80",
    border: "rgba(74,222,128,0.2)",
  },
  contacted: {
    label: "Contacted",
    bg: "rgba(96,165,250,0.12)",
    color: "#60a5fa",
    border: "rgba(96,165,250,0.2)",
  },
  replied: {
    label: "Replied",
    bg: "rgba(251,191,36,0.12)",
    color: "#fbbf24",
    border: "rgba(251,191,36,0.2)",
  },
  converted: {
    label: "Converted",
    bg: "rgba(74,222,128,0.25)",
    color: "#4ade80",
    border: "rgba(74,222,128,0.4)",
  },
  removed: {
    label: "Removed",
    bg: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.30)",
    border: "rgba(255,255,255,0.10)",
  },
};

const EMAIL_CONFIG: Record<string, BadgeStyle> = {
  found: {
    label: "Email found",
    bg: "rgba(74,222,128,0.12)",
    color: "#4ade80",
    border: "rgba(74,222,128,0.2)",
  },
  not_found: {
    label: "No email",
    bg: "rgba(251,146,60,0.12)",
    color: "#fb923c",
    border: "rgba(251,146,60,0.2)",
  },
  pending: {
    label: "Not scraped",
    bg: "rgba(255,255,255,0.06)",
    color: "rgba(255,255,255,0.30)",
    border: "rgba(255,255,255,0.10)",
  },
};

const FALLBACK: BadgeStyle = {
  label: "",
  bg: "rgba(255,255,255,0.06)",
  color: "rgba(255,255,255,0.30)",
  border: "rgba(255,255,255,0.10)",
};

interface StatusBadgeProps {
  status: string;
  type?: "lead" | "email";
  className?: string;
}

export function StatusBadge({ status, type = "lead", className }: StatusBadgeProps) {
  const map = type === "email" ? EMAIL_CONFIG : STATUS_CONFIG;
  const config = map[status] ?? { ...FALLBACK, label: status };

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border leading-tight",
        className
      )}
      style={{
        background: config.bg,
        color: config.color,
        borderColor: config.border,
        backdropFilter: "blur(4px)",
      }}
    >
      {config.label}
    </span>
  );
}
