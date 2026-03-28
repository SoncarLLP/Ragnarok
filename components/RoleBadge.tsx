export default function RoleBadge({ role }: { role?: string | null }) {
  if (role === "super_admin") {
    return (
      <span title="Super Admin" aria-label="Super Admin" className="text-amber-400 leading-none">
        👑
      </span>
    );
  }
  if (role === "admin") {
    return (
      <span title="Admin" aria-label="Admin" className="text-blue-400 leading-none">
        🛡️
      </span>
    );
  }
  return null;
}
