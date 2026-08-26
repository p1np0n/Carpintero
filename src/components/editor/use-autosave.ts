import * as React from "react";
import { autosaveDesign } from "@/app/actions/projects";
import { useDesignStore } from "@/store/design-store";
import type { Design } from "@/lib/design-engine/types";

/** Debounced autosave: writes the in-memory design to Supabase ~800ms after the
 * last edit, and reflects idle/saving/saved/error in the store for the UI. */
export function useAutosave(projectId: string | null, design: Design) {
  const setSaveStatus = useDesignStore((s) => s.setSaveStatus);
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const skipFirstRef = React.useRef(true);

  React.useEffect(() => {
    if (!projectId) return;
    if (skipFirstRef.current) {
      skipFirstRef.current = false;
      return;
    }
    setSaveStatus("saving");
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(async () => {
      try {
        await autosaveDesign(projectId, design);
        setSaveStatus("saved");
      } catch {
        setSaveStatus("error");
      }
    }, 800);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [design, projectId]);
}
