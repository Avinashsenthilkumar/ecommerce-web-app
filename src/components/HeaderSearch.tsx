"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

/**
 * Search button in the header. Opening it drops a full-width search bar below
 * the header (the header is the positioning anchor), so it never sits on top of
 * the department row. The form is a plain GET to /shop, so it still submits if
 * JavaScript has not loaded yet.
 */
export function HeaderSearch() {
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const wrapper = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) input.current?.focus();
  }, [open]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const click = (e: MouseEvent) => {
      if (wrapper.current && !wrapper.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", esc);
    document.addEventListener("mousedown", click);
    return () => {
      document.removeEventListener("keydown", esc);
      document.removeEventListener("mousedown", click);
    };
  }, []);

  return (
    <div ref={wrapper} className="contents">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="icon-btn"
        aria-label={open ? "Close search" : "Search"}
        aria-expanded={open}
      >
        {open ? <X size={16} /> : <Search size={16} />}
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-50 border-y border-line bg-paper shadow-sm">
          <form action="/shop" className="shell flex gap-2 py-4" role="search">
            <input type="hidden" name="category" value="all" />
            <div className="relative flex-1">
              <Search
                size={15}
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate"
                aria-hidden
              />
              <input
                ref={input}
                name="q"
                className="input h-11 pl-10"
                placeholder="Search products, brands or SKU"
                aria-label="Search products, brands or SKU"
              />
            </div>
            <button className="btn-primary btn-sm h-11 px-5">Search</button>
          </form>
        </div>
      )}
    </div>
  );
}
