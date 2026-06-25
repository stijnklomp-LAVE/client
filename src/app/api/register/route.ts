import crypto from "node:crypto"

import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"

import { prismaClient } from "@/lib/db/prisma"

type RegisterBody = {
	name?: string
	email: string
	password: string
}

export const POST = async (request: Request) => {
	try {
		const body = (await request.json()) as RegisterBody
		const { email, name, password } = body

		if (!email || !password) {
			return NextResponse.json(
				{ error: "Email and password are required" },
				{ status: 400 },
			)
		}

		if (password.length < 8) {
			return NextResponse.json(
				{ error: "Password must be at least 8 characters" },
				{ status: 400 },
			)
		}

		const existing = await prismaClient.user.findUnique({
			where: { email },
		})

		if (existing) {
			return NextResponse.json(
				{ error: "An account with this email already exists" },
				{ status: 409 },
			)
		}

		const hashedPassword = await bcrypt.hash(password, 12)

		await prismaClient.user.create({
			data: {
				email,
				emailVerified: null,
				name: name ?? null,
				password: hashedPassword,
			},
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

		console.warn(`[DEV] Verification link for ${email}: ${verifyUrl}`)

		return NextResponse.json(
			{
				message:
					"Account created. Check your email to verify your account.",
				verifyUrl,
			},
			{ status: 201 },
		)
	} catch (error) {
		console.error("Registration error:", error)

		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 },
		)
	}
}
