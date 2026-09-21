"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { User } from "lucide-react";
import { SignOutButton } from "./SignOutButton";

type Props = { user: { firstName: string; isCustomer: boolean; consoleHref: string | null } | null };

export function AccountMenu({ user }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={user ? `Account, signed in as ${user.firstName}` : "Sign in"}
        className="icon-btn"
      >
        <User size={16} />
      </button>

      {open && (
        <div role="menu" className="absolute right-0 top-full z-50 mt-2 w-64 rounded-3xl border border-line bg-white p-2 shadow-[0_20px_50px_-20px_rgba(28,25,23,0.25)]">
          {!user ? (
            <div className="p-3">
              <p className="mb-3 text-sm font-medium">Welcome to subsel</p>
              <Link href="/login" className="btn-primary w-full" onClick={() => setOpen(false)}>Sign in</Link>
              <p className="mt-3 text-center text-xs text-slate">
                New customer?{" "}
                <Link href="/register" className="font-semibold text-pine hover:underline" onClick={() => setOpen(false)}>Start here</Link>
              </p>
            </div>
          ) : (
            <>
              <p className="px-3 pb-1 pt-2 text-sm font-medium">Hello, {user.firstName}</p>
              {user.isCustomer ? (
                <nav className="flex flex-col py-1 text-sm" onClick={() => setOpen(false)}>
                  <Link role="menuitem" href="/account" className="rounded-lg px-3 py-2 hover:bg-mist">Your account</Link>
                  <Link role="menuitem" href="/orders" className="rounded-lg px-3 py-2 hover:bg-mist">Your orders</Link>
                  <Link role="menuitem" href="/wishlist" className="rounded-lg px-3 py-2 hover:bg-mist">Your wishlist</Link>
                  <Link role="menuitem" href="/account#addresses" className="rounded-lg px-3 py-2 hover:bg-mist">Saved addresses</Link>
                </nav>
              ) : (
                <div className="px-3 py-2 text-sm">
                  <p className="text-xs text-slate">You are signed in with a work account.</p>
                  {user.consoleHref && (
                    <Link href={user.consoleHref} className="mt-2 inline-block font-semibold text-pine hover:underline" onClick={() => setOpen(false)}>
                      Open your console
                    </Link>
                  )}
                </div>
              )}
              <div className="border-t border-line p-2">
                <SignOutButton className="btn-ghost btn-sm w-full justify-start px-3" />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
