import { NextResponse } from "next/server"

import { prismaClient } from "@/lib/db/prisma"

export const GET = async (request: Request) => {
	const { searchParams } = new URL(request.url)
	const email = searchParams.get("email")

	if (!email) {
		return NextResponse.json({ exists: false, verified: false })
	}

	const user = await prismaClient.user.findUnique({
		select: { emailVerified: true },
		where: { email },
	})

	if (!user) {
		return NextResponse.json({ exists: false, verified: false })
	}

	return NextResponse.json({
		exists: true,
		verified: user.emailVerified !== null,
	})
}
