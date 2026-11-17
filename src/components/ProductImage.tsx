"use client";

import { useState } from "react";
import clsx from "clsx";
import Image from "next/image";

export function ProductImage({
  src,
  alt,
  className,
  sizes = "50vw",
  priority = false,
}: {
  src?: string | null;
  alt: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  const imageUrl = src?.trim() ?? "";
  const isConfiguredImage = (() => {
    try {
      const url = new URL(imageUrl);
      return (
        url.protocol === "https:" &&
        url.hostname === "res.cloudinary.com" &&
        url.pathname.includes("/image/upload/")
      );
    } catch {
      return false;
    }
  })();

  if (isConfiguredImage && imageUrl !== failedSrc) {
    return (
      <Image
        src={imageUrl}
        alt={alt}
        width={1200}
        height={1500}
        sizes={sizes}
        priority={priority}
        decoding="async"
        className={clsx("object-cover", className)}
        onError={() => setFailedSrc(imageUrl)}
      />
    );
  }

  return (
    <div
      role="img"
      aria-label={alt}
      className={clsx(
        "bg-gradient-to-br from-mist to-pineSoft",
        className,
      )}
    />
  );
}
