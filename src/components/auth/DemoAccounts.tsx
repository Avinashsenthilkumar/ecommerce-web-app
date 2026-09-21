/** Shown only in development so the team can test every portal. Never rendered in production builds. */
export function DemoAccounts({ accounts }: { accounts: [string, string][] }) {
  if (process.env.NODE_ENV === "production") return null;
  return (
    <div className="mt-6 rounded-xl border border-dashed border-line p-4 text-xs text-slate">
      <p className="font-semibold text-ink">Development accounts (password Subsel@123)</p>
      <ul className="mt-2 space-y-1 tabular">
        {accounts.map(([role, email]) => (
          <li key={email}>
            {role}: <span className="font-medium text-ink">{email}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
