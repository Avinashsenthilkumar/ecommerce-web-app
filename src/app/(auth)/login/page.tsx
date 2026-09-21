import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, ROLE_HOME, safeNext } from "@/lib/auth";
import { LoginForm } from "@/components/auth/LoginForm";
import { DemoAccounts } from "@/components/auth/DemoAccounts";

export const metadata = { title: "Sign in — subsel" };

export default async function LoginPage({ searchParams }: { searchParams: { next?: string } }) {
  const user = await getCurrentUser();
  if (user) redirect(safeNext(searchParams.next, ROLE_HOME[user.role]));
  const next = safeNext(searchParams.next, "/");
  return (
    <div className="w-full max-w-sm">
      <div className="panel p-7">
        <h1 className="text-2xl font-bold">Sign in</h1>
        <p className="mb-6 mt-1 text-sm text-slate">Track orders, save addresses and check out faster.</p>
        <LoginForm portal="customer" next={next} submitLabel="Continue" />
      </div>
      <div className="mt-6 text-center">
        <p className="text-xs text-slate">New to subsel?</p>
        <Link href={`/register?next=${encodeURIComponent(next)}`} className="btn-outline mt-2 w-full">Create your subsel account</Link>
      </div>
      <DemoAccounts accounts={[["Customer", "priya@subsel.demo"]]} />
    </div>
  );
}
