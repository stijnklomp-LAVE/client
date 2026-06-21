"use client"

const STORAGE_KEY = "video-editor-device-id"

export function getLocalDeviceId(): string | null {
	if (typeof globalThis === "undefined") return null

	try {
		return globalThis.localStorage.getItem(STORAGE_KEY)
	} catch {
		return null
	}
}

export function setLocalDeviceId(deviceId: string): void {
	if (typeof globalThis === "undefined") return

	try {
		globalThis.localStorage.setItem(STORAGE_KEY, deviceId)
	} catch {
		// Storage unavailable
	}
}
