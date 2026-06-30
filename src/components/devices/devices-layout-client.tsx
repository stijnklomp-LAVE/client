"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { CtaButton } from "@/components/ui/cta-button"
import {
	Badge,
	Button,
	Card,
	Group,
	Modal,
	Progress,
	Stack,
	Tabs,
	Text,
	TextInput,
	Title,
} from "@mantine/core"
import { useDisclosure } from "@mantine/hooks"
import { notifications } from "@mantine/notifications"
import { showThrottledNotification } from "@/lib/utils/throttled-notification"
import { IconDeviceDesktop, IconPlus, IconSend } from "@tabler/icons-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTranslations } from "next-intl"

import DevicesContext from "@/lib/devices/devices-context"
import type {
	Device,
	DeviceStatuses,
	MockProject,
	TransferRequest,
} from "@/lib/devices/devices-context"
import type { DeviceFragmentMap } from "@/lib/devices/send-fragments"
import { getLocalId, setLocalId } from "@/lib/devices/local-id"
import { useHeartbeat } from "@/lib/devices/heartbeat"
import { useP2PTransfer, type ActiveTransfer } from "@/lib/devices/p2p-transfer"

const formatBytes = (bytes: number): string => {
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
	if (bytes < 1024 * 1024 * 1024)
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

const TransferProgressCard = ({
	transfer,
	onCancel,
	requestId,
}: {
	transfer: ActiveTransfer
	onCancel: (requestId: string) => void
	requestId: string
}): React.JSX.Element => {
	const translations = useTranslations("devices")
	const isActive =
		transfer.peerState === "connected" ||
		transfer.peerState === "connecting"

	return (
		<Card withBorder padding="md" radius="sm">
			<Group justify="space-between" mb="xs">
				<Text fw={500} size="sm">
					{transfer.direction === "SEND"
						? translations("requests.sendingTitle")
						: translations("requests.receivingTitle")}
				</Text>
				{transfer.error ? (
					<Badge color="red" variant="light">
						Error
					</Badge>
				) : isActive ? (
					<Badge color="green" variant="light">
						Active
					</Badge>
				) : (
					<Badge color="yellow" variant="light">
						{transfer.peerState}
					</Badge>
				)}
			</Group>

			{transfer.error ? (
				<Text c="red" size="sm" mb="xs">
					{transfer.error}
				</Text>
			) : null}

			{transfer.progress.map((file, idx) => {
				const percent =
					file.bytesTotal > 0
						? Math.round(
								(file.bytesReceived / file.bytesTotal) * 100,
							)
						: 0

				return (
					<div key={idx} style={{ marginBottom: 8 }}>
						<Group justify="space-between" mb={4}>
							<Text size="xs">{file.fileName}</Text>
							<Text size="xs" c="dimmed">
								{formatBytes(file.bytesReceived)} /{" "}
								{formatBytes(file.bytesTotal)}
							</Text>
						</Group>
						<Progress
							color={
								file.status === "done"
									? "green"
									: file.status === "error"
										? "red"
										: "blue"
							}
							value={percent}
							size="sm"
							animated={file.status === "transferring"}
						/>
					</div>
				)
			})}

			{transfer.channelState && (
				<Text c="dimmed" size="xs">
					Channel: {transfer.channelState}
				</Text>
			)}

			{!transfer.error && (
				<Button
					color="red"
					fullWidth
					mt="sm"
					size="xs"
					variant="outline"
					onClick={() => onCancel(requestId)}>
					{translations("requests.cancelTransfer")}
				</Button>
			)}
		</Card>
	)
}

export const DevicesLayoutClient = ({
	children,
}: {
	children: React.ReactNode
}): React.JSX.Element => {
	const translations = useTranslations("devices")
	const pathname = usePathname()
	const [devices, setDevices] = useState<Device[]>([])
	const [statuses, setStatuses] = useState<DeviceStatuses>({})
	const [projects, setProjects] = useState<MockProject[]>([])
	const [requests, setRequests] = useState<TransferRequest[]>([])
	const [loading, setLoading] = useState(true)
	const [newDeviceName, setNewDeviceName] = useState("")
	const [registerOpened, { open: openRegister, close: closeRegister }] =
		useDisclosure(false)

	const [deviceFragments, setDeviceFragments] = useState<DeviceFragmentMap>(
		{},
	)

	const localDeviceId = getLocalId()

	useHeartbeat(localDeviceId)

	const { activeTransfers, cancelTransfer } = useP2PTransfer({
		deviceId: localDeviceId,
		requests: useMemo(
			() =>
				requests.map((r) => ({
					direction: r.direction,
					fragmentIds: r.fragmentIds,
					fragmentNames: r.fragmentNames,
					id: r.id,
					projectName: r.projectName,
					sourceDeviceIds: r.participants
						.filter((p) => p.role === "SOURCE")
						.map((p) => p.deviceId),
					status: r.status,
					targetDeviceIds: r.participants
						.filter((p) => p.role === "TARGET")
						.map((p) => p.deviceId),
				})),
			[requests],
		),
	})

	const cancelledToasts = useRef<Set<string>>(new Set())

	useEffect(() => {
		for (const [requestId, transfer] of activeTransfers) {
			if (
				transfer.error?.includes("cancelled") &&
				!cancelledToasts.current.has(requestId)
			) {
				cancelledToasts.current.add(requestId)
				showThrottledNotification({
					color: "orange",
					message: translations("notifications.otherDeviceCancelled"),
					throttleKey: "otherDeviceCancelled",
					title: translations("notifications.transferCancelled"),
				})
			}
		}
	}, [activeTransfers]) // eslint-disable-line react-hooks/exhaustive-deps

	const fetchDevices = async () => {
		try {
			const [devicesRes, statusRes] = await Promise.all([
				fetch("/api/devices"),
				fetch("/api/device-status"),
			])

			if (devicesRes.ok) {
				const data = (await devicesRes.json()) as { devices: Device[] }
				setDevices(data.devices)
			}

			if (statusRes.ok) {
				const data = (await statusRes.json()) as {
					devices: DeviceStatuses
				}
				const newStatuses = data.devices ?? {}

				if (localDeviceId) {
					newStatuses[localDeviceId] = {
						lastContact: new Date().toISOString(),
						state: "online",
						status: "online",
					}
				}

				setStatuses(newStatuses)
			}
		} catch {
			showThrottledNotification({
				color: "red",
				message: translations("notifications.failedLoadDevices"),
				throttleKey: "failedLoadDevices",
				title: translations("notifications.error"),
			})
		}
	}

	const fetchProjects = async () => {
		try {
			const res = await fetch("/api/projects/with-fragments")

			if (res.ok) {
				const data = (await res.json()) as {
					projects: MockProject[]
				}
				setProjects(data.projects)
			}
		} catch {
			showThrottledNotification({
				color: "red",
				message: translations("notifications.failedLoadProjects"),
				throttleKey: "failedLoadProjects",
				title: translations("notifications.error"),
			})
		}
	}

	const fetchDeviceFragments = async () => {
		try {
			const res = await fetch("/api/device-fragments")

			if (res.ok) {
				const data = (await res.json()) as {
					deviceFragments: DeviceFragmentMap
				}
				setDeviceFragments(data.deviceFragments)
			}
		} catch {
			// Silently fail
		}
	}

	const fetchRequests = useCallback(async () => {
		try {
			const res = await fetch("/api/transfer-requests")

			if (res.ok) {
				const data = (await res.json()) as {
					requests: TransferRequest[]
				}
				setRequests(data.requests)
			}
		} catch {
			showThrottledNotification({
				color: "red",
				message: translations("notifications.failedLoadRequests"),
				throttleKey: "failedLoadRequests",
				title: translations("notifications.error"),
			})
		}
	}, [translations])

	useEffect(() => {
		const load = async () => {
			setLoading(true)
			await Promise.all([
				fetchDevices(),
				fetchProjects(),
				fetchRequests(),
				fetchDeviceFragments(),
			])
			setLoading(false)
		}

		void load()

		const pollInterval = setInterval(() => {
			void fetchRequests()
			void fetchDevices()
			void fetchDeviceFragments()
		}, 5000)

		return () => clearInterval(pollInterval)
	}, [fetchRequests]) // eslint-disable-line react-hooks/exhaustive-deps

	const handleRegister = async () => {
		if (!newDeviceName.trim()) return

		try {
			const res = await fetch("/api/devices", {
				body: JSON.stringify({
					deviceName: newDeviceName.trim(),
				}),
				// eslint-disable-next-line @typescript-eslint/naming-convention
				headers: { "Content-Type": "application/json" },
				method: "POST",
			})

			if (res.ok) {
				const data = (await res.json()) as {
					device: { deviceId: string }
				}

				setLocalId(data.device.deviceId)

				await fetch(`/api/devices/${data.device.deviceId}/heartbeat`, {
					method: "POST",
					// eslint-disable-next-line @typescript-eslint/naming-convention
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ status: "online" }),
				})

				notifications.show({
					color: "green",
					message: translations("notifications.deviceRegistered", {
						name: newDeviceName.trim(),
					}),
					title: translations("notifications.success"),
				})
				setNewDeviceName("")
				closeRegister()
				await fetchDevices()
			} else {
				const data = (await res.json()) as { error?: string }
				notifications.show({
					color: "red",
					message:
						data.error ??
						translations("notifications.failedRegisterDevice"),
					title: translations("notifications.error"),
				})
			}
		} catch {
			notifications.show({
				color: "red",
				message: translations("notifications.failedRegisterDevice"),
				title: translations("notifications.error"),
			})
		}
	}

	const handleSendComplete = useCallback(() => {
		void fetchRequests()
	}, [fetchRequests])

	const handleRespond = async (
		requestId: string,
		deviceId: string,
		action: "accept" | "reject",
	) => {
		try {
			const res = await fetch(
				`/api/transfer-requests/${requestId}/participants/${deviceId}/respond`,
				{
					body: JSON.stringify({ action }),
					// eslint-disable-next-line @typescript-eslint/naming-convention
					headers: { "Content-Type": "application/json" },
					method: "PUT",
				},
			)

			if (res.ok) {
				notifications.show({
					color: "green",
					message:
						action === "accept"
							? translations("notifications.requestAccepted")
							: translations("notifications.requestRejected"),
					title: translations("notifications.success"),
				})
				await fetchRequests()
			} else {
				const data = (await res.json()) as { error?: string }
				notifications.show({
					color: "red",
					message: data.error ?? `Failed to ${action} request`,
					title: "Error",
				})
			}
		} catch {
			notifications.show({
				color: "red",
				message: `Failed to ${action} request`,
				title: "Error",
			})
		}
	}

	const handleCancelTransfer = async (
		requestId: string,
		deviceId: string,
	) => {
		try {
			const res = await fetch(
				`/api/transfer-requests/${requestId}/participants/${deviceId}/cancel`,
				{ method: "PUT" },
			)

			if (res.ok) {
				cancelTransfer(requestId)
				notifications.show({
					color: "orange",
					message: translations("notifications.transferCancelled"),
					title: translations("notifications.success"),
				})
				await fetchRequests()
			} else {
				const data = (await res.json()) as { error?: string }
				notifications.show({
					color: "red",
					message:
						data.error ??
						translations("notifications.cancelFailed"),
					title: translations("notifications.error"),
				})
			}
		} catch {
			notifications.show({
				color: "red",
				message: translations("notifications.cancelFailed"),
				title: translations("notifications.error"),
			})
		}
	}

	const currentDeviceName =
		localDeviceId &&
		devices.find((d) => d.deviceId === localDeviceId)?.deviceName

	const tabValue = pathname.endsWith("/devices/share-fragments")
		? "share-fragments"
		: pathname.endsWith("/devices/requests")
			? "requests"
			: "devices"

	return (
		<DevicesContext.Provider
			value={{
				devices,
				statuses,
				projects,
				requests,
				deviceFragments,
				localDeviceId,
				activeTransfers,
				loading,
				newDeviceName,
				registerOpened,
				setNewDeviceName,
				openRegister,
				closeRegister,
				handleRegister,
				handleRespond,
				handleCancelTransfer,
				fetchRequests,
				handleSendComplete,
				handleCancelP2pTransfer: cancelTransfer,
			}}>
			<Group justify="space-between" mb="lg">
				<div>
					<Title order={2}>{translations("title")}</Title>
					<Text c="dimmed" size="sm">
						{translations("subtitle")}
					</Text>
					{currentDeviceName ? (
						<Text c="dimmed" size="xs">
							Current device: {currentDeviceName}
						</Text>
					) : null}
				</div>
				<CtaButton
					leftSection={<IconPlus size={16} />}
					onClick={openRegister}>
					{translations("registerDevice")}
				</CtaButton>
			</Group>

			{activeTransfers.size > 0 ? (
				<Card withBorder padding="md" radius="md" mb="md">
					<Text fw={500} mb="sm" size="sm">
						{translations("requests.activeTransfers")}
					</Text>
					<Stack gap="sm">
						{Array.from(activeTransfers.entries()).map(
							([requestId, transfer]) => (
								<TransferProgressCard
									key={requestId}
									onCancel={(id) =>
										handleCancelTransfer(
											id,
											localDeviceId ?? "",
										)
									}
									requestId={requestId}
									transfer={transfer}
								/>
							),
						)}
					</Stack>
				</Card>
			) : null}

			<Tabs value={tabValue}>
				<Tabs.List mb="md">
					<Tabs.Tab
						leftSection={<IconDeviceDesktop size={16} />}
						value="devices"
						renderRoot={(props) => (
							<Link href="/devices" {...props} />
						)}>
						{translations("tabs.devices")}
					</Tabs.Tab>
					<Tabs.Tab
						leftSection={<IconSend size={16} />}
						value="share-fragments"
						renderRoot={(props) => (
							<Link href="/devices/share-fragments" {...props} />
						)}>
						{translations("tabs.send")}
					</Tabs.Tab>
					<Tabs.Tab
						leftSection={<IconSend size={16} />}
						value="requests"
						renderRoot={(props) => (
							<Link href="/devices/requests" {...props} />
						)}>
						{translations("tabs.requests")}
						{requests.length ? ` (${requests.length})` : ""}
					</Tabs.Tab>
				</Tabs.List>
			</Tabs>

			{children}

			<Modal
				onClose={closeRegister}
				opened={registerOpened}
				title={translations("modal.title")}>
				<Stack gap="md">
					<TextInput
						autoFocus
						label={translations("modal.deviceName")}
						placeholder={translations("modal.placeholder")}
						value={newDeviceName}
						onChange={(e) =>
							setNewDeviceName(e.currentTarget.value)
						}
					/>
					<Group justify="flex-end">
						<Button
							variant="outline"
							onClick={() => {
								closeRegister()
								setNewDeviceName("")
							}}>
							{translations("modal.cancel")}
						</Button>
						<CtaButton
							disabled={!newDeviceName.trim()}
							leftSection={<IconPlus size={16} />}
							onClick={handleRegister}>
							{translations("modal.register")}
						</CtaButton>
					</Group>
				</Stack>
			</Modal>
		</DevicesContext.Provider>
	)
}
