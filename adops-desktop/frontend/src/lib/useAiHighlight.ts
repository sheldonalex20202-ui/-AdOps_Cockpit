import { useEffect, useState } from "react";

/**
 * Returns true for ~2.5s after the AI dispatches an "ai:highlight" event
 * matching the given target name. Used to flash a green ring on action buttons
 * when the AI navigates to a page and wants to guide the user to a specific control.
 */
export function useAiHighlight(target: string): boolean {
  const [active, setActive] = useState(false);

  useEffect(() => {
    function handler(e: Event) {
      if ((e as CustomEvent<string>).detail === target) {
        setActive(true);
        const timer = setTimeout(() => setActive(false), 2500);
        return () => clearTimeout(timer);
      }
    }
    window.addEventListener("ai:highlight", handler);
    return () => window.removeEventListener("ai:highlight", handler);
  }, [target]);

  return active;
}
