"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Menu, X } from "lucide-react";
import type { NavigationItem } from "@/lib/settings";

export function MobileDepartmentMenu({ items }: { items: NavigationItem[] }) {
  const [open, setOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;

    if (open && !element.open) element.showModal();
    if (!open && element.open) element.close();

    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-controls="mobile-departments"
        className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border border-line bg-white px-3 text-sm font-medium text-ink hover:border-ink/40 lg:hidden"
      >
        <Menu size={17} aria-hidden="true" />
        <span>Menu</span>
      </button>
      <dialog
        ref={dialog}
        id="mobile-departments"
        aria-labelledby="mobile-departments-title"
        onClose={() => setOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setOpen(false);
        }}
        className="fixed inset-y-0 left-0 m-0 h-dvh max-h-none w-[min(86vw,22rem)] max-w-none overflow-hidden border-0 border-r border-line bg-paper p-0 text-ink shadow-2xl backdrop:bg-ink/45"
      >
        <div className="flex h-full flex-col">
          <div className="flex shrink-0 items-center justify-between border-b border-line px-5 py-4">
            <div>
              <p className="eyebrow">Explore</p>
              <h2 id="mobile-departments-title" className="mt-1 text-lg font-semibold">
                Browse departments
              </h2>
            </div>
            <button
              type="button"
              autoFocus
              onClick={() => setOpen(false)}
              aria-label="Close menu"
              className="icon-btn"
            >
              <X size={18} />
            </button>
          </div>
          <nav
            aria-label="Departments"
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3"
          >
            <ul className="space-y-1">
              {items.map((item, index) => (
                <li key={`${item.href}-${index}`}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    className={`flex min-h-12 items-center justify-between rounded-xl px-4 text-sm transition-colors ${
                      item.style === "pill"
                        ? "bg-ink text-white hover:bg-ink/85"
                        : "text-ink hover:bg-mist"
                    }`}
                  >
                    <span>{item.label}</span>
                    <span aria-hidden="true" className="text-slate">›</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
          <p className="shrink-0 border-t border-line px-5 py-3 text-xs text-slate">
            Choose a department to explore products.
          </p>
        </div>
      </dialog>
    </>
  );
}
