import { redirect } from "next/navigation";
import { getCurrentUser, ROLE_HOME, safeNext } from "@/lib/auth";
import { LoginForm } from "@/components/auth/LoginForm";
import { DemoAccounts } from "@/components/auth/DemoAccounts";

export const metadata = { title: "Staff login — subsel operations", robots: { index: false } };

export default async function StaffLoginPage({ searchParams }: { searchParams: { next?: string } }) {
  const user = await getCurrentUser();
  if (user && user.role !== "CUSTOMER" && user.role !== "VENDOR") redirect(safeNext(searchParams.next, ROLE_HOME[user.role]));
  return (
    <div className="w-full max-w-sm">
      <div className="panel p-7">
        <h1 className="text-2xl font-bold">Staff login</h1>
        <p className="mb-6 mt-1 text-sm text-slate">Admin, warehouse, hub and courier teams.</p>
        <LoginForm portal="staff" next={searchParams.next} />
      </div>
      <DemoAccounts
        accounts={[
          ["Admin", "admin@subsel.demo"],
          ["Warehouse", "floor@subsel.demo"],
          ["Hub", "hub@subsel.demo"],
          ["Courier", "ravi@subsel.demo"],
        ]}
      />
    </div>
  );
}
