import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-5 text-center">
      <Logo />
      <h1 className="h-display text-5xl">This page is not on the shelf.</h1>
      <p className="max-w-md text-slate">The link may be old, or the product is no longer listed.</p>
      <Link href="/shop?category=all" className="btn-primary">Browse all products</Link>
    </div>
  );
}
