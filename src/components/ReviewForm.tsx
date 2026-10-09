"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star } from "lucide-react";
import clsx from "clsx";
import { callApi } from "@/lib/client/api";

export function ReviewForm({
  productId,
  verified = false,
}: {
  productId: string;
  /** True when this customer has actually received the product. */
  verified?: boolean;
}) {
  const router = useRouter();
  const [, start] = useTransition();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await callApi("/api/reviews", "POST", { productId, rating, comment: comment || undefined });
      start(() => router.refresh());
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-[24px] border border-line bg-white p-5">
      <p className="text-sm font-medium">
        {verified ? "You bought this. How was it?" : "Rate this product"}
      </p>
      {verified && (
        <p className="mt-1 text-xs text-pine">
          Your review will show a verified purchase badge.
        </p>
      )}
      <div className="mt-3 flex gap-1" role="radiogroup" aria-label="Rating" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={rating === n}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            className="p-1"
          >
            <Star size={22} className={clsx((hover || rating) >= n ? "fill-ink text-ink" : "text-line")} />
          </button>
        ))}
      </div>
      <textarea className="input mt-3 min-h-[90px]" placeholder="What did you like or dislike? (optional)" value={comment} onChange={(e) => setComment(e.target.value)} maxLength={1000} />
      {error && <p className="mt-2 text-sm text-sale">{error}</p>}
      <button disabled={busy || rating === 0} className="btn-primary mt-3">
        {busy ? "Posting…" : "Post review"}
      </button>
      {rating === 0 && !error && (
        <p className="mt-2 text-xs text-slate">Choose a star rating to post.</p>
      )}
    </form>
  );
}
