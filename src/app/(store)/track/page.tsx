import { TrackOrderForm } from "@/components/TrackOrderForm";

export const metadata = { title: "Track an order — subsel" };

export default function TrackOrderPage() {
  return (
    <div className="shell max-w-4xl py-10 sm:py-16">
      <p className="eyebrow">Order tracking</p>
      <h1 className="h-display mt-2 text-4xl sm:text-5xl">Track an order</h1>
      <p className="mb-8 mt-3 max-w-2xl text-sm text-slate">
        Enter the order number and checkout phone number. This lookup does not sign you in or reveal the delivery OTP.
      </p>
      <TrackOrderForm />
    </div>
  );
}
