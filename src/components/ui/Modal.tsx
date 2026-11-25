import React, { useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidthClass?: string;
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  maxWidthClass = "max-w-md",
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bf-modal-title"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={onClose}
            className="fixed inset-0 bg-[#102030]/60 backdrop-blur-[1px]"
            aria-hidden="true"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 6 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className={`relative z-10 w-full ${maxWidthClass} bg-white border border-[#DCE4EC] rounded-[5px] shadow-[0_14px_34px_rgba(16,32,48,0.18)] overflow-hidden text-[#102030]`}
          >
            <div className="px-4 sm:px-6 py-4 border-b border-[#DCE4EC] flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 id="bf-modal-title" className="text-sm font-bold font-heading text-[#102030] break-words">
                  {title}
                </h2>
                {description && (
                  <p className="text-xs text-[#5A6B7C] mt-0.5 break-words">{description}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close modal"
                className="p-1 shrink-0 text-[#5A6B7C] hover:text-[#102030] hover:bg-[#EDF3F7] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-4 sm:px-6 py-5 text-sm text-[#3B4C5E] min-w-0">{children}</div>

            {footer && (
              <div className="px-4 sm:px-6 py-3.5 bg-[#F6F8FA] border-t border-[#DCE4EC] flex flex-wrap items-center justify-end gap-2.5">
                {footer}
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
