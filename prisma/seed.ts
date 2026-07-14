import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, subDays } from "date-fns";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("password123", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@stable.test" },
    update: {},
    create: {
      name: "Alex Morgan",
      email: "admin@stable.test",
      passwordHash,
      role: "ADMIN",
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: "manager@stable.test" },
    update: {},
    create: {
      name: "Sam Rivera",
      email: "manager@stable.test",
      passwordHash,
      role: "MANAGER",
    },
  });

  const groom1 = await prisma.user.upsert({
    where: { email: "jamie@stable.test" },
    update: {},
    create: {
      name: "Jamie Chen",
      email: "jamie@stable.test",
      passwordHash,
      role: "STAFF",
    },
  });

  const groom2 = await prisma.user.upsert({
    where: { email: "taylor@stable.test" },
    update: {},
    create: {
      name: "Taylor Brooks",
      email: "taylor@stable.test",
      passwordHash,
      role: "STAFF",
    },
  });

  const horseNames: Array<{
    name: string;
    breed: string;
    color: string;
    sex: "MARE" | "GELDING" | "STALLION";
  }> = [
    { name: "Bellamy", breed: "Hanoverian", color: "Bay", sex: "GELDING" },
    { name: "Comet", breed: "Andalusian", color: "Grey", sex: "STALLION" },
    { name: "Daisy", breed: "Welsh Pony", color: "Chestnut", sex: "MARE" },
    { name: "Orion", breed: "Thoroughbred", color: "Black", sex: "GELDING" },
    { name: "Willow", breed: "Irish Sport Horse", color: "Bay", sex: "MARE" },
  ];

  const horses = [];
  for (const h of horseNames) {
    const horse = await prisma.horse.upsert({
      where: { id: h.name.toLowerCase() },
      update: {},
      create: { id: h.name.toLowerCase(), ...h },
    });
    horses.push(horse);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Shifts for this week
  const staffRotation = [admin, manager, groom1, groom2];
  for (let i = -1; i < 6; i++) {
    const date = addDays(today, i);
    const person = staffRotation[(i + staffRotation.length) % staffRotation.length];
    await prisma.shift.create({
      data: {
        userId: person.id,
        date,
        startTime: "07:30",
        endTime: "15:30",
        notes: i === 0 ? "Morning feed + turnout" : undefined,
      },
    });
  }

  // A couple of overlapping shifts today, to show side-by-side layout on the calendar
  await prisma.shift.create({
    data: { userId: manager.id, date: today, startTime: "12:00", endTime: "20:00", notes: "Evening cover" },
  });
  await prisma.shift.create({
    data: { userId: groom1.id, date: today, startTime: "13:00", endTime: "17:00" },
  });

  // Vacation requests
  await prisma.vacationRequest.create({
    data: {
      userId: groom1.id,
      startDate: addDays(today, 10),
      endDate: addDays(today, 14),
      reason: "Family trip",
      status: "PENDING",
    },
  });
  await prisma.vacationRequest.create({
    data: {
      userId: groom2.id,
      startDate: addDays(today, 3),
      endDate: addDays(today, 5),
      reason: "Long weekend",
      status: "APPROVED",
      reviewedById: manager.id,
    },
  });

  // Care tasks
  const taskTypes: Array<"FEEDING" | "GROOMING" | "TRAINING" | "FARRIER" | "VET" | "TURNOUT"> = [
    "FEEDING",
    "GROOMING",
    "TRAINING",
    "FARRIER",
    "VET",
    "TURNOUT",
  ];
  for (const [i, horse] of horses.entries()) {
    await prisma.careTask.create({
      data: {
        horseId: horse.id,
        type: taskTypes[i % taskTypes.length],
        date: today,
        assignedToId: i % 2 === 0 ? groom1.id : groom2.id,
        notes: i === 0 ? "Check left front shoe" : undefined,
      },
    });
    await prisma.careTask.create({
      data: {
        horseId: horse.id,
        type: "GROOMING",
        date: addDays(today, 1),
        assignedToId: i % 2 === 0 ? groom2.id : groom1.id,
      },
    });
  }

  // Competitions
  const regional = await prisma.competition.create({
    data: {
      name: "Regional Dressage Championship",
      location: "Meadowbrook Equestrian Park",
      startDate: addDays(today, 21),
      endDate: addDays(today, 22),
      notes: "Bring extra tack for the second day.",
    },
  });

  const springShow = await prisma.competition.create({
    data: {
      name: "Spring Jumping Classic",
      location: "Fairview Stables",
      startDate: subDays(today, 30),
      notes: "Season opener.",
    },
  });

  await prisma.competitionEntry.createMany({
    data: [
      {
        competitionId: regional.id,
        horseId: horses[0].id,
        riderId: groom1.id,
        category: "Novice Dressage",
      },
      {
        competitionId: regional.id,
        horseId: horses[4].id,
        riderId: groom2.id,
        category: "Elementary Dressage",
      },
      {
        competitionId: springShow.id,
        horseId: horses[1].id,
        riderId: manager.id,
        category: "1.10m Jumping",
        result: "2nd place",
      },
    ],
  });

  console.log("Seed complete.");
  console.log("Login with any of:");
  console.log("  admin@stable.test / password123 (ADMIN)");
  console.log("  manager@stable.test / password123 (MANAGER)");
  console.log("  jamie@stable.test / password123 (STAFF)");
  console.log("  taylor@stable.test / password123 (STAFF)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
