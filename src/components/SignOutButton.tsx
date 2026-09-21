"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { callApi } from "@/lib/client/api";

export function SignOutButton({ className = "btn-outline btn-sm", redirectTo = "/" }: { className?: string; redirectTo?: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className={className}
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await callApi("/api/auth/logout", "POST");
        } finally {
          router.replace(redirectTo);
          router.refresh();
        }
      }}
    >
      {busy ? "Signing out…" : "Sign out"}
    </button>
  );
}
