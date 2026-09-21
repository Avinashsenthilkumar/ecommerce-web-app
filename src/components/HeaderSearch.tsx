"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";

/** Circle search button that opens a search bar under the header. */
export function HeaderSearch() {
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) input.current?.focus();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", esc);
    return () => document.removeEventListener("keydown", esc);
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen((o) => !o)} className="icon-btn" aria-label="Search" aria-expanded={open}>
        {open ? <X size={16} /> : <Search size={16} />}
      </button>
      {open && (
        <div className="absolute inset-x-0 top-full border-b border-line bg-paper">
          <form action="/shop" className="shell flex gap-3 py-4" role="search">
            <input type="hidden" name="category" value="all" />
            <input ref={input} name="q" className="input" placeholder="Search products or brands" aria-label="Search products or brands" />
            <button className="btn-primary">Search</button>
          </form>
        </div>
      )}
    </>
  );
}
