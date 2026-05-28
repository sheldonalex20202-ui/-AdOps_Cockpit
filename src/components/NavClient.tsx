"use client";

import { Activity, BriefcaseBusiness, FileClock, Layers3, Settings } from "lucide-react";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { NavLink } from "./ui";

const icons: Record<string, LucideIcon> = {
  accounts: BriefcaseBusiness,
  pools: Layers3,
  health: Activity,
  audit: FileClock,
  integrations: Settings
};

export function NavClient({ nav }: { nav: { href: string; label: string; icon: string }[] }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-1">
      {nav.map((item) => {
        const Icon = icons[item.icon] ?? BriefcaseBusiness;
        return (
          <NavLink key={item.href} href={item.href} active={pathname === item.href || pathname.startsWith(`${item.href}/`)}>
            <Icon size={17} />
            {item.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
