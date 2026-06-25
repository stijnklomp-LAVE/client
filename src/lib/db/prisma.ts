import "dotenv/config"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "@/prismaClient"

const globalForPrisma = globalThis as unknown as {
	prismaClient: PrismaClient | undefined
}

const createAdapter = () => {
	const connectionString = process.env.DATABASE_URL

	if (!connectionString) {
		throw new Error("DATABASE_URL environment variable is not defined")
	}

	return new PrismaPg({ connectionString })
}

const createPrismaClient = () => new PrismaClient({ adapter: createAdapter() })

const getPrismaClient = (): PrismaClient => {
	globalForPrisma.prismaClient ??= createPrismaClient()

	return globalForPrisma.prismaClient
}

export const prismaClient = new Proxy({} as PrismaClient, {
	get(_target, prop) {
		return getPrismaClient()[prop as keyof PrismaClient]
	},
})
