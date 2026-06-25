import { NextResponse } from "next/server"

import { auth } from "@/auth"
import { signJwt } from "@/lib/api/jwt"
import { proxyToFragmentComposer } from "@/lib/api/fragment-composer"

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
	const res = await proxyToFragmentComposer(`/v1/transfer-requests/${id}`, {
		method: "DELETE",
		token,
	})

	return NextResponse.json(await res.json(), { status: res.status })
}
