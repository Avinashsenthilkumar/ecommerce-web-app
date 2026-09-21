"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";

export function SortSelect({ value, options }: { value: string; options: { key: string; label: string }[] }) {
  const router = useRouter();
  const params = useSearchParams();
  return (
    <div className="relative w-44">
      <select
        value={value}
        aria-label="Sort products"
        onChange={(e) => {
          const sp = new URLSearchParams(params.toString());
          sp.set("sort", e.target.value);
          router.push(`/shop?${sp.toString()}`);
        }}
        className="input appearance-none pr-10"
      >
        {options.map((o) => (
          <option key={o.key} value={o.key}>{o.label}</option>
        ))}
      </select>
      <ChevronDown size={15} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2" />
    </div>
  );
}
