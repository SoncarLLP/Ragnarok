// components/Footer.tsx
export default function Footer() {
  return (
    <footer style={{ borderTop: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-panel)" }}>
      <div className="mx-auto max-w-7xl px-4 py-10 grid md:grid-cols-4 gap-8 text-sm">
        <div>
          <div className="font-semibold" style={{ color: "var(--nrs-text)" }}>Ragnarök</div>
          <p className="mt-2" style={{ color: "var(--nrs-text-muted)" }}>Functional proteins for hydration, recovery, and glow.</p>
        </div>

        <div>
          <div className="font-semibold" style={{ color: "var(--nrs-text)" }}>Shop</div>
          <ul className="mt-2 space-y-1" style={{ color: "var(--nrs-text-muted)" }}>
            <li><a href="#shop" className="hover:underline transition-colors">Freyja's Bloom</a></li>
            <li><a href="#shop" className="hover:underline transition-colors">Dümmens Nectar</a></li>
            <li><a href="#shop" className="hover:underline transition-colors">Loki Hell Fire</a></li>
          </ul>
        </div>

        <div>
          <div className="font-semibold" style={{ color: "var(--nrs-text)" }}>Info</div>
          <ul className="mt-2 space-y-1" style={{ color: "var(--nrs-text-muted)" }}>
            <li><a href="/policies" className="hover:underline transition-colors">Policies</a></li>
            <li><a href="#" className="hover:underline transition-colors">Privacy & Data</a></li>
            <li><a href="#" className="hover:underline transition-colors">Shipping & Returns</a></li>
            <li><a href="#" className="hover:underline transition-colors">Cookies</a></li>
            <li><a href="#" className="hover:underline transition-colors">Contact</a></li>
            <li><a href="/community" className="hover:underline transition-colors">Community</a></li>
            <li><a href="/account" className="hover:underline transition-colors">My Account</a></li>
            <li><a href="/auth/login" className="hover:underline transition-colors">Sign In</a></li>
          </ul>
        </div>

        <div>
          <div className="font-semibold" style={{ color: "var(--nrs-text)" }}>Newsletter</div>
          <p className="mt-2" style={{ color: "var(--nrs-text-muted)" }}>Be first to know about drops and deals.</p>
          <div className="mt-3 flex gap-2">
            <input type="email" placeholder="your@email.com"
              className="nrs-input px-3 py-2 rounded-md text-sm w-full max-w-xs" />
            <button className="px-3 py-2 rounded-md text-sm transition" style={{ background: "var(--nrs-btn-bg)", color: "var(--nrs-text-body)", border: "1px solid var(--nrs-btn-border)" }}>Join</button>
          </div>
          <p className="mt-2 text-xs" style={{ color: "var(--nrs-text-muted)" }}>No spam. Unsubscribe anytime.</p>
        </div>
      </div>
      <div className="py-6 text-xs text-center" style={{ borderTop: "1px solid var(--nrs-border-subtle)", color: "var(--nrs-text-muted)" }}>
        © {new Date().getFullYear()} SONCAR Limited · <a href="https://soncar.co.uk" className="hover:underline">soncar.co.uk</a> · All rights reserved.
      </div>
{/* Discreet admin link (screen-reader only unless focused) */}
<a
  href="/admin"
  className="sr-only focus:not-sr-only block text-center text-xs mt-2"
  style={{ color: "var(--nrs-text-muted)" }}
>
  Admin
</a>
    </footer>
  );
}
