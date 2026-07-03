-- Seed data for local development
-- Run via: docker compose exec -T db psql -U dev -d video-editor < prisma/seed.sql

-- User
INSERT INTO "public"."User" ("id", "name", "email", "emailVerified", "password", "createdAt", "updatedAt")
VALUES (
	'cmqo5eex300007zmjeu863rx6',
	'stijn',
	'stijnklomp1@hotmail.com',
	'2026-06-21 18:56:50.763'::timestamptz,
	'$2b$12$AjI1KW6c/1tOgk9FzhiSQ.YJojJd4gkUqiENgAV0wrPpcTJmJc7ku',
	'2026-06-21 18:56:49.671'::timestamptz,
	'2026-06-21 18:56:50.764'::timestamptz
) ON CONFLICT ("id") DO NOTHING;

-- VideoProject
INSERT INTO "public"."VideoProject" ("id", "name", "description", "ownerId", "createdAt", "updatedAt")
VALUES (
	'cmqo5itaj00006wn5h8wt1zk7',
	'fragment-sharing',
	'Used for testing the fragment sharing code',
	'cmqo5eex300007zmjeu863rx6',
	'2026-06-21 19:00:14.923'::timestamptz,
	'2026-06-21 19:00:14.923'::timestamptz
) ON CONFLICT ("id") DO NOTHING;
