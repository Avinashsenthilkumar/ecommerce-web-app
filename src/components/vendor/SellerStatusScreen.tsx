import Link from "next/link";
import type { Vendor } from "@prisma/client";
import { Clock, XCircle, Ban } from "lucide-react";
import { fmtDate } from "@/lib/format";
import { Logo } from "../Logo";
import { SignOutButton } from "../SignOutButton";

/** What a seller sees until an admin approves them (or after rejection / suspension). */
export function SellerStatusScreen({ vendor }: { vendor: Vendor }) {
  const view =
    vendor.status === "PENDING"
      ? { icon: Clock, tone: "text-amber", title: "Your application is under review", text: "Our team checks every seller before they can list products. This usually takes one working day. Refresh this page any time to check." }
      : vendor.status === "REJECTED"
        ? { icon: XCircle, tone: "text-sale", title: "Your application was not approved", text: "Please read the reason below. Contact seller support if you would like us to take another look." }
        : { icon: Ban, tone: "text-sale", title: "Your seller account is suspended", text: "Your listings are hidden from the store while the account is suspended." };
  const Icon = view.icon;
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-5 py-10">
      <div className="panel w-full max-w-xl p-8 sm:p-10">
        <Logo />
        <Icon size={28} className={`mt-8 ${view.tone}`} />
        <h1 className="h-display mt-4 text-[2rem] leading-tight">{view.title}</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-slate">{view.text}</p>
        {vendor.rejectionReason && vendor.status !== "PENDING" && (
          <p className="mt-5 rounded-2xl bg-mist px-4 py-3 text-sm"><span className="font-medium">Reason:</span> {vendor.rejectionReason}</p>
        )}
        <dl className="mt-6 grid gap-3 border-t border-line pt-6 text-sm sm:grid-cols-2">
          <div><dt className="text-slate">Business</dt><dd>{vendor.businessName}</dd></div>
          <div><dt className="text-slate">Applied on</dt><dd>{fmtDate(vendor.createdAt)}</dd></div>
          {vendor.gstin && <div><dt className="text-slate">GSTIN</dt><dd className="tabular">{vendor.gstin}</dd></div>}
        </dl>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/vendor" className="btn-primary">Refresh status</Link>
          <SignOutButton className="btn-outline" redirectTo="/vendor/login" />
        </div>
      </div>
    </div>
  );
}
