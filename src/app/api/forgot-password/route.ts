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

		const user = await prismaClient.user.findUnique({ where: { email } })

		if (user) {
			await prismaClient.verificationToken.deleteMany({
				where: {
					expires: { lt: new Date() },
					identifier: email,
				},
			})

			const resetToken = crypto.randomUUID()

			await prismaClient.verificationToken.create({
				data: {
					expires: new Date(Date.now() + 1000 * 60 * 60),
					identifier: email,
					token: resetToken,
				},
			})

			const origin = new URL(request.url).origin
			const resetUrl = `${origin}/en/reset-password?token=${resetToken}`

			console.warn(`[DEV] Password reset link for ${email}: ${resetUrl}`)
		}

		return NextResponse.json({
			message:
				"If an account with that email exists, a password reset link has been sent.",
		})
	} catch (error) {
		logger.error("Forgot password error:", error)

		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		)
	}
}
