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

-- Fragments (mock — filePath is informational; P2P sends empty buffers)
INSERT INTO "public"."Fragment" ("id", "name", "filePath", "size", "duration", "projectId", "createdAt")
VALUES
	(
		'frag_intro_001',
		'intro.mp4',
		'fragment-composer/mock/intro.png',
		2_345_000,
		30.5,
		'cmqo5itaj00006wn5h8wt1zk7',
		'2026-06-21 19:05:00.000'::timestamptz
	),
	(
		'frag_scene1_002',
		'scene-01.mp4',
		'fragment-composer/mock/scene-01.png',
		5_123_000,
		120.0,
		'cmqo5itaj00006wn5h8wt1zk7',
		'2026-06-21 19:05:10.000'::timestamptz
	),
	(
		'frag_scene2_003',
		'scene-02.mp4',
		'fragment-composer/mock/scene-02.png',
		3_789_000,
		85.2,
		'cmqo5itaj00006wn5h8wt1zk7',
		'2026-06-21 19:05:20.000'::timestamptz
	),
	(
		'frag_closing_004',
		'closing.mp4',
		'fragment-composer/mock/closing.png',
		1_200_000,
		15.0,
		'cmqo5itaj00006wn5h8wt1zk7',
		'2026-06-21 19:05:30.000'::timestamptz
	)
ON CONFLICT ("id") DO NOTHING;

-- TimelineLayer (default layer)
INSERT INTO "public"."TimelineLayer" ("id", "projectId", "name", "zIndex", "createdAt")
VALUES (
	'lay_main_001',
	'cmqo5itaj00006wn5h8wt1zk7',
	'Layer 1',
	0,
	'2026-06-21 19:06:00.000'::timestamptz
) ON CONFLICT ("id") DO NOTHING;

-- TimelineSegments (ordered within the layer)
INSERT INTO "public"."TimelineSegment" ("id", "layerId", "fragmentId", "name", "order", "inPoint", "outPoint", "createdAt")
VALUES
	(
		'seg_intro_001',
		'lay_main_001',
		'frag_intro_001',
		'intro.mp4',
		0,
		0,
		30.5,
		'2026-06-21 19:06:10.000'::timestamptz
	),
	(
		'seg_scene1_002',
		'lay_main_001',
		'frag_scene1_002',
		'scene-01.mp4',
		1,
		0,
		120.0,
		'2026-06-21 19:06:20.000'::timestamptz
	)
ON CONFLICT ("id") DO NOTHING;
