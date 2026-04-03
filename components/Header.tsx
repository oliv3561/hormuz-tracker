"use client";

import { useEffect, useState } from "react";

type StraitStatus = "CLOSED" | "RESTRICTED" | "OPEN";

interface HeaderProps {
  status: StraitStatus;
}

const STATUS_CONFIG: Record<StraitStatus, { label: string; dot: string; text: string }> = {
  CLOSED:     { label: "STRAIT CLOSED", dot: "#ef4444", text: "#fca5a5" },
  RESTRICTED: { label: "RESTRICTED",    dot: "#f59e0b", text: "#fde68a" },
  OPEN:       { label: "OPEN",          dot: "#22c55e", text: "#86efac" },
};

const NAV_LINKS: Array<{ label: string; href: string }> = [
  { label: "Dashboard",      href: "#top" },
  { label: "Vessel Intel",   href: "#vessel-intel" },
  { label: "Energy Markets", href: "#energy-markets" },
  { label: "News",           href: "#news" },
];

export default function Header({ status }: HeaderProps) {
  const [utcTime, setUtcTime] = useState<string>("");
  const [activeLink, setActiveLink] = useState("#top");

  useEffect(() => {
    function tick() {
      const now = new Date();
      setUtcTime(
        now.toUTCString().replace("GMT", "UTC").split(" ").slice(1, 5).join(" ")
      );
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const cfg = STATUS_CONFIG[status];

  function handleNavClick(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
    e.preventDefault();
    setActiveLink(href);
    if (href === "#top") {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const id = href.slice(1); // strip "#"
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        background: "#0f2557",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.25)",
      }}
    >
      <div
        style={{
          maxWidth: 1600,
          margin: "0 auto",
          padding: "0 24px",
          height: 56,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
        }}
      >
        {/* Left: Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div
            style={{
              width: 32,
              height: 32,
              background: "#fbbf24",
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
              <path
                d="M9 2C9 2 3 6.5 3 11C3 14.3 5.7 17 9 17C12.3 17 15 14.3 15 11C15 6.5 9 2 9 2Z"
                fill="#0f2557"
                opacity="0.95"
              />
              <circle cx="9" cy="11" r="2.5" fill="#fbbf24" />
            </svg>
          </div>
          <span
            style={{
              fontWeight: 800,
              fontSize: 16,
              color: "#ffffff",
              letterSpacing: "0.08em",
              fontFamily: "Inter, sans-serif",
            }}
          >
            HORMUZ TRACKER
          </span>
        </div>

        {/* Center: Nav links */}
        <nav
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            flex: 1,
            justifyContent: "center",
          }}
        >
          {NAV_LINKS.map(({ label, href }) => {
            const isActive = activeLink === href;
            return (
              <a
                key={href}
                href={href}
                onClick={(e) => handleNavClick(e, href)}
                style={{
                  fontFamily: "Inter, sans-serif",
                  fontSize: 12,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? "#fbbf24" : "rgba(255,255,255,0.7)",
                  textDecoration: "none",
                  padding: "4px 12px",
                  borderRadius: 4,
                  transition: "color 0.15s, background 0.15s",
                  background: isActive ? "rgba(251,191,36,0.1)" : "transparent",
                  letterSpacing: "0.02em",
                  whiteSpace: "nowrap",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.95)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLAnchorElement).style.color = "rgba(255,255,255,0.7)";
                  }
                }}
              >
                {label}
              </a>
            );
          })}
        </nav>

        {/* Right: Status badge + LIVE */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
          {/* Strait status pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 12px",
              borderRadius: 20,
              background: "rgba(255,255,255,0.06)",
              border: `1px solid ${cfg.dot}40`,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: cfg.dot,
                display: "inline-block",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontWeight: 700,
                fontSize: 11,
                color: cfg.text,
                letterSpacing: "0.06em",
                fontFamily: "Inter, sans-serif",
              }}
            >
              {cfg.label}
            </span>
          </div>

          {/* LIVE indicator + time */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "#16a34a",
                display: "inline-block",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                fontWeight: 700,
                fontSize: 11,
                color: "#4ade80",
                letterSpacing: "0.06em",
                fontFamily: "Inter, sans-serif",
              }}
            >
              LIVE
            </span>
            <span
              style={{
                fontWeight: 400,
                fontSize: 11,
                color: "rgba(255,255,255,0.45)",
                fontFamily: "monospace",
              }}
            >
              {utcTime || "--:--:-- UTC"}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
