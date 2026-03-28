"use client";

import { useState } from "react";

type CartItem = { slug: string; name: string; qty: number; price: number };

// Minimal type for the RevolutCheckout global injected by their embed script
declare global {
  interface Window {
    RevolutCheckout?: (
      token: string,
      mode?: "prod" | "sandbox"
    ) => Promise<{
      payWithPopup: (options: {
        onSuccess: () => void;
        onError: (message: string) => void;
        onCancel: () => void;
      }) => void;
    }>;
  }
}

function loadRevolutScript(sandbox: boolean): Promise<void> {
  const src = sandbox
    ? "https://sandbox-merchant.revolut.com/embed.js"
    : "https://merchant.revolut.com/embed.js";

  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Revolut SDK"));
    document.head.appendChild(script);
  });
}

export default function RevolutPayButton({ items }: { items: CartItem[] }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sandbox = process.env.NEXT_PUBLIC_REVOLUT_ENV === "sandbox";

  async function handlePay() {
    setLoading(true);
    setError("");

    try {
      const total_pence = Math.round(
        items.reduce((sum, i) => sum + i.price * 100 * i.qty, 0)
      );

      const itemList = items
        .map((i) => `${i.name} ×${i.qty}`)
        .join(", ");

      // 1. Create the order server-side
      const res = await fetch("/api/checkout/revolut", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          total_pence,
          description: `SONCAR: ${itemList}`,
        }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Could not create order");
      }

      const { public_id } = (await res.json()) as { public_id: string };

      // 2. Load the Revolut embed script and open the payment popup
      await loadRevolutScript(sandbox);

      if (!window.RevolutCheckout) {
        throw new Error("Revolut SDK failed to initialise");
      }

      const instance = await window.RevolutCheckout(
        public_id,
        sandbox ? "sandbox" : "prod"
      );

      instance.payWithPopup({
        onSuccess() {
          // Clear cart key and redirect to success page
          try {
            localStorage.removeItem("soncar_cart_v1");
          } catch {}
          window.location.href = "/account/orders?payment=success";
        },
        onError(message) {
          setError(message || "Payment failed. Please try again.");
          setLoading(false);
        },
        onCancel() {
          setLoading(false);
        },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handlePay}
        disabled={loading || items.length === 0}
        className="w-full py-3 rounded-lg font-medium transition disabled:opacity-60 flex items-center justify-center gap-2 bg-neutral-100 hover:bg-white text-neutral-950 text-sm"
      >
        {loading ? (
          "Processing…"
        ) : (
          <>
            <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" aria-hidden>
              <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" />
            </svg>
            Pay with Revolut
          </>
        )}
      </button>
      {error && <p className="mt-2 text-rose-400 text-sm text-center">{error}</p>}
    </div>
  );
}
