"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const links = [
  { href: "/", label: "Dashboard", icon: "\u25A9" },
  { href: "/people", label: "People", icon: "\u263A" },
  { href: "/organizations", label: "Organizations", icon: "\u2616" },
  { href: "/relationships", label: "Relationships", icon: "\u2194" },
  { href: "/interactions", label: "Introductions", icon: "\u260E" },
  { href: "/trends", label: "Trends", icon: "\u2197" },
  { href: "/export", label: "Export", icon: "\u21E9" },
];

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname === "/login") return null;

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="nav-rail" aria-label="Primary navigation">
      <div className="rail-brand">
        <span className="rail-brand-icon">C</span>
      </div>
      <nav className="rail-nav">
        {links.map((link) => {
          const isActive = link.href === "/"
            ? pathname === "/"
            : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`rail-link${isActive ? " active" : ""}`}
              title={link.label}
            >
              <span className="rail-icon" aria-hidden="true">{link.icon}</span>
              <span className="rail-label">{link.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="rail-foot">
        <button
          onClick={handleLogout}
          className="rail-link rail-btn"
          title="Sign out"
        >
          <span className="rail-icon" aria-hidden="true">{"\u2192"}</span>
          <span className="rail-label">Sign out</span>
        </button>
      </div>
    </aside>
  );
}
