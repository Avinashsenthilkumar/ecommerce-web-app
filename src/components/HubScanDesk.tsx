"use client";

import { useState } from "react";
import { ScanForm } from "./ScanForm";

/** Free scan desk: choose the hub you are standing at, then scan any parcel. */
export function HubScanDesk({ hubs }: { hubs: { id: string; name: string }[] }) {
  const [hubId, setHubId] = useState(hubs[0]?.id ?? "");
  return (
    <div className="grid gap-3 md:grid-cols-[14rem_1fr] md:items-start">
      <div>
        <label className="label" htmlFor="hub-select">Scanning at</label>
        <select id="hub-select" className="input" value={hubId} onChange={(e) => setHubId(e.target.value)}>
          {hubs.map((h) => (
            <option key={h.id} value={h.id}>{h.name}</option>
          ))}
        </select>
      </div>
      <div>
        <span className="label">Parcel</span>
        <ScanForm key={hubId} url="/api/hub" body={{ hubId }} placeholder="Scan QR or type tracking number" buttonLabel="Scan" />
      </div>
    </div>
  );
}
