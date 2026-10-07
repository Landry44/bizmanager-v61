import { NextResponse } from "next/server";
import { db } from "@/src/lib/db";
import { requireMembership } from "@/src/lib/auth";

const PLAN_LIMITS: Record<string, { price: number; maxUsers: number; maxProducts: number }> = {
  FREE: { price: 0, maxUsers: 2, maxProducts: 100 },
  BUSINESS: { price: 9900, maxUsers: 10, maxProducts: 5000 },
  ENTERPRISE: { price: 0, maxUsers: 100, maxProducts: 50000 },
};

export async function POST(
  req: Request,
  { params }: { params: Promise<{ companyId: string }> }
) {
  const { companyId } = await params;
  try {
    await requireMembership(companyId, ["OWNER", "ADMIN"]);

    const body = await req.json();
    const plan = body.plan as string;
    if (!plan || !PLAN_LIMITS[plan]) {
      return NextResponse.json({ error: "Plan invalide" }, { status: 400 });
    }

    const limits = PLAN_LIMITS[plan];

    const existing = await db.paymentOrder.findFirst({
      where: { companyId, plan, status: "PENDING" },
    });

    if (existing) {
      return NextResponse.json({ ok: true, alreadyPending: true, order: existing });
    }

    const order = await db.paymentOrder.create({
      data: {
        companyId,
        plan: plan as any,
        amount: limits.price,
        currency: "XAF",
        status: "PENDING",
      },
    });

    // Notifier les admins
    const admins = await db.membership.findMany({
      where: { companyId, role: { in: ["OWNER", "ADMIN"] } },
      select: { userId: true },
    });

    if (admins.length) {
      await db.notification.createMany({
        data: admins.map((a) => ({
          userId: a.userId,
          companyId,
          title: "Demande d'abonnement",
          message: `Une demande de passage au plan ${plan} a été créée.`,
        })),
      });
    }

    return NextResponse.json({ ok: true, order });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Erreur" }, { status: 400 });
  }
} Correction subscription
