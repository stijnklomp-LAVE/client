import { Client } from "pg"
import bcrypt from "bcryptjs"

const TEST_USER = {
	id: "e2e-test-user",
	email: "e2e-test@example.com",
	password: "e2e-test-password-123",
}

const TEST_PROJECT = {
	id: "e2e-test-project",
	name: "E2E Test Project",
}

export default async (): Promise<void> => {
	const databaseUrl = process.env.DATABASE_URL

	if (!databaseUrl) {
		console.warn("DATABASE_URL not set — skipping e2e test data seed")

		return
	}

	const db = new Client({ connectionString: databaseUrl })
	await db.connect()

	try {
		// Create test user with known password
		const hash = await bcrypt.hash(TEST_USER.password, 12)
		await db.query(
			`
			INSERT INTO "User" (id, email, name, password, "emailVerified", "createdAt", "updatedAt")
			VALUES ($1, $2, 'E2E Test', $3, NOW(), NOW(), NOW())
			ON CONFLICT (id) DO UPDATE SET password = $3, "emailVerified" = NOW()
			`,
			[TEST_USER.id, TEST_USER.email, hash],
		)

		// Create test project
		await db.query(
			`
			INSERT INTO "VideoProject" (id, name, "ownerId", "createdAt", "updatedAt")
			VALUES ($1, $2, $3, NOW(), NOW())
			ON CONFLICT (id) DO NOTHING
			`,
			[TEST_PROJECT.id, TEST_PROJECT.name, TEST_USER.id],
		)

		// Create a fragment pointing to the fixture webm
		await db.query(
			`
			INSERT INTO "Fragment" (id, name, "filePath", duration, size, "projectId", "createdAt")
			VALUES ('e2e-test-fragment', 'Test Recording', 'e2e-recording', 1.0, 0, $1, NOW())
			ON CONFLICT (id) DO NOTHING
			`,
			[TEST_PROJECT.id],
		)

		// Create a layer
		await db.query(
			`
			INSERT INTO "TimelineLayer" (id, "projectId", name, "zIndex", "createdAt")
			VALUES ('e2e-test-layer', $1, 'E2E Layer', 0, NOW())
			ON CONFLICT (id) DO NOTHING
			`,
			[TEST_PROJECT.id],
		)

		// Create a segment on the layer using the fragment
		await db.query(
			`
			INSERT INTO "TimelineSegment" (id, "layerId", "fragmentId", name, "order", "inPoint", "outPoint", "createdAt")
			VALUES ('e2e-test-segment', 'e2e-test-layer', 'e2e-test-fragment', 'E2E Segment', 0, 0, 1.0, NOW())
			ON CONFLICT (id) DO NOTHING
			`,
		)
	} finally {
		await db.end()
	}

	// Verify seed data
	const verify = new Client({ connectionString: databaseUrl })
	await verify.connect()

	try {
		const { rows: projects } = await verify.query(
			`SELECT id, name FROM "VideoProject" WHERE id = 'e2e-test-project'`,
		)
		console.log(`Seed project: ${JSON.stringify(projects[0])}`)

		const { rows: layers } = await verify.query(
			`SELECT id, "projectId" FROM "TimelineLayer" WHERE id = 'e2e-test-layer'`,
		)
		console.log(`Seed layer: ${JSON.stringify(layers[0])}`)

		const { rows: segments } = await verify.query(
			`SELECT id, "layerId" FROM "TimelineSegment" WHERE id = 'e2e-test-segment'`,
		)
		console.log(`Seed segment: ${JSON.stringify(segments[0])}`)

		const { rows: allLayers } = await verify.query(
			`SELECT count(*)::int as cnt FROM "TimelineLayer" WHERE "projectId" = 'e2e-test-project'`,
		)
		console.log(`Layers count for project: ${allLayers[0]?.cnt}`)
	} finally {
		await verify.end()
	}
}
