-- Seed data for local development
-- Run via: docker compose exec -T db psql -U dev -d video-editor < prisma/seed.sql

-- User (required by fragment-composer for FK references)
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
