import { NextResponse } from "next/server"

import { auth } from "@/auth"
import { signJwt } from "@/lib/api/jwt"
import { proxyToFragmentComposer } from "@/lib/api/fragment-composer"

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
	const session = await auth()

	if (!session?.user.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}

	const { id } = await params
	const token = await signJwt(session.user.id)

	const body = (await request.json()) as {
		duration?: number
		filePath: string
		name: string
		size: number
	}

	const res = await proxyToFragmentComposer(`/v1/projects/${id}/fragments`, {
		body,
		method: "POST",
		token,
	})

	const data = (await res.json()) as Record<string, unknown>

	return NextResponse.json(data, { status: res.status })
}
