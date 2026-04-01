import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type OrderItem = { slug: string; name: string; qty: number; price_pence: number };

type Order = {
  id: string;
  items: OrderItem[];
  total_pence: number;
  status: string;
  created_at: string;
};

export default async function OrdersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  const { data: orders } = await supabase
    .from("orders")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <div>
      <h1 className="text-2xl font-semibold">Orders</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--nrs-text-muted)" }}>Your full order history</p>

      {!orders || orders.length === 0 ? (
        <div className="mt-8 rounded-xl py-16 text-center" style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}>
          <p className="text-sm" style={{ color: "var(--nrs-text-muted)" }}>No orders yet.</p>
          <Link href="/#shop" className="mt-4 inline-block text-sm hover:underline" style={{ color: "var(--nrs-accent)" }}>
            Browse products →
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {(orders as Order[]).map((order) => (
            <div
              key={order.id}
              className="rounded-xl p-5"
              style={{ border: "1px solid var(--nrs-border-subtle)", background: "var(--nrs-card)" }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-medium text-sm" style={{ color: "var(--nrs-text)" }}>
                    Order #{order.id.slice(0, 8).toUpperCase()}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--nrs-text-muted)" }}>
                    {new Date(order.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-semibold" style={{ color: "var(--nrs-text)" }}>
                    £{(order.total_pence / 100).toFixed(2)}
                  </div>
                  <div
                    className="text-xs capitalize mt-0.5"
                    style={{
                      color:
                        order.status === "delivered"
                          ? "#34d399"
                          : order.status === "shipped"
                          ? "#60a5fa"
                          : "var(--nrs-text-muted)",
                    }}
                  >
                    {order.status}
                  </div>
                </div>
              </div>

              {order.items && order.items.length > 0 && (
                <div className="mt-4 pt-4 space-y-1.5" style={{ borderTop: "1px solid var(--nrs-border-subtle)" }}>
                  {order.items.map((item, i) => (
                    <div
                      key={i}
                      className="flex justify-between text-sm"
                      style={{ color: "var(--nrs-text-body)" }}
                    >
                      <span>
                        {item.name} × {item.qty}
                      </span>
                      <span>£{((item.price_pence * item.qty) / 100).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
