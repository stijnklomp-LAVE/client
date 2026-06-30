import crypto from "node:crypto"

import { NextResponse } from "next/server"

import { logger } from "@/lib/logger"
import { prismaClient } from "@/lib/db/prisma"

export const POST = async (request: Request) => {
	try {
		const { email } = (await request.json()) as { email: string }

		if (!email) {
			return NextResponse.json(
				{ error: "Email is required" },
				{ status: 400 },
			)
		}

		const user = await prismaClient.user.findUnique({
			select: { emailVerified: true },
			where: { email },
		})

		if (!user) {
			return NextResponse.json(
				{ error: "No account found with this email" },
				{ status: 404 },
			)
		}

		if (user.emailVerified) {
			return NextResponse.json(
				{ error: "This account is already verified" },
				{ status: 400 },
			)
		}

		await prismaClient.verificationToken.deleteMany({
			where: { identifier: email },
		})

		const verificationToken = crypto.randomUUID()
		const origin = new URL(request.url).origin

		await prismaClient.verificationToken.create({
			data: {
				expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
				identifier: email,
				token: verificationToken,
			},
		})

		const verifyUrl = `${origin}/api/verify-email?token=${verificationToken}`

		console.warn(`[DEV] New verification link for ${email}: ${verifyUrl}`)

		return NextResponse.json({
			message: "Verification email resent",
			verifyUrl,
		})
	} catch (error) {
		logger.error("Resend verification error:", error)

		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		)
	}
}
