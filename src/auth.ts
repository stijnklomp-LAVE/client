import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import bcrypt from "bcryptjs"

import { prismaClient } from "./lib/db/prisma"

export const { handlers, auth, signIn, signOut } = NextAuth({
	adapter: PrismaAdapter(prismaClient),
	callbacks: {
		jwt({ token, user }) {
			// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
			if (user) {
				token.id = user.id
			}

			return token
		},
		session({ session, token }) {
			// eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style
			session.user.id = token.sub as string

			return session
		},
	},
	pages: {
		signIn: "/login",
	},
	providers: [
		Credentials({
			async authorize(credentials) {
				// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
				if (!credentials) {
					return null
				}

				const email = credentials.email as string
				const password = credentials.password as string

				if (!email || !password) {
					return null
				}

				const user = await prismaClient.user.findUnique({
					where: { email },
				})

				if (!user?.password) {
					return null
				}

				if (!user.emailVerified) {
					throw new Error("Email not verified")
				}

				const isValid = await bcrypt.compare(password, user.password)

				if (!isValid) {
					return null
				}

				return {
					email: user.email,
					id: user.id,
					image: user.image,
					name: user.name,
				}
			},
			credentials: {
				email: { label: "Email", type: "email" },
				password: { label: "Password", type: "password" },
			},
			name: "credentials",
		}),
	],
	secret: process.env.AUTH_SECRET,
	session: { strategy: "jwt" },
	trustHost: true,
})
