import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { routing } from "@/i18n/routing"

function localeFromRequest(request: Request): string {
	const acceptLanguage = request.headers.get("Accept-Language")

	if (acceptLanguage) {
		const preferred = acceptLanguage
			.split(",")
			.map((l) => l.split(";")[0]?.trim())
			.find((l) => routing.locales.includes(l as "en" | "nl"))

		if (preferred) return preferred
	}

	return routing.defaultLocale
}

function redirectToLogin(request: Request, params: string): NextResponse {
	const locale = localeFromRequest(request)

	return NextResponse.redirect(
		new URL(`/${locale}/login?${params}`, request.url),
	)
}

export async function GET(request: Request) {
	try {
		const { searchParams } = new URL(request.url)
		const token = searchParams.get("token")

		if (!token) {
			return redirectToLogin(request, "error=missing-token")
		}

		const record = await prisma.verificationToken.findUnique({
			where: { token },
		})

		if (!record) {
			return redirectToLogin(request, "error=invalid-token")
		}

		if (record.expires < new Date()) {
			await prisma.verificationToken.delete({ where: { token } })

			return redirectToLogin(request, "error=expired-token")
		}

		await prisma.user.update({
			data: { emailVerified: new Date() },
			where: { email: record.identifier },
		})

		await prisma.verificationToken.delete({ where: { token } })

		return redirectToLogin(request, "verified=true")
	} catch (error) {
		console.error("Verification error:", error)

		return redirectToLogin(request, "error=verification-failed")
	}
}
