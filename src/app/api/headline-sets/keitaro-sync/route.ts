import { NextRequest } from "next/server";
import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  name: z.string().min(2),
  keitaroUrl: z.string().url(),
  apiKey: z.string().min(4),
  campaignId: z.string().optional(),
  geo: z.string().optional().nullable(),
});

// Mock headlines — simulates what Keitaro would return for a campaign
function mockKeitaroHeadlines(seed: string): Record<string, string> {
  const pools: Record<string, string[]> = {
    Z1: ["Lose 10kg in 30 days — guaranteed!", "Врачи в шоке от этого метода", "Похудей за 30 дней без диет"],
    Z2: ["Doctors don't want you to know this", "Этот трюк меняет всё", "Секрет который скрывают от вас"],
    Z3: ["I lost 25kg with one simple method", "Минус 15кг за месяц — реально", "Простой способ который работает"],
    Z4: ["Transform your body in just weeks", "Форма мечты без тренировок", "Результат за 21 день"],
    Z5: ["The diet pill the world is talking about", "Тренд который захватил мир", "Все об этом говорят"],
    Z6: ["No exercise. No starving. Real results.", "Без усилий — реальный результат", "Минус вес без диет и спорта"],
  };

  const result: Record<string, string> = {};
  const idx = seed.charCodeAt(0) % 3;
  for (const [z, variants] of Object.entries(pools)) {
    result[z] = variants[idx] ?? variants[0];
  }
  return result;
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const input = schema.parse(await req.json());

    // In production: fetch from Keitaro API
    // GET {keitaroUrl}/api/2/campaigns/{campaignId}
    // Headers: { Api-Key: apiKey }
    // Response has token params including Z1..ZN

    const headlines = mockKeitaroHeadlines(input.apiKey);

    const set = await prisma.headlineSet.create({
      data: {
        userId: user.id,
        name: input.name,
        source: "KEITARO",
        externalId: input.campaignId ?? null,
        geo: input.geo ? input.geo.toUpperCase() : null,
        headlinesJson: headlines,
      },
    });

    return ok({ set, headlines, zGroups: Object.keys(headlines) });
  } catch (error) {
    return fail(error);
  }
}
