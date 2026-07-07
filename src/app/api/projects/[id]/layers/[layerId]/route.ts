import { NextResponse } from "next/server"

import { auth } from "@/auth"
import { signJwt } from "@/lib/api/jwt"
import { logger } from "@/lib/logger"
import { proxyToFragmentComposer } from "@/lib/api/fragment-composer"

export const DELETE = async (
	_request: Request,
	{ params }: { params: Promise<{ id: string; layerId: string }> },
) => {
	const session = await auth()

	if (!session?.user.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}

	const { id, layerId } = await params
	const token = await signJwt(session.user.id)

	const res = await proxyToFragmentComposer(
		`/v1/projects/${id}/layers/${layerId}`,
		{
			method: "DELETE",
			token,
		},
	)

	if (!res.ok) {
		logger.error(
			`Failed to delete layer: ${String(res.status)} ${JSON.stringify(await res.json())}`,
		)
	}

	return NextResponse.json(await res.json(), { status: res.status })
}
