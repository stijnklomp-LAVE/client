import { NextResponse } from "next/server"

import { auth } from "@/auth"
import { signJwt } from "@/lib/jwt"
import { proxyToFragmentComposer } from "@/lib/fragment-composer"

export async function GET() {
	const session = await auth()

	if (!session?.user.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}

	const token = await signJwt(session.user.id)
	const res = await proxyToFragmentComposer("/v1/transfer-requests", {
		token,
	})

	return NextResponse.json(await res.json(), { status: res.status })
}

export async function POST(request: Request) {
	const session = await auth()

	if (!session?.user.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}

	const body = (await request.json()) as Record<string, unknown>
	const token = await signJwt(session.user.id)
	const res = await proxyToFragmentComposer("/v1/transfer-requests", {
		body,
		method: "POST",
		token,
	})

	return NextResponse.json(await res.json(), { status: res.status })
}
