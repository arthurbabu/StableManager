import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-helpers";
import { Card, PageHeader, Badge, Button, Input, Select } from "@/components/ui";
import { createStaffAccount, setUserActive, setUserRole } from "./actions";

const roleColor = {
  ADMIN: "red",
  MANAGER: "blue",
  STAFF: "gray",
} as const;

export default async function UsersAdminPage() {
  const currentUser = await requireRole(["ADMIN"]);
  const t = await getTranslations("Admin");
  const tCommon = await getTranslations("Common");
  const tRoles = await getTranslations("Roles");

  const users = await prisma.user.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />

      <Card className="mb-6">
        <h2 className="mb-3 font-medium text-stone-900 dark:text-stone-50">
          {t("createAccount")}
        </h2>
        <form action={createStaffAccount} className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <Input type="text" name="name" placeholder={t("fullName")} required />
          <Input type="email" name="email" placeholder={tCommon("email")} required />
          <Input type="password" name="password" placeholder={t("passwordHint")} required minLength={8} />
          <Select name="role" defaultValue="STAFF">
            <option value="STAFF">{tRoles("STAFF")}</option>
            <option value="MANAGER">{tRoles("MANAGER")}</option>
            <option value="ADMIN">{tRoles("ADMIN")}</option>
          </Select>
          <Button type="submit" className="col-span-2 md:col-span-4">
            {t("createAccountButton")}
          </Button>
        </form>
      </Card>

      <Card>
        <h2 className="mb-3 font-medium text-stone-900 dark:text-stone-50">{t("team")}</h2>
        <div className="space-y-2">
          {users.map((u) => (
            <div
              key={u.id}
              className={`flex flex-wrap items-center justify-between gap-3 rounded-lg bg-stone-50 p-3 text-sm dark:bg-neutral-800 ${
                u.active ? "" : "opacity-50"
              }`}
            >
              <div>
                <p className="font-medium text-stone-700 dark:text-stone-200">{u.name}</p>
                <p className="text-stone-400">{u.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge color={roleColor[u.role]}>{tRoles(u.role)}</Badge>

                {u.id !== currentUser.id && (
                  <>
                    <form action={setUserRole} className="flex items-center gap-1">
                      <input type="hidden" name="id" value={u.id} />
                      <Select
                        name="role"
                        defaultValue={u.role}
                        className="w-auto py-1 text-xs"
                      >
                        <option value="STAFF">{tRoles("STAFF")}</option>
                        <option value="MANAGER">{tRoles("MANAGER")}</option>
                        <option value="ADMIN">{tRoles("ADMIN")}</option>
                      </Select>
                      <Button type="submit" variant="secondary" className="px-2 py-1 text-xs">
                        {tCommon("update")}
                      </Button>
                    </form>
                    <form action={setUserActive}>
                      <input type="hidden" name="id" value={u.id} />
                      <input type="hidden" name="active" value={(!u.active).toString()} />
                      <Button type="submit" variant="secondary" className="px-2 py-1 text-xs">
                        {u.active ? tCommon("deactivate") : tCommon("activate")}
                      </Button>
                    </form>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
