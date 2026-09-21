import Link from "next/link";
import type { Role } from "@prisma/client";
import { ROLE_HOME, ROLE_LABEL } from "@/lib/auth";
import { Logo } from "./Logo";
import { SignOutButton } from "./SignOutButton";

/** Shown when a signed-in user opens a console their role cannot use. */
export function AccessGate({ need, user }: { need: Role; user: { fullName: string; role: Role } }) {
  const loginPath = need === "VENDOR" ? "/vendor/login" : "/staff/login";
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-5">
      <div className="panel w-full max-w-lg space-y-5 p-8">
        <Logo />
        <div>
          <h1 className="text-xl font-bold">You don&apos;t have access to this screen</h1>
          <p className="mt-1 text-sm text-slate">
            It is for the {ROLE_LABEL[need]} team. You are signed in as {user.fullName} ({ROLE_LABEL[user.role]}).
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link href={ROLE_HOME[user.role]} className="btn-primary">
            {user.role === "CUSTOMER" ? "Back to shopping" : "Go to your console"}
          </Link>
          <SignOutButton className="btn-outline" redirectTo={loginPath} />
        </div>
      </div>
    </div>
  );
}
