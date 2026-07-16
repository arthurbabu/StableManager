import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { format } from "date-fns";
import { fr, enUS } from "date-fns/locale";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { RegisterDocument, type RegisterRow } from "./RegisterDocument";

/**
 * Pairs each horse's ENTRY/EXIT care tasks (sorted by date) into presence
 * intervals: every ENTRY opens an interval, closed by the next EXIT after
 * it. A trailing ENTRY with no following EXIT is still "present" (open
 * interval). A leading EXIT with no prior ENTRY is treated as a horse that
 * was already there before the register started.
 */
function buildPresenceIntervals(
  tasks: { type: string; date: Date; location: string | null }[],
) {
  const intervals: { entry: { date: Date; location: string | null } | null; exit: { date: Date; location: string | null } | null }[] = [];
  let openEntry: { date: Date; location: string | null } | null = null;

  for (const task of tasks) {
    if (task.type === "ENTRY") {
      if (openEntry) intervals.push({ entry: openEntry, exit: null });
      openEntry = { date: task.date, location: task.location };
    } else if (task.type === "EXIT") {
      intervals.push({ entry: openEntry, exit: { date: task.date, location: task.location } });
      openEntry = null;
    }
  }
  if (openEntry) intervals.push({ entry: openEntry, exit: null });

  return intervals;
}

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN" && session.user.role !== "MANAGER") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const locale = searchParams.get("locale") === "en" ? "en" : "fr";

  if (!fromParam || !toParam) {
    return NextResponse.json({ error: "Missing from/to query params" }, { status: 400 });
  }

  const from = new Date(`${fromParam}T00:00:00`);
  const to = new Date(`${toParam}T23:59:59`);
  const dateLocale = locale === "fr" ? fr : enUS;

  const horses = await prisma.horse.findMany({
    orderBy: { name: "asc" },
    include: {
      careTasks: {
        where: { type: { in: ["ENTRY", "EXIT"] } },
        orderBy: { date: "asc" },
        select: { type: true, date: true, location: true },
      },
    },
  });

  const rows: RegisterRow[] = [];
  for (const horse of horses) {
    const intervals = buildPresenceIntervals(horse.careTasks);
    const overlapping = intervals.filter((interval) => {
      if (interval.entry && interval.entry.date > to) return false;
      if (interval.exit && interval.exit.date < from) return false;
      return true;
    });

    for (const interval of overlapping) {
      rows.push({
        horseName: horse.name,
        sireNumber: horse.sireNumber ?? "—",
        transponderNumber: horse.transponderNumber ?? "—",
        owner: [horse.ownerName, horse.ownerContact].filter(Boolean).join(" · ") || "—",
        entryDate: interval.entry ? format(interval.entry.date, "d MMM yyyy", { locale: dateLocale }) : "—",
        provenance: interval.entry?.location ?? "—",
        exitDate: interval.exit ? format(interval.exit.date, "d MMM yyyy", { locale: dateLocale }) : "—",
        destination: interval.exit?.location ?? "—",
      });
    }
  }

  const buffer = await renderToBuffer(
    <RegisterDocument
      rows={rows}
      from={format(from, "d MMM yyyy", { locale: dateLocale })}
      to={format(to, "d MMM yyyy", { locale: dateLocale })}
      generatedOn={format(new Date(), "d MMM yyyy", { locale: dateLocale })}
      locale={locale}
    />,
  );

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="registre-elevage-${fromParam}-${toParam}.pdf"`,
    },
  });
}
