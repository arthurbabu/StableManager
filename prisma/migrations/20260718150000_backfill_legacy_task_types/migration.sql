-- The previous migration (20260718100432_task_type_restructure_and_colors)
-- dropped GROOMING/TRAINING/TURNOUT from the TaskType enum but never
-- converted existing CareTask rows still holding those values, since SQLite
-- doesn't enforce enum constraints at the schema level. Prisma's generated
-- client does enforce them, so any row still holding an old value crashes
-- every read that touches it. Backfill to the new equivalents.
UPDATE "CareTask" SET "type" = 'RIDE' WHERE "type" = 'TRAINING';
UPDATE "CareTask" SET "type" = 'OTHER' WHERE "type" = 'GROOMING';
UPDATE "CareTask" SET "type" = 'PADDOCK' WHERE "type" = 'TURNOUT';
