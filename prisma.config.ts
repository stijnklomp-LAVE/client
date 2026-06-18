import { existsSync } from "fs"
import { config } from "dotenv"
import { defineConfig, env } from "prisma/config"

const envFile = existsSync(".env") ? ".env" : ".env.development"
config({ path: envFile })

export default defineConfig({
	datasource: {
		url: env("DATABASE_URL"),
	},
	migrations: {
		path: "prisma/migrations",
	},
	schema: "prisma/schema.prisma",
})
