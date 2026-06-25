"use client"

import { createContext, useContext } from "react"

import type { ActiveTransfer } from "@/lib/devices/p2p-transfer"
import type { DeviceFragmentMap } from "@/lib/devices/send-fragments"

export type Device = {
	createdAt: string
	deviceId: string
	deviceName: string
	updatedAt: string
}

export type DeviceStatuses = Record<
	string,
	{
		lastContact: string
		state: "online" | "stale" | "offline"
		status: "online" | "offline"
	}
>

export type MockFragment = {
	duration: number
	id: string
	name: string
	size: number
}

export type MockProject = {
	createdAt: string
	description: string
	fragments: MockFragment[]
	id: string
	name: string
}

export type TransferRequest = {
	createdAt: string
	direction: "SEND" | "RECEIVE"
	expiresAt: string
	fragmentIds: string[]
	fragmentNames: string[]
	id: string
	message: string | null
	participants: Array<{
		deviceId: string
		deviceName: string
		role: "SOURCE" | "TARGET"
		status: "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED" | "COMPLETED"
	}>
	projectId: string | null
	projectName: string | null
	status: "PENDING" | "ACTIVE" | "COMPLETED" | "DELETED" | "EXPIRED"
}

export type DevicesContextValue = {
	devices: Device[]
	statuses: DeviceStatuses
	projects: MockProject[]
	requests: TransferRequest[]
	deviceFragments: DeviceFragmentMap
	localDeviceId: string | null
	activeTransfers: Map<string, ActiveTransfer>
	loading: boolean
	newDeviceName: string
	registerOpened: boolean
	setNewDeviceName: (name: string) => void
	openRegister: () => void
	closeRegister: () => void
	handleRegister: () => Promise<void>
	handleRespond: (
		requestId: string,
		deviceId: string,
		action: "accept" | "reject",
	) => Promise<void>
	handleCancelTransfer: (requestId: string, deviceId: string) => Promise<void>
	fetchRequests: () => Promise<void>
	handleSendComplete: () => void
	handleCancelP2pTransfer: (requestId: string) => void
}

const DevicesContext = createContext<DevicesContextValue | null>(null)

export const useDevicesContext = (): DevicesContextValue => {
	const ctx = useContext(DevicesContext)
	if (!ctx)
		throw new Error(
			"useDevicesContext must be used within DevicesLayoutClient",
		)
	return ctx
}

export default DevicesContext
