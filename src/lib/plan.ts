import { getSubscription, PLAN_LIMITS, planActive } from "./subscription";

export type Feature =
  | "BASIC"
  | "ADVANCED_REPORTS"
  | "ADVANCED_TREASURY"
  | "ADVANCED_DOCUMENTS"
  | "ADVANCED_RETURNS"
  | "ADVANCED_PAYROLL";

export async function requirePlanFeature(companyId: string, feature: Feature) {
  const sub = await getSubscription(companyId);
  const active = planActive(sub);
  const trial = sub.status === "TRIALING" && sub.trialEndsAt >= new Date();
  const basic = active && (sub.plan === "BUSINESS" || sub.plan === "ENTERPRISE" || trial);
  const advanced = active && sub.plan === "ENTERPRISE";

  const allowed = feature === "BASIC" ? basic : advanced;
  if (!allowed) {
    const label = sub.plan === "ENTERPRISE" ? "Avancé" : sub.plan === "BUSINESS" ? "Basic" : "Free";
    throw new PlanError(
      feature === "BASIC"
        ? "Cette fonction nécessite un abonnement Basic ou Avancé actif."
        : "Cette fonction est réservée à l'abonnement Avancé (10 000 FCFA/mois)."
    );
  }
  return sub;
}

export class PlanError extends Error {
  code = "PLAN_UPGRADE_REQUIRED";
  status = 403;
  constructor(message: string) { super(message); }
}

export function planLabel(plan: keyof typeof PLAN_LIMITS) {
  return PLAN_LIMITS[plan].label;
}
