import { NextResponse } from "next/server"

import { auth } from "@/auth"
import { prismaClient } from "@/lib/db/prisma"

export const GET = async () => {
	const session = await auth()

	if (!session?.user.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}

	const user = await prismaClient.user.findUnique({
		select: {
			deletionScheduledAt: true,
			email: true,
			id: true,
			markedForDeletionAt: true,
			name: true,
		},
		where: { id: session.user.id },
	})

	if (!user) {
		return NextResponse.json({ error: "User not found" }, { status: 404 })
	}

	return NextResponse.json({ user })
}

export const PUT = async (request: Request) => {
	const session = await auth()

	if (!session?.user.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}

	try {
		const body = (await request.json()) as {
			email?: string
			name?: string
		}
		const { email, name } = body

		if (email) {
			const existing = await prismaClient.user.findUnique({
				where: { email },
			})

			if (existing && existing.id !== session.user.id) {
				return NextResponse.json(
					{ error: "Email already in use" },
					{ status: 409 },
				)
			}
		}

		const user = await prismaClient.user.update({
			data: {
				...(email !== undefined && { email }),
				...(name !== undefined && { name: name || null }),
			},
			select: { email: true, id: true, name: true },
			where: { id: session.user.id },
		})

		return NextResponse.json({ user })
	} catch (error) {
		console.error("Profile update error:", error)

		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		)
	}
}
