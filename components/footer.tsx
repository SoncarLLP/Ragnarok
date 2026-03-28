// components/Footer.tsx
export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-neutral-950/60">
      <div className="mx-auto max-w-7xl px-4 py-10 grid md:grid-cols-4 gap-8 text-sm">
        <div>
          <div className="font-semibold">SONCAR</div>
          <p className="mt-2 text-neutral-400">Functional proteins for hydration, recovery, and glow.</p>
        </div>

        <div>
          <div className="font-semibold">Shop</div>
          <ul className="mt-2 space-y-1 text-neutral-400">
            <li><a href="#shop" className="hover:text-white">Freyja’s Bloom</a></li>
            <li><a href="#shop" className="hover:text-white">Dümmens Nectar</a></li>
            <li><a href="#shop" className="hover:text-white">Loki Hell Fire</a></li>
          </ul>
        </div>

        <div>
          <div className="font-semibold">Info</div>
          <ul className="mt-2 space-y-1 text-neutral-400">
            <li><a href="/policies" className="hover:text-white">Policies</a></li>
            <li><a href="#" className="hover:text-white">Privacy & Data</a></li>
            <li><a href="#" className="hover:text-white">Shipping & Returns</a></li>
            <li><a href="#" className="hover:text-white">Cookies</a></li>
            <li><a href="#" className="hover:text-white">Contact</a></li>
            <li><a href="/community" className="hover:text-white">Community</a></li>
            <li><a href="/account" className="hover:text-white">My Account</a></li>
            <li><a href="/auth/login" className="hover:text-white">Sign In</a></li>
          </ul>
        </div>

        <div>
          <div className="font-semibold">Newsletter</div>
          <p className="mt-2 text-neutral-400">Be first to know about drops and deals.</p>
          <div className="mt-3 flex gap-2">
            <input type="email" placeholder="your@email.com"
              className="bg-neutral-800 px-3 py-2 rounded-md text-sm text-neutral-100 w-full max-w-xs" />
            <button className="px-3 py-2 rounded-md bg-white/10 hover:bg-white/20 text-sm">Join</button>
          </div>
          <p className="mt-2 text-xs text-neutral-500">No spam. Unsubscribe anytime.</p>
        </div>
      </div>
      <div className="border-t border-white/10 py-6 text-xs text-neutral-500 text-center">
        © {new Date().getFullYear()} SONCAR Limited · <a href="https://soncar.co.uk" className="hover:text-white">soncar.co.uk</a> · All rights reserved.
      </div>
{/* Discreet admin link (screen-reader only unless focused) */}
<a
  href="/admin"
  className="sr-only focus:not-sr-only block text-center text-neutral-600 hover:text-white text-xs mt-2"
>
  Admin
</a>
    </footer>
  );
}
