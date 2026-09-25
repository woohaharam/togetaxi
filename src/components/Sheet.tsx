"use client";

import { useEffect } from "react";
import { CloseIcon } from "./icons";

/** 화면 아래에서 올라오는 패널 */
export default function Sheet({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-40 mx-auto flex max-w-md flex-col justify-end bg-black/30"
      onClick={onClose}
      role="dialog"
      aria-modal
      aria-label={title}
    >
      <div
        className="max-h-[85dvh] overflow-y-auto rounded-t-3xl bg-white px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[17px] font-semibold">{title}</h2>
          <button className="grid size-10 place-items-center" onClick={onClose} aria-label="닫기">
            <CloseIcon />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
