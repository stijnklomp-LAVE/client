import { NextResponse } from "next/server"

import { logger } from "@/lib/logger"
import { prismaClient } from "@/lib/db/prisma"
import { routing } from "@/i18n/routing"

const localeFromRequest = (request: Request): string => {
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

const redirectToLogin = (request: Request, params: string): NextResponse => {
	const locale = localeFromRequest(request)

	return NextResponse.redirect(
		new URL(`/${locale}/login?${params}`, request.url),
	)
}

export const GET = async (request: Request) => {
	try {
		const { searchParams } = new URL(request.url)
		const token = searchParams.get("token")

		if (!token) {
			return redirectToLogin(request, "error=missing-token")
		}

		const record = await prismaClient.verificationToken.findUnique({
			where: { token },
		})

		if (!record) {
			return redirectToLogin(request, "error=invalid-token")
		}

		if (record.expires < new Date()) {
			await prismaClient.verificationToken.delete({ where: { token } })

			return redirectToLogin(request, "error=expired-token")
		}

		await prismaClient.user.update({
			data: { emailVerified: new Date() },
			where: { email: record.identifier },
		})

		await prismaClient.verificationToken.delete({ where: { token } })

		return redirectToLogin(request, "verified=true")
	} catch (error) {
		logger.error("Verification error:", error)

		return redirectToLogin(request, "error=verification-failed")
	}
}
