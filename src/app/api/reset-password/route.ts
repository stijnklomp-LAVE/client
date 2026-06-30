import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"

import { logger } from "@/lib/logger"
import { prismaClient } from "@/lib/db/prisma"

export const POST = async (request: Request) => {
	try {
		const { token, password } = (await request.json()) as {
			token: string
			password: string
		}

		if (!token || !password) {
			return NextResponse.json(
				{ error: "Token and password are required" },
				{ status: 400 },
			)
		}

		if (password.length < 8) {
			return NextResponse.json(
				{ error: "Password must be at least 8 characters" },
				{ status: 400 },
			)
		}

		const record = await prismaClient.verificationToken.findUnique({
			where: { token },
		})

		if (!record) {
			return NextResponse.json(
				{ error: "Invalid or expired reset link" },
				{ status: 400 },
			)
		}

		if (record.expires < new Date()) {
			await prismaClient.verificationToken.delete({ where: { token } })

			return NextResponse.json(
				{ error: "Reset link has expired" },
				{ status: 400 },
			)
		}

		const hashedPassword = await bcrypt.hash(password, 12)

		await prismaClient.user.update({
			data: { password: hashedPassword },
			where: { email: record.identifier },
		})

		await prismaClient.verificationToken.delete({ where: { token } })

		return NextResponse.json({ message: "Password reset successfully" })
	} catch (error) {
		logger.error("Reset password error:", error)

		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		)
	}
}
