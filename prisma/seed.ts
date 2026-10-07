import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();
const EMAIL = "eyenelandry44@gmail.com";
const PASSWORD = "admin123";
const COMPANY_ID = "demo-company";

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  // Idempotent demo/admin repair: an existing account is also upgraded to OWNER.
  const user = await db.user.upsert({
    where: { email: EMAIL },
    update: {
      passwordHash,
      firstName: "Admin",
      lastName: "BizManager",
      isActive: true,
      isSuperAdmin: true,
    },
    create: {
      email: EMAIL,
      firstName: "Admin",
      lastName: "BizManager",
      passwordHash,
      isActive: true,
      isSuperAdmin: true,
    },
  });

  const company = await db.company.upsert({
    where: { id: COMPANY_ID },
    update: {},
    create: {
      id: COMPANY_ID,
      name: "Mon Entreprise",
      currency: "XAF",
      timezone: "Africa/Libreville",
    },
  });

  await db.membership.upsert({
    where: { userId_companyId: { userId: user.id, companyId: company.id } },
    update: { role: "OWNER" },
    create: { userId: user.id, companyId: company.id, role: "OWNER" },
  });

  console.log(`Compte Owner prêt: ${EMAIL} / ${PASSWORD}`);
  console.log(`Entreprise: ${company.name} | rôle: OWNER`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(() => db.$disconnect());
