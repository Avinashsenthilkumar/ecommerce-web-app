import Link from "next/link";
import clsx from "clsx";
import { getCurrentUser, ROLE_LABEL } from "@/lib/auth";
import { Logo } from "./Logo";
import { SignOutButton } from "./SignOutButton";

type Tab = { href: string; label: string };

export async function OpsShell({
  title,
  subtitle,
  tabs,
  active,
  children,
}: {
  title: string;
  subtitle: string;
  tabs: Tab[];
  active: string;
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  // Admin moves between every console; other roles only see their own screen.
  const visibleTabs = tabs.filter((t) => user?.role === "ADMIN" || t.href === active || (user?.role === "VENDOR" && t.href.startsWith("/vendor")));
  const loginPath = user?.role === "VENDOR" ? "/vendor/login" : "/staff/login";
  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-white">
        <div className="shell flex flex-wrap items-center gap-x-8 gap-y-3 py-4">
          <Logo />
          <div className="border-l border-line pl-6">
            <h1 className="text-base font-bold leading-tight">{title}</h1>
            <p className="text-xs text-slate">{subtitle}</p>
          </div>
          <nav className="ml-auto flex gap-1 rounded-full bg-mist p-1" aria-label="Operations">
            {visibleTabs.map((t) => (
              <Link
                key={t.href}
                href={t.href}
                aria-current={active === t.href ? "page" : undefined}
                className={clsx(
                  "rounded-full px-3.5 py-1.5 text-xs font-semibold",
                  active === t.href ? "bg-white text-ink shadow-sm" : "text-slate hover:text-ink",
                )}
              >
                {t.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="shell space-y-8 py-8">{children}</main>
      <footer className="border-t border-line bg-white">
        <div className="shell flex flex-wrap items-center justify-between gap-4 py-4">
          {user && (
            <p className="text-xs text-slate">
              Signed in as <b className="text-ink">{user.fullName}</b> ({ROLE_LABEL[user.role]})
            </p>
          )}
          <div className="flex items-center gap-3">
            <Link href="/" className="text-xs font-semibold text-slate hover:text-ink">View storefront</Link>
            <SignOutButton redirectTo={loginPath} />
          </div>
        </div>
      </footer>
    </div>
  );
}

export function StatCard({ label, value, hint, tone }: { label: string; value: string | number; hint: string; tone?: "warn" | "pine" }) {
  return (
    <div className="panel p-5">
      <p className="text-xs font-semibold text-slate">{label}</p>
      <p
        className={clsx(
          "mt-2 text-3xl font-bold tracking-tight tabular",
          tone === "warn" && "text-amber",
          tone === "pine" && "text-pine",
        )}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-slate">{hint}</p>
    </div>
  );
}

export function Section({ title, hint, action, children }: { title: string; hint?: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="panel overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line px-5 py-4">
        <div>
          <h2 className="text-base font-bold">{title}</h2>
          {hint && <p className="text-xs text-slate">{hint}</p>}
        </div>
        {action}
      </div>
      <div>{children}</div>
    </section>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="px-5 py-8 text-center text-sm text-slate">{children}</p>;
}
