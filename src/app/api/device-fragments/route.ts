import { NextResponse } from "next/server"

import { auth } from "@/auth"
import { signJwt } from "@/lib/api/jwt"
import { proxyToFragmentComposer } from "@/lib/api/fragment-composer"
import type { DeviceFragmentEntry } from "@/lib/devices/send-fragments"

type RawDeviceFragments = Record<
	string,
	{ fragmentId: string; updatedAt: string; updaterDeviceId: string | null }[]
>

export const GET = async () => {
	const session = await auth()

	if (!session?.user.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
	}

	const token = await signJwt(session.user.id)
	const res = await proxyToFragmentComposer("/v1/device-fragments", { token })
	const body = (await res.json()) as { deviceFragments: RawDeviceFragments }

	const deviceFragments: Record<string, DeviceFragmentEntry[]> = {}
	for (const [deviceId, entries] of Object.entries(body.deviceFragments)) {
		deviceFragments[deviceId] = entries.map((e) => ({
			fragmentId: e.fragmentId,
			updatedAt: e.updatedAt,
			updaterDeviceId: e.updaterDeviceId,
		}))
	}

	return NextResponse.json({ deviceFragments }, { status: res.status })
}
