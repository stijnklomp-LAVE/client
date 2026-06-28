import { NextResponse } from "next/server"

import { auth } from "@/auth"
import { prismaClient } from "@/lib/db/prisma"

export const POST = async () => {
	const session = await auth()

	if (!session?.user.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}

	try {
		await prismaClient.user.update({
			data: {
				deletionScheduledAt: null,
				markedForDeletionAt: null,
			},
			where: { id: session.user.id },
		})

		return NextResponse.json({ message: "Account restored successfully" })
	} catch (error) {
		console.error("Restore account error:", error)

		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		)
	}
}
