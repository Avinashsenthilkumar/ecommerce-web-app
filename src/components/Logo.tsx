import Link from "next/link";
import { LogoMark } from "./LogoMark";

/** subsel wordmark: swoosh mark + "sub" dark / "sel" light, as in the prototype. */
export function Logo({ href = "/", tone = "ink" }: { href?: string; tone?: "ink" | "white" }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5" aria-label="subsel home">
      <LogoMark />
      <span className={`font-display text-[1.2rem] leading-none tracking-[-0.02em] ${tone === "white" ? "text-white" : "text-ink"}`}>
        <span className="font-medium">sub</span>
        <span className={tone === "white" ? "text-white/70" : "text-slate"}>sel</span>
      </span>
    </Link>
  );
}
