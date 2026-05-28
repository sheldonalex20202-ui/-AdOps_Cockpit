import {
  Activity, BriefcaseBusiness, FileClock, History, Image,
  Layers3, Rocket, Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import clsx from "clsx";

const icons: Record<string, LucideIcon> = {
  launch:       Rocket,
  history:      History,
  creatives:    Image,
  accounts:     BriefcaseBusiness,
  pools:        Layers3,
  health:       Activity,
  audit:        FileClock,
  integrations: Settings,
};

interface NavItem {
  page: string;
  label: string;
  icon: string;
}

interface Props {
  nav: NavItem[];
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function NavClient({ nav, currentPage, onNavigate }: Props) {
  return (
    <div className="space-y-0.5">
      {nav.map((item) => {
        const Icon = icons[item.icon] ?? BriefcaseBusiness;
        const active = currentPage === item.page || currentPage.startsWith(item.page + "/");
        return (
          <button
            key={item.page}
            onClick={() => onNavigate(item.page)}
            className={clsx(
              "flex w-full items-center gap-2.5 rounded px-2.5 py-[7px] text-left text-[13px] font-medium transition-colors select-none",
              active
                ? "bg-selected text-brand"
                : "text-muted hover:bg-raised hover:text-ink"
            )}
          >
            <Icon
              size={15}
              className={clsx("shrink-0", active ? "text-brand" : "text-muted")}
            />
            <span>{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
