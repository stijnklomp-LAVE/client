"use client"

import { useEffect, useRef } from "react"

const HEARTBEAT_INTERVAL_MS = 30_000

export function useDeviceHeartbeat(deviceId: string | null): void {
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

	useEffect(() => {
		if (!deviceId) return

		const id = deviceId

		async function beat(status: "online" | "offline") {
			try {
				await fetch(`/api/devices/${id}/heartbeat`, {
					body: JSON.stringify({ status }),
					// eslint-disable-next-line @typescript-eslint/naming-convention
					headers: { "Content-Type": "application/json" },
					method: "POST",
				})
			} catch {
				// Silent fail - heartbeat is best-effort
			}
		}

		void beat("online")

		intervalRef.current = setInterval(() => {
			void beat("online")
		}, HEARTBEAT_INTERVAL_MS)

		const handleBeforeUnload = () => {
			void beat("offline")
		}

		globalThis.addEventListener("beforeunload", handleBeforeUnload)

		return () => {
			if (intervalRef.current) {
				clearInterval(intervalRef.current)
			}

			globalThis.removeEventListener("beforeunload", handleBeforeUnload)
			void beat("offline")
		}
	}, [deviceId])
}
