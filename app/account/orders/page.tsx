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
      <p className="mt-1 text-sm text-neutral-400">Your full order history</p>

      {!orders || orders.length === 0 ? (
        <div className="mt-8 rounded-xl border border-white/10 bg-white/5 py-16 text-center">
          <p className="text-neutral-400 text-sm">No orders yet.</p>
          <Link href="/#shop" className="mt-4 inline-block text-sm text-white hover:underline">
            Browse products →
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {(orders as Order[]).map((order) => (
            <div
              key={order.id}
              className="rounded-xl border border-white/10 bg-white/5 p-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-medium text-sm">
                    Order #{order.id.slice(0, 8).toUpperCase()}
                  </div>
                  <div className="text-xs text-neutral-400 mt-0.5">
                    {new Date(order.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-semibold">
                    £{(order.total_pence / 100).toFixed(2)}
                  </div>
                  <div
                    className={`text-xs capitalize mt-0.5 ${
                      order.status === "delivered"
                        ? "text-emerald-400"
                        : order.status === "shipped"
                        ? "text-blue-400"
                        : "text-neutral-400"
                    }`}
                  >
                    {order.status}
                  </div>
                </div>
              </div>

              {order.items && order.items.length > 0 && (
                <div className="mt-4 pt-4 border-t border-white/10 space-y-1.5">
                  {order.items.map((item, i) => (
                    <div
                      key={i}
                      className="flex justify-between text-sm text-neutral-300"
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
