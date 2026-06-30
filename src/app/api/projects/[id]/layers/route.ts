import { NextResponse } from "next/server"

import { auth } from "@/auth"
import { signJwt } from "@/lib/api/jwt"
import { logger } from "@/lib/logger"
import { proxyToFragmentComposer } from "@/lib/api/fragment-composer"

export const POST = async (
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) => {
	const session = await auth()

	if (!session?.user.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}

	const { id } = await params
	const token = await signJwt(session.user.id)

	let body: Record<string, unknown> | undefined

	try {
		body = (await request.json()) as Record<string, unknown>
	} catch {
		body = {}
	}

	const res = await proxyToFragmentComposer(`/v1/projects/${id}/layers`, {
		body,
		method: "POST",
		token,
	})

	if (!res.ok) {
		logger.error(
			`Failed to create layer: ${String(res.status)} ${JSON.stringify(await res.json())}`,
		)
	}

	return NextResponse.json(await res.json(), { status: res.status })
}
