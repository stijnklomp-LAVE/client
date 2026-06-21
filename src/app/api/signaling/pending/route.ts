import { NextResponse } from "next/server"

import { auth } from "@/auth"
import { signJwt } from "@/lib/jwt"
import { proxyToFragmentComposer } from "@/lib/fragment-composer"

export async function GET(request: Request) {
	const session = await auth()

	if (!session?.user.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}

	const { searchParams } = new URL(request.url)
	const deviceId = searchParams.get("deviceId")

	if (!deviceId) {
		return NextResponse.json(
			{ error: "deviceId query parameter is required" },
			{ status: 400 },
		)
	}

	const token = await signJwt(session.user.id)
	const res = await proxyToFragmentComposer(
		`/v1/signaling/pending?deviceId=${encodeURIComponent(deviceId)}`,
		{ token },
	)

	return NextResponse.json(await res.json(), { status: res.status })
}
