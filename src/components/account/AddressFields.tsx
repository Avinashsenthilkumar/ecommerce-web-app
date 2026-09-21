"use client";

export type AddressValue = { name: string; phone: string; line1: string; line2: string; city: string; state: string; pincode: string };

export const emptyAddress = (name = "", phone = ""): AddressValue => ({ name, phone, line1: "", line2: "", city: "", state: "Tamil Nadu", pincode: "" });

const FIELDS: { k: keyof AddressValue; label: string; props: React.InputHTMLAttributes<HTMLInputElement> }[] = [
  { k: "name", label: "Full name", props: { required: true, autoComplete: "name" } },
  { k: "phone", label: "Phone", props: { required: true, inputMode: "tel", autoComplete: "tel" } },
  { k: "line1", label: "Address line 1", props: { required: true, autoComplete: "address-line1" } },
  { k: "line2", label: "Address line 2", props: { autoComplete: "address-line2" } },
  { k: "city", label: "City", props: { required: true, autoComplete: "address-level2" } },
  { k: "state", label: "State", props: { required: true, autoComplete: "address-level1" } },
  { k: "pincode", label: "Pin code", props: { required: true, inputMode: "numeric", maxLength: 6, autoComplete: "postal-code" } },
];

export function AddressFields({ value, onChange, idPrefix = "addr" }: { value: AddressValue; onChange: (v: AddressValue) => void; idPrefix?: string }) {
  return (
    <div className="grid gap-x-4 gap-y-5 sm:grid-cols-2">
      {FIELDS.map((f) => (
        <div key={f.k}>
          <label className="label" htmlFor={`${idPrefix}-${f.k}`}>{f.label}</label>
          <input id={`${idPrefix}-${f.k}`} className="input" value={value[f.k]} onChange={(e) => onChange({ ...value, [f.k]: e.target.value })} {...f.props} />
        </div>
      ))}
    </div>
  );
}

export function formatAddress(a: AddressValue) {
  return `${a.line1}${a.line2 ? `, ${a.line2}` : ""}, ${a.city}, ${a.state} ${a.pincode}`;
}
