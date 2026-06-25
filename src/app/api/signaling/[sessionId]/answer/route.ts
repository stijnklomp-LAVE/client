import { NextResponse } from "next/server"

import { auth } from "@/auth"
import { signJwt } from "@/lib/api/jwt"
import { proxyToFragmentComposer } from "@/lib/api/fragment-composer"

export const PUT = async (
	request: Request,
	{ params }: { params: Promise<{ sessionId: string }> },
) => {
	const session = await auth()

	if (!session?.user.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}

	const { sessionId } = await params
	const token = await signJwt(session.user.id)
	const res = await proxyToFragmentComposer(
		`/v1/signaling/${sessionId}/answer`,
		{ body: await request.json(), method: "PUT", token },
	)

	return NextResponse.json(await res.json(), { status: res.status })
}

export const GET = async (
	_request: Request,
	{ params }: { params: Promise<{ sessionId: string }> },
) => {
	const session = await auth()

	if (!session?.user.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}

	const { sessionId } = await params
	const token = await signJwt(session.user.id)
	const res = await proxyToFragmentComposer(
		`/v1/signaling/${sessionId}/answer`,
		{ token },
	)

	return NextResponse.json(await res.json(), { status: res.status })
}
