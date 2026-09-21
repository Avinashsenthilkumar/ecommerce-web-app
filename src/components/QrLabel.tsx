"use client";

import { QRCodeSVG } from "qrcode.react";

export function QrLabel({ value, size = 88 }: { value: string; size?: number }) {
  return (
    <div className="inline-flex rounded-lg border border-line bg-white p-2">
      <QRCodeSVG value={value} size={size} level="M" fgColor="#1B2127" />
    </div>
  );
}
