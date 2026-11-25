import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown } from "lucide-react";

export interface DropdownItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  to?: string;
  onClick?: () => void;
  danger?: boolean;
  dividerBefore?: boolean;
}

interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: DropdownItem[];
  align?: "left" | "right";
  label?: string;
  tone?: "light" | "dark";
}

export function DropdownMenu({
  trigger,
  items,
  align = "right",
  label = "Open menu",
  tone = "light",
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleOutside);
    window.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      window.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  const isDark = tone === "dark";

  return (
    <div ref={containerRef} className="relative inline-block">
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((prev) => !prev)}
        className={`inline-flex items-center gap-2 rounded-[5px] border px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer ${
          isDark
            ? "border-white/20 bg-white/10 hover:bg-white/15 text-white"
            : "border-[#DCE4EC] bg-white hover:bg-[#F6F8FA] text-[#102030]"
        }`}
      >
        {trigger}
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-150 ${
            isDark ? "text-slate-200" : "text-[#5A6B7C]"
          } ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: 4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
            className={`absolute ${
              align === "right" ? "right-0" : "left-0"
            } mt-2 w-56 bg-white border border-[#DCE4EC] rounded-[5px] shadow-[0_10px_28px_rgba(16,32,48,0.12)] py-1.5 z-50`}
          >
            {items.map((item) => {
              const colorClass = item.danger
                ? "text-[#BE123C] hover:bg-[#FDF1F3]"
                : "text-[#102030] hover:bg-[#EDF3F7]";

              return (
                <div key={item.id}>
                  {item.dividerBefore && <div className="my-1 border-t border-[#DCE4EC]" />}
                  {item.to ? (
                    <Link
                      to={item.to}
                      role="menuitem"
                      onClick={() => setOpen(false)}
                      className={`flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium ${colorClass}`}
                    >
                      {item.icon}
                      <span className="truncate">{item.label}</span>
                    </Link>
                  ) : (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setOpen(false);
                        item.onClick?.();
                      }}
                      className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-left cursor-pointer ${colorClass}`}
                    >
                      {item.icon}
                      <span className="truncate">{item.label}</span>
                    </button>
                  )}
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
