import { format, startOfMonth } from "date-fns";
import { getLocale, getTranslations } from "next-intl/server";
import { requireRole } from "@/lib/auth-helpers";
import { Card, PageHeader, Button, Input, Label } from "@/components/ui";

export default async function RegisterPage() {
  await requireRole(["ADMIN", "MANAGER"]);
  const t = await getTranslations("Register");
  const locale = await getLocale();
  const today = new Date();

  return (
    <div>
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <Card className="max-w-md">
        <form action="/api/documents/registre" method="get" className="space-y-3">
          <input type="hidden" name="locale" value={locale} />
          <div>
            <Label htmlFor="from">{t("periodFrom")}</Label>
            <Input
              id="from"
              type="date"
              name="from"
              required
              defaultValue={format(startOfMonth(today), "yyyy-MM-dd")}
            />
          </div>
          <div>
            <Label htmlFor="to">{t("periodTo")}</Label>
            <Input id="to" type="date" name="to" required defaultValue={format(today, "yyyy-MM-dd")} />
          </div>
          <Button type="submit" className="w-full">
            {t("generateButton")}
          </Button>
        </form>
      </Card>
    </div>
  );
}
