import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"

import { prisma } from "@/lib/prisma"

type RegisterBody = {
	name?: string
	email: string
	password: string
}

export async function POST(request: Request) {
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

		const existing = await prisma.user.findUnique({ where: { email } })

		if (existing) {
			return NextResponse.json(
				{ error: "An account with this email already exists" },
				{ status: 409 },
			)
		}

		const hashedPassword = await bcrypt.hash(password, 12)

		const user = await prisma.user.create({
			data: {
				email,
				name: name ?? null,
				password: hashedPassword,
			},
		})

		return NextResponse.json(
			{
				message: "Account created successfully",
				user: { email: user.email, id: user.id, name: user.name },
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
