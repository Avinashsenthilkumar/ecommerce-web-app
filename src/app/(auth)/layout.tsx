import Link from "next/link";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <header className="shell flex justify-center py-8">
        <Logo />
      </header>
      <main className="flex flex-1 justify-center px-5 pb-16">{children}</main>
      <footer className="border-t border-line bg-white py-5 text-center text-xs text-slate">
        <Link href="/" className="hover:text-ink">Conditions of use</Link>
        <span className="mx-3">·</span>
        <Link href="/" className="hover:text-ink">Privacy notice</Link>
        <span className="mx-3">·</span>
        <Link href="/" className="hover:text-ink">Help</Link>
        <p className="mt-2">© {new Date().getFullYear()} subsel</p>
      </footer>
    </div>
  );
}
