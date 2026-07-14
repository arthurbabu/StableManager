import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireUser, canManage } from "@/lib/auth-helpers";
import { Card, PageHeader, EmptyState, Badge, Button, Input, Select } from "@/components/ui";
import { createHorse } from "./actions";

export default async function HorsesPage() {
  const user = await requireUser();
  const isManager = canManage(user.role);

  const horses = await prisma.horse.findMany({
    orderBy: [{ active: "desc" }, { name: "asc" }],
    include: {
      _count: { select: { careTasks: { where: { done: false } } } },
    },
  });

  return (
    <div>
      <PageHeader title="Horses" subtitle={`${horses.filter((h) => h.active).length} active`} />

      {isManager && (
        <Card className="mb-6">
          <h2 className="mb-3 font-medium text-stone-900 dark:text-stone-50">
            Add a horse
          </h2>
          <form action={createHorse} className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Input type="text" name="name" placeholder="Name" required className="col-span-2 md:col-span-1" />
            <Input type="text" name="breed" placeholder="Breed" />
            <Input type="text" name="color" placeholder="Color" />
            <Select name="sex" defaultValue="">
              <option value="">Sex (optional)</option>
              <option value="MARE">Mare</option>
              <option value="GELDING">Gelding</option>
              <option value="STALLION">Stallion</option>
            </Select>
            <Input type="date" name="dateOfBirth" />
            <Input type="text" name="notes" placeholder="Notes" className="col-span-2 md:col-span-2" />
            <Button type="submit" className="col-span-2 md:col-span-4">
              Add horse
            </Button>
          </form>
        </Card>
      )}

      {horses.length === 0 ? (
        <EmptyState message="No horses yet." />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {horses.map((horse) => (
            <Link key={horse.id} href={`/horses/${horse.id}`}>
              <Card className={`h-full transition hover:border-emerald-600 ${horse.active ? "" : "opacity-50"}`}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-stone-900 dark:text-stone-50">
                      {horse.name}
                    </p>
                    <p className="text-sm text-stone-500 dark:text-stone-400">
                      {[horse.breed, horse.color].filter(Boolean).join(" · ") || "—"}
                    </p>
                  </div>
                  {!horse.active && <Badge color="gray">Inactive</Badge>}
                </div>
                {horse._count.careTasks > 0 && (
                  <div className="mt-3">
                    <Badge color="amber">{horse._count.careTasks} open task{horse._count.careTasks > 1 ? "s" : ""}</Badge>
                  </div>
                )}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
