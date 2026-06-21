import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url)
	const email = searchParams.get("email")

	if (!email) {
		return NextResponse.json({ exists: false, verified: false })
	}

	const user = await prisma.user.findUnique({
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
