import { createClient } from "@supabase/supabase-js";
import { PrismaClient } from "@prisma/client";
import { calculateAccountHealth } from "../src/lib/account-health";
import { makeMockAccounts } from "../src/lib/mock-accounts";

const prisma = new PrismaClient();

const email = "owner@example.com";
const password = "password123";

function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function upsertAuthUser() {
  const admin = supabaseAdmin();
  const { data: users, error: listError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) throw listError;
  const existing = users.users.find((user) => user.email === email);
  if (existing) {
    const { data, error } = await admin.auth.admin.updateUserById(existing.id, {
      password,
      email_confirm: true,
      app_metadata: { app: "adops-cockpit" }
    });
    if (error) throw error;
    return data.user;
  }
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    app_metadata: { app: "adops-cockpit" }
  });
  if (error || !data.user) throw error ?? new Error("Failed to create auth user");
  return data.user;
}

async function main() {
  const authUser = await upsertAuthUser();

  await prisma.auditLog.deleteMany();
  await prisma.accountHealthCheck.deleteMany();
  await prisma.accountPoolItem.deleteMany();
  await prisma.accountPool.deleteMany();
  await prisma.metaAdAccount.deleteMany();
  await prisma.metaConnection.deleteMany();
  await prisma.user.deleteMany();

  const user = await prisma.user.create({
    data: {
      authUserId: authUser.id,
      email,
      name: "Demo Buyer"
    }
  });

  const connection = await prisma.metaConnection.create({
    data: { userId: user.id, name: "Meta mock", status: "MOCK" }
  });

  await prisma.metaAdAccount.createMany({
    data: makeMockAccounts(user.id, connection.id, 32),
    skipDuplicates: true
  });

  const accounts = await prisma.metaAdAccount.findMany({ where: { userId: user.id }, orderBy: { externalId: "asc" } });
  const pools = await prisma.$transaction([
    prisma.accountPool.create({ data: { userId: user.id, name: "Готовые к запуску", description: "Кабинеты с высоким readiness score", color: "#2563eb" } }),
    prisma.accountPool.create({ data: { userId: user.id, name: "Scale", description: "Кабинеты под масштабирование", color: "#16a34a" } }),
    prisma.accountPool.create({ data: { userId: user.id, name: "Проблемные", description: "Нужна проверка токена, биллинга или статуса", color: "#dc2626" } })
  ]);

  for (const account of accounts) {
    const health = calculateAccountHealth(account);
    await prisma.accountHealthCheck.create({
      data: { userId: user.id, adAccountId: account.id, score: health.score, status: health.status, checksJson: health.checks }
    });
    await prisma.metaAdAccount.update({
      where: { id: account.id },
      data: { readinessScore: health.score, readinessStatus: health.status, lastHealthCheckAt: new Date() }
    });
    const pool = health.status === "READY" ? pools[0] : health.status === "NEEDS_ATTENTION" ? pools[1] : pools[2];
    await prisma.accountPoolItem.create({ data: { userId: user.id, poolId: pool.id, adAccountId: account.id } });
  }

  await prisma.auditLog.createMany({
    data: [
      { userId: user.id, action: "seed.completed", objectType: "User", objectId: user.id, result: "SUCCESS", newValueJson: { accounts: accounts.length } },
      { userId: user.id, action: "integration.meta_mock_sync", objectType: "MetaConnection", objectId: connection.id, result: "SUCCESS", newValueJson: { createdAccounts: accounts.length } }
    ]
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
