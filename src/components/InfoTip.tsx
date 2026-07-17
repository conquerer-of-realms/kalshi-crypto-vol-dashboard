import { useEffect, useRef, useState } from "react";

interface InfoTipProps {
  label: string;
}

/**
 * Small "?" affordance that reveals an explanatory bubble. Works via mouse
 * hover/focus AND via tap on touch devices (click toggles open, a click
 * outside or Escape closes it) -- spec: "Tooltips work on touch and mouse."
 */
export function InfoTip({ label }: InfoTipProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span
      className="info-tip"
      ref={rootRef}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="info-tip__trigger"
        aria-expanded={open}
        aria-label="More information"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        onFocus={() => setOpen(true)}
      >
        ?
      </button>
      {open && (
        <span role="tooltip" className="info-tip__bubble">
          {label}
        </span>
      )}
    </span>
  );
}
