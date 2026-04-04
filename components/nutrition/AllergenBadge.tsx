interface AllergenBadgeProps {
  allergens: string[];
  memberAllergens?: string[];
  className?: string;
}

export default function AllergenBadge({ allergens, memberAllergens = [], className = "" }: AllergenBadgeProps) {
  if (!allergens || allergens.length === 0) return null;

  const hasConflict = memberAllergens.some(ma =>
    allergens.some(a => a.toLowerCase().includes(ma.toLowerCase()) || ma.toLowerCase().includes(a.toLowerCase()))
  );

  if (hasConflict) {
    return (
      <div
        className={`flex flex-wrap gap-1 ${className}`}
        aria-label="Allergen warning"
      >
        <div
          className="w-full text-xs font-bold px-2 py-1 rounded"
          style={{ background: "#fee2e2", color: "#dc2626", border: "1px solid #fca5a5" }}
        >
          ⚠️ Contains allergens you avoid
        </div>
        {allergens.slice(0, 4).map((a) => {
          const isConflict = memberAllergens.some(ma =>
            a.toLowerCase().includes(ma.toLowerCase()) || ma.toLowerCase().includes(a.toLowerCase())
          );
          return (
            <span
              key={a}
              className="text-[10px] px-1.5 py-0.5 rounded"
              style={{
                background: isConflict ? "#fee2e2" : "var(--nrs-panel)",
                color: isConflict ? "#dc2626" : "var(--nrs-text-muted)",
                border: isConflict ? "1px solid #fca5a5" : "1px solid var(--nrs-border)",
                fontWeight: isConflict ? 600 : 400,
              }}
            >
              {a}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      {allergens.slice(0, 4).map((a) => (
        <span
          key={a}
          className="text-[10px] px-1.5 py-0.5 rounded"
          style={{ background: "var(--nrs-panel)", color: "var(--nrs-text-muted)", border: "1px solid var(--nrs-border)" }}
        >
          {a}
        </span>
      ))}
      {allergens.length > 4 && (
        <span className="text-[10px]" style={{ color: "var(--nrs-text-muted)" }}>
          +{allergens.length - 4} more
        </span>
      )}
    </div>
  );
}
