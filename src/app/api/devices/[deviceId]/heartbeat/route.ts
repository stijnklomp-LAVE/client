import { NextResponse } from "next/server"

import { auth } from "@/auth"
import { signJwt } from "@/lib/jwt"
import { proxyToFragmentComposer } from "@/lib/fragment-composer"

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ deviceId: string }> },
) {
	const session = await auth()

	if (!session?.user.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}

	const { deviceId } = await params
	const token = await signJwt(session.user.id)
	const res = await proxyToFragmentComposer(
		`/v1/devices/${deviceId}/heartbeat`,
		{ body: await request.json(), method: "POST", token },
	)

	return NextResponse.json(await res.json(), { status: res.status })
}
