import { NextResponse } from "next/server"

import { auth } from "@/auth"
import { logger } from "@/lib/logger"
import { prismaClient } from "@/lib/db/prisma"

export const POST = async (request: Request) => {
	const session = await auth()

	if (!session?.user.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}

	try {
		const body = (await request.json()) as { email?: string }

		if (!body.email) {
			return NextResponse.json(
				{ error: "Email is required" },
				{ status: 400 },
			)
		}

		if (body.email !== session.user.email) {
			return NextResponse.json(
				{ error: "Email does not match your account" },
				{ status: 400 },
			)
		}

		const now = new Date()
		const deletionDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

		await prismaClient.user.update({
			data: {
				deletionScheduledAt: deletionDate,
				markedForDeletionAt: now,
			},
			where: { id: session.user.id },
		})

		return NextResponse.json({
			message:
				"Your account has been closed. Your data will be permanently deleted after 30 days.",
		})
	} catch (error) {
		logger.error("Close account error:", error)

		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		)
	}
}
