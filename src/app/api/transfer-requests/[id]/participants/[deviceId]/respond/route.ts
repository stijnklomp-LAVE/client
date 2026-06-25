import { NextResponse } from "next/server"

import { auth } from "@/auth"
import { signJwt } from "@/lib/api/jwt"
import { proxyToFragmentComposer } from "@/lib/api/fragment-composer"

export const PUT = async (
	request: Request,
	{ params }: { params: Promise<{ id: string; deviceId: string }> },
) => {
	const session = await auth()

	if (!session?.user.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}

	const { id, deviceId } = await params
	const token = await signJwt(session.user.id)
	const body = (await request.json()) as { action: string }
	const res = await proxyToFragmentComposer(
		`/v1/transfer-requests/${id}/participants/${deviceId}/respond`,
		{ body, method: "PUT", token },
	)

	return NextResponse.json(await res.json(), { status: res.status })
}
