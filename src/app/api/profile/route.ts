import { NextResponse } from "next/server"

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
	const session = await auth()

	if (!session?.user.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}

	const user = await prisma.user.findUnique({
		select: { email: true, id: true, name: true },
		where: { id: session.user.id },
	})

	if (!user) {
		return NextResponse.json({ error: "User not found" }, { status: 404 })
	}

	return NextResponse.json({ user })
}

export async function PUT(request: Request) {
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
			const existing = await prisma.user.findUnique({
				where: { email },
			})

			if (existing && existing.id !== session.user.id) {
				return NextResponse.json(
					{ error: "Email already in use" },
					{ status: 409 },
				)
			}
		}

		const user = await prisma.user.update({
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
