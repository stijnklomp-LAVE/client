import { NextResponse } from "next/server"

import { auth } from "@/auth"
import { signJwt } from "@/lib/jwt"
import { proxyToFragmentComposer } from "@/lib/fragment-composer"

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ sessionId: string }> },
) {
	const session = await auth()

	if (!session?.user.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}

	const { sessionId } = await params
	const token = await signJwt(session.user.id)
	const res = await proxyToFragmentComposer(
		`/v1/signaling/${sessionId}/ice`,
		{ body: await request.json(), method: "POST", token },
	)

	return NextResponse.json(await res.json(), { status: res.status })
}

export async function GET(
	request: Request,
	{ params }: { params: Promise<{ sessionId: string }> },
) {
	const session = await auth()

	if (!session?.user.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}

	const { sessionId } = await params
	const { searchParams } = new URL(request.url)
	const fromDeviceId = searchParams.get("fromDeviceId")

	if (!fromDeviceId) {
		return NextResponse.json(
			{ error: "fromDeviceId query parameter is required" },
			{ status: 400 },
		)
	}

	const token = await signJwt(session.user.id)
	const res = await proxyToFragmentComposer(
		`/v1/signaling/${sessionId}/ice?fromDeviceId=${encodeURIComponent(fromDeviceId)}`,
		{ token },
	)

	return NextResponse.json(await res.json(), { status: res.status })
}
