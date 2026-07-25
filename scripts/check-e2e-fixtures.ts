import { existsSync } from "fs"
import { resolve } from "path"

const FIXTURES = ["solid-red-1s.webm"]
const FIXTURES_DIR = resolve("test/fixtures")

const missing = FIXTURES.filter(
	(f) => !existsSync(resolve(FIXTURES_DIR, f)),
)

if (missing.length > 0) {
	console.error(
		`Missing e2e test fixtures: ${missing.join(", ")}\n\n` +
			`Run the following command to generate them:\n` +
			`  bash ${resolve(FIXTURES_DIR, "generate.sh")}\n`,
	)
	process.exit(1)
}
