import { NextResponse } from "next/server"

import { auth } from "@/auth"
import { signJwt } from "@/lib/api/jwt"
import { proxyToFragmentComposer } from "@/lib/api/fragment-composer"

export const POST = async (
	request: Request,
	{ params }: { params: Promise<{ id: string; layerId: string }> },
) => {
	const session = await auth()

	if (!session?.user.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}

	const { id, layerId } = await params
	const body = (await request.json()) as Record<string, unknown>
	const token = await signJwt(session.user.id)
	const res = await proxyToFragmentComposer(
		`/v1/projects/${id}/layers/${layerId}/segments`,
		{
			body,
			method: "POST",
			token,
		},
	)

	return NextResponse.json(await res.json(), { status: res.status })
}
