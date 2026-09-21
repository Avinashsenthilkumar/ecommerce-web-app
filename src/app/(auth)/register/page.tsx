import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser, safeNext } from "@/lib/auth";
import { RegisterForm } from "@/components/auth/RegisterForm";

export const metadata = { title: "Create account — subsel" };

export default async function RegisterPage({ searchParams }: { searchParams: { next?: string } }) {
  if (await getCurrentUser()) redirect("/");
  const next = safeNext(searchParams.next, "/");
  return (
    <div className="w-full max-w-sm">
      <div className="panel p-7">
        <h1 className="text-2xl font-bold">Create account</h1>
        <p className="mb-6 mt-1 text-sm text-slate">It takes less than a minute.</p>
        <RegisterForm next={next} />
      </div>
      <p className="mt-6 text-center text-sm text-slate">
        Already have an account?{" "}
        <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-pine hover:underline">Sign in</Link>
      </p>
    </div>
  );
}
