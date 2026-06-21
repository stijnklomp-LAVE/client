import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"

import { prisma } from "@/lib/prisma"

export async function POST(request: Request) {
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

		const record = await prisma.verificationToken.findUnique({
			where: { token },
		})

		if (!record) {
			return NextResponse.json(
				{ error: "Invalid or expired reset link" },
				{ status: 400 },
			)
		}

		if (record.expires < new Date()) {
			await prisma.verificationToken.delete({ where: { token } })

			return NextResponse.json(
				{ error: "Reset link has expired" },
				{ status: 400 },
			)
		}

		const hashedPassword = await bcrypt.hash(password, 12)

		await prisma.user.update({
			data: { password: hashedPassword },
			where: { email: record.identifier },
		})

		await prisma.verificationToken.delete({ where: { token } })

		return NextResponse.json({ message: "Password reset successfully" })
	} catch (error) {
		console.error("Reset password error:", error)

		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		)
	}
}
