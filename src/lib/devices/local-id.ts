"use client"

const STORAGE_KEY = "video-editor-device-id"

export const getLocalId = (): string | null => {
	if (typeof globalThis === "undefined") return null

	try {
		return globalThis.localStorage.getItem(STORAGE_KEY)
	} catch {
		return null
	}
}

export const setLocalId = (deviceId: string): void => {
	if (typeof globalThis === "undefined") return

	try {
		globalThis.localStorage.setItem(STORAGE_KEY, deviceId)
	} catch {
		// Storage unavailable
	}
}
