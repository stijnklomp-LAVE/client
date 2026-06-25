import { NextResponse } from "next/server"

import { auth } from "@/auth"
import { signJwt } from "@/lib/api/jwt"
import { proxyToFragmentComposer } from "@/lib/api/fragment-composer"

export const GET = async () => {
	const session = await auth()

	if (!session?.user.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}

	const token = await signJwt(session.user.id)
	const res = await proxyToFragmentComposer("/v1/projects", { token })

	return NextResponse.json(await res.json(), { status: res.status })
}

export const POST = async (request: Request) => {
	const session = await auth()

	if (!session?.user.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}

	const body = (await request.json()) as Record<string, unknown>
	const token = await signJwt(session.user.id)
	const res = await proxyToFragmentComposer("/v1/projects", {
		body,
		method: "POST",
		token,
	})

	return NextResponse.json(await res.json(), { status: res.status })
}
