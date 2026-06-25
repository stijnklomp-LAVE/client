import { NextResponse } from "next/server"

import { auth } from "@/auth"
import { signJwt } from "@/lib/api/jwt"
import { proxyToFragmentComposer } from "@/lib/api/fragment-composer"

export const GET = async (
	_request: Request,
	{ params }: { params: Promise<{ id: string }> },
) => {
	const session = await auth()

	if (!session?.user.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}

	const { id } = await params
	const token = await signJwt(session.user.id)
	const res = await proxyToFragmentComposer(`/v1/projects/${id}`, { token })

	return NextResponse.json(await res.json(), { status: res.status })
}

export const PUT = async (
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) => {
	const session = await auth()

	if (!session?.user.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}

	const { id } = await params
	const body = (await request.json()) as Record<string, unknown>
	const token = await signJwt(session.user.id)
	const res = await proxyToFragmentComposer(`/v1/projects/${id}`, {
		body,
		method: "PUT",
		token,
	})

	return NextResponse.json(await res.json(), { status: res.status })
}

export const DELETE = async (
	_request: Request,
	{ params }: { params: Promise<{ id: string }> },
) => {
	const session = await auth()

	if (!session?.user.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}

	const { id } = await params
	const token = await signJwt(session.user.id)
	const res = await proxyToFragmentComposer(`/v1/projects/${id}`, {
		method: "DELETE",
		token,
	})

	return NextResponse.json(await res.json(), { status: res.status })
}
