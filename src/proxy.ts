import createMiddleware from "next-intl/middleware"
import { NextResponse } from "next/server"

import { auth } from "@/auth"
import { routing } from "./i18n/routing"

const intlMiddleware = createMiddleware(routing)

const protectedPaths = ["/projects", "/editor", "/devices", "/profile"]

export default auth((request) => {
	const { pathname } = request.nextUrl

	const isProtected = protectedPaths.some((p) => {
		if (pathname === p) return true

		if (pathname.startsWith(p + "/")) return true

		if (new RegExp(`^/(en|nl)${p}(/|$)`).exec(pathname)) return true

		return false
	})

	if (isProtected && !request.auth) {
		const match = /^\/(en|nl)\//.exec(pathname)
		const locale = match?.[1] ?? "en"

		return NextResponse.redirect(new URL(`/${locale}/login`, request.url))
	}

	// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
	if (request.auth?.user?.markedForDeletionAt) {
		const profilePattern = /^\/(en|nl)?\/?profile(\/|$)/

		if (!profilePattern.exec(pathname)) {
			const match = /^\/(en|nl)\//.exec(pathname)
			const locale = match?.[1] ?? "en"

			return NextResponse.redirect(
				new URL(`/${locale}/profile`, request.url),
			)
		}
	}

	return intlMiddleware(request)
})

export const config = {
	matcher: "/((?!api|_next|_vercel|.*\\..*).*)",
}
