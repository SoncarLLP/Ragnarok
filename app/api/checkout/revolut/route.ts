import { NextResponse } from "next/server";

const REVOLUT_API_URL =
  process.env.REVOLUT_ENV === "sandbox"
    ? "https://sandbox-merchant.revolut.com/api/orders"
    : "https://merchant.revolut.com/api/orders";

export async function POST(req: Request) {
  if (!process.env.REVOLUT_API_SECRET_KEY) {
    return NextResponse.json({ error: "Revolut not configured" }, { status: 500 });
  }

  const body = (await req.json()) as {
    total_pence: number;
    description?: string;
  };

  if (!Number.isInteger(body.total_pence) || body.total_pence <= 0) {
    return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
  }

  const res = await fetch(REVOLUT_API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.REVOLUT_API_SECRET_KEY}`,
      "Content-Type": "application/json",
      "Revolut-Api-Version": "2024-09-01",
    },
    body: JSON.stringify({
      amount: body.total_pence,
      currency: "GBP",
      capture_mode: "AUTOMATIC",
      description: body.description ?? "SONCAR Order",
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("Revolut order creation failed:", text);
    return NextResponse.json({ error: "Could not create payment order" }, { status: 502 });
  }

  const order = (await res.json()) as { public_id: string; id: string };
  return NextResponse.json({ public_id: order.public_id });
}
