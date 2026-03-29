import Link from "next/link";

/**
 * Renders plain text with @username tokens highlighted in amber.
 *
 * linkable (default true)  — renders mentions as clickable <Link> elements
 *                            pointing to /account/profile/[username].
 *                            Set to false when inside another <Link> to avoid
 *                            nested anchor invalid HTML (e.g. PostCard feed).
 */
export default function MentionText({
  text,
  linkable = true,
}: {
  text: string;
  linkable?: boolean;
}) {
  // Split on @username tokens; the capture group keeps the tokens in the array.
  const parts = text.split(/(@[a-zA-Z0-9_.-]+)/g);

  return (
    <>
      {parts.map((part, i) => {
        if (/^@[a-zA-Z0-9_.-]+$/.test(part)) {
          const username = part.slice(1);
          if (linkable) {
            return (
              <Link
                key={i}
                href={`/account/profile/${username}`}
                className="text-amber-400 hover:text-amber-300 font-medium"
                onClick={(e) => e.stopPropagation()}
              >
                {part}
              </Link>
            );
          }
          // Non-linkable: styled span only (avoids nested <a> in PostCard)
          return (
            <span key={i} className="text-amber-400 font-medium">
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </>
  );
}
