import { NextResponse } from "next/server";

export async function POST() {
  // Webhook de paiement désactivé temporairement
  return NextResponse.json({ ok: true });
}
