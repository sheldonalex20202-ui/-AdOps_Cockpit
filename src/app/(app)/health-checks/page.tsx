import { Badge, Card, Empty, Table, statusTone } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { ru } from "@/lib/i18n";
import { prisma } from "@/lib/prisma";

export default async function HealthChecksPage() {
  const user = await requireUser();
  const checks = await prisma.accountHealthCheck.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { adAccount: true }
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-black">Health checks</h1>
        <p className="text-sm text-slate-500">Readiness-история по кабинетам без любых механик обхода правил платформ.</p>
      </div>
      {checks.length === 0 ? <Empty text="Проверок пока нет. Запустите проверку на странице кабинетов." /> : (
        <Card>
          <Table>
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-field text-xs text-slate-500">
                <tr>
                  <th className="p-3">Время</th>
                  <th>Кабинет</th>
                  <th>External ID</th>
                  <th>Meta статус</th>
                  <th>Readiness</th>
                  <th>Score</th>
                  <th>Checks</th>
                </tr>
              </thead>
              <tbody>
                {checks.map((check) => (
                  <tr key={check.id} className="border-t border-line">
                    <td className="p-3">{check.createdAt.toLocaleString("ru-RU")}</td>
                    <td className="font-bold">{check.adAccount.name}</td>
                    <td>{check.adAccount.externalId}</td>
                    <td><Badge tone={statusTone(check.adAccount.status)}>{ru(check.adAccount.status)}</Badge></td>
                    <td><Badge tone={statusTone(check.status)}>{ru(check.status)}</Badge></td>
                    <td className="font-bold">{check.score}</td>
                    <td className="max-w-[360px] truncate">{JSON.stringify(check.checksJson)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Table>
        </Card>
      )}
    </div>
  );
}
