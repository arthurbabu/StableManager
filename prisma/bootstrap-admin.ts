import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

/**
 * Creates exactly one ADMIN account on first run of a fresh deployment, from
 * ADMIN_EMAIL / ADMIN_PASSWORD / ADMIN_NAME env vars — no demo data, unlike
 * prisma/seed.ts which is for local development only. Safe to run on every
 * container start: it's a no-op once any user already exists.
 */
async function main() {
  const existingCount = await prisma.user.count();
  if (existingCount > 0) {
    console.log("Users already exist — skipping admin bootstrap.");
    return;
  }

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || "Admin";

  if (!email || !password) {
    console.log("ADMIN_EMAIL/ADMIN_PASSWORD not set — no admin account created.");
    return;
  }
  if (password.length < 8) {
    console.error("ADMIN_PASSWORD must be at least 8 characters — skipping admin bootstrap.");
    return;
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.create({
    data: { name, email, passwordHash, role: "ADMIN" },
  });
  console.log(`Created initial admin account: ${email}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
