import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { LogoMark } from "./LogoMark";

/** Brand lock-up. Logo image and store name come from admin settings. */
export async function Logo({ href = "/", tone = "ink" }: { href?: string; tone?: "ink" | "white" }) {
  const s = await getSettings();
  const name = s["brand.name"] || "subsel";
  const [head, tail] = [name.slice(0, Math.ceil(name.length / 2)), name.slice(Math.ceil(name.length / 2))];
  return (
    <Link href={href} className="inline-flex items-center gap-1.5" aria-label={`${name} home`}>
      <LogoMark src={s["brand.logoUrl"]} />
      <span className={`font-display text-[1.2rem] leading-none tracking-[-0.02em] ${tone === "white" ? "text-white" : "text-ink"}`}>
        <span className="font-medium">{head}</span>
        <span className={tone === "white" ? "text-white/70" : "text-slate"}>{tail}</span>
      </span>
    </Link>
  );
}
