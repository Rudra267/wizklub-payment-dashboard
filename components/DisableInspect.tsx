"use client";

import { useEffect } from "react";

// Isolated global guard for common Inspect Element / DevTools shortcuts.
// Remove this component from app/layout.tsx to disable the behavior later.
export default function DisableInspect() {
  useEffect(() => {
    const blockAction = (event: Event) => {
      event.preventDefault();
      event.stopPropagation();
    };

    const handleContextMenu = (event: MouseEvent) => {
      blockAction(event);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      // Some browser/devtool-triggered events can arrive without a key value.
      const key = event.key?.toLowerCase() ?? "";
      const isCtrlShiftInspect =
        event.ctrlKey &&
        event.shiftKey &&
        (key === "i" || key === "j" || key === "c");
      const isCmdOptionInspect =
        event.metaKey &&
        event.altKey &&
        (key === "i" || key === "j" || key === "c");
      const isViewSource = event.ctrlKey && key === "u";
      const isDevToolsKey = event.key === "F12";

      // Only block the requested inspection shortcuts so normal typing,
      // clipboard shortcuts, forms, and app shortcuts continue working.
      if (
        isDevToolsKey ||
        isCtrlShiftInspect ||
        isCmdOptionInspect ||
        isViewSource
      ) {
        blockAction(event);
      }
    };

    document.addEventListener("contextmenu", handleContextMenu);
    document.addEventListener("keydown", handleKeyDown, true);

    return () => {
      document.removeEventListener("contextmenu", handleContextMenu);
      document.removeEventListener("keydown", handleKeyDown, true);
    };
  }, []);

  return null;
}
