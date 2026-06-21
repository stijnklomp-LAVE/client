"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
	Accordion,
	Badge,
	Box,
	Button,
	Card,
	Checkbox,
	Divider,
	Group,
	Modal,
	Progress,
	Skeleton,
	Stack,
	Table,
	Tabs,
	Text,
	TextInput,
	Textarea,
	Title,
} from "@mantine/core"
import { useDisclosure } from "@mantine/hooks"
import { notifications } from "@mantine/notifications"
import { showThrottledNotification } from "@/lib/throttled-notification"
import {
	IconArrowsLeftRight,
	IconDeviceDesktop,
	IconPlayerPlay,
	IconPlus,
	IconSend,
	IconUser,
} from "@tabler/icons-react"
import { useTranslations } from "next-intl"

import { getLocalDeviceId, setLocalDeviceId } from "@/lib/use-local-device-id"
import { useDeviceHeartbeat } from "@/lib/use-device-heartbeat"
import { useP2PTransfer, type ActiveTransfer } from "@/lib/use-p2p-transfer"

type Device = {
	createdAt: string
	deviceId: string
	deviceName: string
	updatedAt: string
}

type DeviceStatuses = Record<
	string,
	{
		lastContact: string
		state: "online" | "stale" | "offline"
		status: "online" | "offline"
	}
>

type MockFragment = {
	duration: number
	id: string
	name: string
	size: number
}

type MockProject = {
	createdAt: string
	description: string
	fragments: MockFragment[]
	id: string
	name: string
}

type TransferRequest = {
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

function statusColor(status: "online" | "stale" | "offline"): string {
	switch (status) {
		case "online": {
			return "green"
		}
		case "stale": {
			return "yellow"
		}
		case "offline": {
			return "gray"
		}
	}
}

function requestStatusColor(status: TransferRequest["status"]): string {
	switch (status) {
		case "PENDING": {
			return "blue"
		}
		case "ACTIVE": {
			return "green"
		}
		case "DELETED": {
			return "red"
		}
		case "EXPIRED": {
			return "gray"
		}
		case "COMPLETED": {
			return "teal"
		}
	}
}

function isExpired(req: TransferRequest): boolean {
	return req.status === "PENDING" && new Date(req.expiresAt) < new Date()
}

function formatBytes(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
	if (bytes < 1024 * 1024 * 1024)
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

function formatDuration(seconds: number): string {
	const m = Math.floor(seconds / 60)
	const s = Math.round(seconds % 60)
	return `${m}:${s.toString().padStart(2, "0")}`
}

function TransferProgressCard({
	transfer,
	onCancel,
	requestId,
}: {
	transfer: ActiveTransfer
	onCancel: (requestId: string) => void
	requestId: string
}): React.JSX.Element {
	const t = useTranslations("devices")
	const isActive =
		transfer.peerState === "connected" ||
		transfer.peerState === "connecting"

	return (
		<Card withBorder padding="md" radius="sm">
			<Group justify="space-between" mb="xs">
				<Text fw={500} size="sm">
					{transfer.direction === "SEND"
						? t("requests.sendingTitle")
						: t("requests.receivingTitle")}
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
					{t("requests.cancelTransfer")}
				</Button>
			)}
		</Card>
	)
}

export function DevicesPageClient(): React.JSX.Element {
	const t = useTranslations("devices")
	const [devices, setDevices] = useState<Device[]>([])
	const [statuses, setStatuses] = useState<DeviceStatuses>({})
	const [projects, setProjects] = useState<MockProject[]>([])
	const [requests, setRequests] = useState<TransferRequest[]>([])
	const [loading, setLoading] = useState(true)
	const [newDeviceName, setNewDeviceName] = useState("")
	const [registerOpened, { open: openRegister, close: closeRegister }] =
		useDisclosure(false)

	const [sendSourceDeviceIds, setSendSourceDeviceIds] = useState<string[]>([])
	const [sendProjectId, setSendProjectId] = useState<string | null>(null)
	const [sendFragmentIds, setSendFragmentIds] = useState<string[]>([])
	const [sendTargetDeviceIds, setSendTargetDeviceIds] = useState<string[]>([])
	const [sendMessage, setSendMessage] = useState("")

	const MOCK_FRAGMENT_ID = "mock-fragment"
	const USE_MOCK_FRAGMENTS = "use-mock-fragments"

	const [activeTab, setActiveTab] = useState<string | null>("devices")

	const localDeviceId = getLocalDeviceId()

	useDeviceHeartbeat(localDeviceId)

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
					message: t("notifications.otherDeviceCancelled"),
					throttleKey: "otherDeviceCancelled",
					title: t("notifications.transferCancelled"),
				})
			}
		}
	}, [activeTransfers]) // eslint-disable-line react-hooks/exhaustive-deps

	async function fetchDevices() {
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
				const statuses = data.devices ?? {}

				// Current device is always online since this page is loaded
				if (localDeviceId) {
					statuses[localDeviceId] = {
						lastContact: new Date().toISOString(),
						state: "online",
						status: "online",
					}
				}

				setStatuses(statuses)
			}
		} catch {
			showThrottledNotification({
				color: "red",
				message: t("notifications.failedLoadDevices"),
				throttleKey: "failedLoadDevices",
				title: t("notifications.error"),
			})
		}
	}

	async function fetchProjects() {
		try {
			const res = await fetch("/api/projects/with-fragments")

			if (res.ok) {
				const data = (await res.json()) as { projects: MockProject[] }
				setProjects(data.projects)
			}
		} catch {
			showThrottledNotification({
				color: "red",
				message: t("notifications.failedLoadProjects"),
				throttleKey: "failedLoadProjects",
				title: t("notifications.error"),
			})
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
				message: t("notifications.failedLoadRequests"),
				throttleKey: "failedLoadRequests",
				title: t("notifications.error"),
			})
		}
	}, [t])

	useEffect(() => {
		async function load() {
			setLoading(true)
			await Promise.all([
				fetchDevices(),
				fetchProjects(),
				fetchRequests(),
			])
			setLoading(false)
		}

		void load()

		const pollInterval = setInterval(() => {
			void fetchRequests()
			void fetchDevices()
		}, 5000)

		return () => clearInterval(pollInterval)
	}, [fetchRequests]) // eslint-disable-line react-hooks/exhaustive-deps

	async function handleRegister() {
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

				setLocalDeviceId(data.device.deviceId)

				// Immediately mark device as online so it shows up as a target
				await fetch(`/api/devices/${data.device.deviceId}/heartbeat`, {
					method: "POST",
					// eslint-disable-next-line @typescript-eslint/naming-convention
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ status: "online" }),
				})

				notifications.show({
					color: "green",
					message: t("notifications.deviceRegistered", {
						name: newDeviceName.trim(),
					}),
					title: t("notifications.success"),
				})
				setNewDeviceName("")
				closeRegister()
				await fetchDevices()
			} else {
				const data = (await res.json()) as { error?: string }
				notifications.show({
					color: "red",
					message:
						data.error ?? t("notifications.failedRegisterDevice"),
					title: t("notifications.error"),
				})
			}
		} catch {
			notifications.show({
				color: "red",
				message: t("notifications.failedRegisterDevice"),
				title: t("notifications.error"),
			})
		}
	}

	async function handleSendRequest() {
		if (
			!sendSourceDeviceIds.length ||
			!sendTargetDeviceIds.length ||
			!sendProjectId ||
			!sendFragmentIds.length
		) {
			notifications.show({
				color: "yellow",
				message: t("send.incomplete"),
				title: t("notifications.incomplete"),
			})

			return
		}

		const project = projects.find((p) => p.id === sendProjectId)
		const useMock = sendFragmentIds.includes(USE_MOCK_FRAGMENTS)

		const fragmentIds = useMock ? [MOCK_FRAGMENT_ID] : sendFragmentIds
		const fragmentNames = useMock
			? ["frame-001.png", "frame-002.png"]
			: (project?.fragments
					.filter((f) => sendFragmentIds.includes(f.id))
					.map((f) => f.name) ?? [])

		let successCount = 0
		let failCount = 0

		for (const sourceId of sendSourceDeviceIds) {
			for (const targetId of sendTargetDeviceIds) {
				if (sourceId === targetId) continue

				try {
					const res = await fetch("/api/transfer-requests", {
						body: JSON.stringify({
							direction: "SEND",
							fragmentIds,
							fragmentNames,
							message: sendMessage || undefined,
							projectId: sendProjectId,
							projectName: project?.name,
							sourceDeviceIds: [sourceId],
							targetDeviceIds: [targetId],
						}),
						// eslint-disable-next-line @typescript-eslint/naming-convention
						headers: { "Content-Type": "application/json" },
						method: "POST",
					})

					if (res.ok) {
						successCount++
					} else {
						failCount++
					}
				} catch {
					failCount++
				}
			}
		}

		if (successCount > 0) {
			notifications.show({
				color: "green",
				message: t("notifications.requestSent", {
					count: successCount.toString(),
				}),
				title: t("notifications.success"),
			})
		}

		if (failCount > 0) {
			notifications.show({
				color: "red",
				message: t("notifications.failedSendRequest"),
				title: t("notifications.error"),
			})
		}

		setSendProjectId(null)
		setSendFragmentIds([])
		setSendSourceDeviceIds([])
		setSendTargetDeviceIds([])
		setSendMessage("")
		await fetchRequests()
	}

	async function handleRespond(
		requestId: string,
		deviceId: string,
		action: "accept" | "reject",
	) {
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
							? t("notifications.requestAccepted")
							: t("notifications.requestRejected"),
					title: t("notifications.success"),
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

	async function handleCancelTransfer(requestId: string, deviceId: string) {
		try {
			const res = await fetch(
				`/api/transfer-requests/${requestId}/participants/${deviceId}/cancel`,
				{ method: "PUT" },
			)

			if (res.ok) {
				cancelTransfer(requestId)
				notifications.show({
					color: "orange",
					message: t("notifications.transferCancelled"),
					title: t("notifications.success"),
				})
				await fetchRequests()
			} else {
				const data = (await res.json()) as { error?: string }
				notifications.show({
					color: "red",
					message: data.error ?? t("notifications.cancelFailed"),
					title: t("notifications.error"),
				})
			}
		} catch {
			notifications.show({
				color: "red",
				message: t("notifications.cancelFailed"),
				title: t("notifications.error"),
			})
		}
	}

	const selectedProject = projects.find((p) => p.id === sendProjectId)
	const onlineDevices = devices.filter(
		(d) =>
			statuses[d.deviceId]?.state === "online" &&
			d.deviceId !== localDeviceId,
	)

	const currentDeviceName =
		localDeviceId &&
		devices.find((d) => d.deviceId === localDeviceId)?.deviceName

	return (
		<>
			<Group justify="space-between" mb="lg">
				<div>
					<Title order={2}>{t("title")}</Title>
					<Text c="dimmed" size="sm">
						{t("subtitle")}
					</Text>
					{currentDeviceName ? (
						<Text c="dimmed" size="xs">
							Current device: {currentDeviceName}
						</Text>
					) : null}
				</div>
				<Button
					leftSection={<IconPlus size={16} />}
					onClick={openRegister}>
					{t("registerDevice")}
				</Button>
			</Group>

			{activeTransfers.size > 0 ? (
				<Card withBorder padding="md" radius="md" mb="md">
					<Text fw={500} mb="sm" size="sm">
						{t("requests.activeTransfers")}
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

			<Tabs value={activeTab} onChange={setActiveTab}>
				<Tabs.List mb="md">
					<Tabs.Tab
						leftSection={<IconDeviceDesktop size={16} />}
						value="devices">
						{t("tabs.devices")}
					</Tabs.Tab>
					<Tabs.Tab leftSection={<IconSend size={16} />} value="send">
						{t("tabs.send")}
					</Tabs.Tab>
					<Tabs.Tab
						leftSection={<IconUser size={16} />}
						value="receive">
						{t("tabs.receive")}
					</Tabs.Tab>
					<Tabs.Tab
						leftSection={<IconArrowsLeftRight size={16} />}
						value="requests">
						{t("tabs.requests")}
						{requests.length ? ` (${requests.length})` : ""}
					</Tabs.Tab>
				</Tabs.List>

				<Tabs.Panel value="devices">
					<Card withBorder padding="lg" radius="md" mb="md">
						<Text fw={500} mb="md" size="lg">
							{t("connectedDevices")}
						</Text>
						{loading ? (
							<Stack gap="xs">
								<Skeleton height={36} radius="sm" mb="xs" />
								<Skeleton height={52} radius="sm" />
								<Skeleton height={52} radius="sm" />
								<Skeleton height={52} radius="sm" />
							</Stack>
						) : devices.length === 0 ? (
							<Text c="dimmed">{t("noDevices")}</Text>
						) : (
							<Table>
								<Table.Thead>
									<Table.Tr>
										<Table.Th>{t("table.name")}</Table.Th>
										<Table.Th>{t("table.status")}</Table.Th>
										<Table.Th>
											{t("table.lastSeen")}
										</Table.Th>
									</Table.Tr>
								</Table.Thead>
								<Table.Tbody>
									{devices.map((device) => {
										const deviceStatus =
											statuses[device.deviceId]?.state ??
											"offline"
										const isCurrent =
											device.deviceId === localDeviceId

										return (
											<Table.Tr key={device.deviceId}>
												<Table.Td>
													<Group gap="sm">
														<IconDeviceDesktop
															size={18}
														/>
														<Text>
															{device.deviceName}
															{isCurrent
																? " (this)"
																: ""}
														</Text>
													</Group>
												</Table.Td>
												<Table.Td>
													<Badge
														color={statusColor(
															deviceStatus,
														)}
														variant="light">
														{t(
															`status.${deviceStatus}`,
														)}
													</Badge>
												</Table.Td>
												<Table.Td>
													<Text c="dimmed" size="sm">
														{new Date(
															device.updatedAt,
														).toLocaleString()}
													</Text>
												</Table.Td>
											</Table.Tr>
										)
									})}
								</Table.Tbody>
							</Table>
						)}
					</Card>
				</Tabs.Panel>

				<Tabs.Panel value="send">
					<Card withBorder padding="lg" radius="md" mb="md">
						<Text fw={500} mb="md" size="lg">
							{t("send.title")}
						</Text>

						<Stack gap="md">
							<div>
								<Text fw={500} mb="xs" size="sm">
									{t("send.selectSource")}
								</Text>
								{devices.length === 0 ? (
									<Text c="dimmed" size="sm">
										{t("send.noDevices")}
									</Text>
								) : (
									<Accordion>
										{devices
											.filter(
												(d) =>
													!sendTargetDeviceIds.includes(
														d.deviceId,
													),
											)
											.map((device) => (
												<Accordion.Item
													key={device.deviceId}
													value={device.deviceId}>
													<Accordion.Control>
														<Group gap="sm">
															<Checkbox
																checked={sendSourceDeviceIds.includes(
																	device.deviceId,
																)}
																onChange={() =>
																	setSendSourceDeviceIds(
																		(
																			prev: string[],
																		) =>
																			prev.includes(
																				device.deviceId,
																			)
																				? prev.filter(
																						(
																							id: string,
																						) =>
																							id !==
																							device.deviceId,
																					)
																				: [
																						...prev,
																						device.deviceId,
																					],
																	)
																}
															/>
															<IconDeviceDesktop
																size={16}
															/>
															<Text size="sm">
																{
																	device.deviceName
																}
																{device.deviceId ===
																localDeviceId
																	? " (this)"
																	: ""}
															</Text>
															<Badge
																color={statusColor(
																	statuses[
																		device
																			.deviceId
																	]?.state ??
																		"offline",
																)}
																size="sm"
																variant="light">
																{t(
																	`status.${statuses[device.deviceId]?.state ?? "offline"}`,
																)}
															</Badge>
														</Group>
													</Accordion.Control>
												</Accordion.Item>
											))}
									</Accordion>
								)}
							</div>

							<Divider />

							<div>
								<Text fw={500} mb="xs" size="sm">
									{t("send.selectProject")}
								</Text>
								{projects.length === 0 ? (
									<Text c="dimmed" size="sm">
										{t("send.noProjects")}
									</Text>
								) : (
									<Accordion>
										{projects.map((project) => (
											<Accordion.Item
												key={project.id}
												value={project.id}>
												<Accordion.Control>
													<Group gap="sm">
														<Checkbox
															checked={
																sendProjectId ===
																project.id
															}
															onChange={() => {
																setSendProjectId(
																	sendProjectId ===
																		project.id
																		? null
																		: project.id,
																)
																setSendFragmentIds(
																	[],
																)
															}}
														/>
														<div>
															<Text size="sm">
																{project.name}
															</Text>
															<Text
																c="dimmed"
																size="xs">
																{
																	project
																		.fragments
																		.length
																}{" "}
																{t(
																	"send.fragments",
																)}
																{project.description
																	? ` — ${project.description}`
																	: ""}
															</Text>
														</div>
													</Group>
												</Accordion.Control>
												<Accordion.Panel>
													{project.fragments.length >
													0 ? (
														project.fragments.map(
															(fragment) => (
																<Checkbox
																	key={
																		fragment.id
																	}
																	checked={sendFragmentIds.includes(
																		fragment.id,
																	)}
																	disabled={
																		sendProjectId !==
																		project.id
																	}
																	label={`${fragment.name} (${formatBytes(fragment.size)}, ${formatDuration(fragment.duration)})`}
																	mb="xs"
																	onChange={() => {
																		setSendFragmentIds(
																			(
																				prev,
																			) =>
																				prev.includes(
																					fragment.id,
																				)
																					? prev.filter(
																							(
																								id,
																							) =>
																								id !==
																								fragment.id,
																						)
																					: [
																							...prev,
																							fragment.id,
																						],
																		)
																	}}
																/>
															),
														)
													) : (
														<Checkbox
															checked={sendFragmentIds.includes(
																USE_MOCK_FRAGMENTS,
															)}
															disabled={
																sendProjectId !==
																project.id
															}
															label="Use mock fragments (frame-001.png, frame-002.png)"
															description="Project has no fragments — mock data will be transferred for testing"
															mb="xs"
															onChange={() => {
																setSendFragmentIds(
																	(prev) =>
																		prev.includes(
																			USE_MOCK_FRAGMENTS,
																		)
																			? []
																			: [
																					USE_MOCK_FRAGMENTS,
																				],
																)
															}}
														/>
													)}
												</Accordion.Panel>
											</Accordion.Item>
										))}
									</Accordion>
								)}
							</div>

							<Divider />

							<div>
								<Text fw={500} mb="xs" size="sm">
									{t("send.selectTarget")}
								</Text>
								{devices.length === 0 ? (
									<Text c="dimmed" size="sm">
										{t("send.noDevices")}
									</Text>
								) : (
									<Accordion>
										{devices
											.filter(
												(d) =>
													!sendSourceDeviceIds.includes(
														d.deviceId,
													),
											)
											.map((device) => (
												<Accordion.Item
													key={device.deviceId}
													value={device.deviceId}>
													<Accordion.Control>
														<Group gap="sm">
															<Checkbox
																checked={sendTargetDeviceIds.includes(
																	device.deviceId,
																)}
																onChange={() =>
																	setSendTargetDeviceIds(
																		(
																			prev: string[],
																		) =>
																			prev.includes(
																				device.deviceId,
																			)
																				? prev.filter(
																						(
																							id: string,
																						) =>
																							id !==
																							device.deviceId,
																					)
																				: [
																						...prev,
																						device.deviceId,
																					],
																	)
																}
															/>
															<IconDeviceDesktop
																size={16}
															/>
															<Text size="sm">
																{
																	device.deviceName
																}
															</Text>
															<Badge
																color={statusColor(
																	statuses[
																		device
																			.deviceId
																	]?.state ??
																		"offline",
																)}
																size="sm"
																variant="light">
																{t(
																	`status.${statuses[device.deviceId]?.state ?? "offline"}`,
																)}
															</Badge>
														</Group>
													</Accordion.Control>
												</Accordion.Item>
											))}
									</Accordion>
								)}
							</div>

							<Divider />

							<Textarea
								label={t("send.messageLabel")}
								placeholder={t("send.messagePlaceholder")}
								value={sendMessage}
								onChange={(e) =>
									setSendMessage(e.currentTarget.value)
								}
							/>

							<Button
								disabled={
									!sendSourceDeviceIds.length ||
									!sendProjectId ||
									!sendTargetDeviceIds.length ||
									!sendFragmentIds.length
								}
								leftSection={<IconSend size={16} />}
								onClick={handleSendRequest}>
								{sendSourceDeviceIds.length > 0 &&
								sendTargetDeviceIds.length > 0 &&
								selectedProject
									? `Send (${sendSourceDeviceIds.length} → ${sendTargetDeviceIds.length})`
									: t("send.sendButton")}
							</Button>
						</Stack>
					</Card>
				</Tabs.Panel>

				<Tabs.Panel value="receive">
					<Card withBorder padding="lg" radius="md" mb="md">
						<Text fw={500} mb="md" size="lg">
							{t("receive.title")}
						</Text>
						<Text c="dimmed" mb="md" size="sm">
							{t("receive.description")}
						</Text>
						{onlineDevices.length === 0 ? (
							<Text c="dimmed">
								{t("receive.noOnlineDevices")}
							</Text>
						) : (
							<Stack gap="md">
								{onlineDevices.map((device) => (
									<Card
										key={device.deviceId}
										withBorder
										padding="md"
										radius="sm">
										<Group justify="space-between" mb="sm">
											<Group gap="sm">
												<IconDeviceDesktop size={18} />
												<Text fw={500}>
													{device.deviceName}
												</Text>
												<Badge
													color={statusColor(
														statuses[
															device.deviceId
														]?.state ?? "offline",
													)}
													size="sm"
													variant="light">
													{t(
														`status.${statuses[device.deviceId]?.state ?? "offline"}`,
													)}
												</Badge>
											</Group>
										</Group>
										{projects.length > 0 ? (
											<Accordion>
												{projects.map((project) => (
													<Accordion.Item
														key={project.id}
														value={project.id}>
														<Accordion.Control>
															<Text size="sm">
																{project.name}
															</Text>
															<Text
																c="dimmed"
																size="xs">
																{
																	project
																		.fragments
																		.length
																}{" "}
																{t(
																	"send.fragments",
																)}
																{project.description
																	? ` — ${project.description}`
																	: ""}
															</Text>
														</Accordion.Control>
														<Accordion.Panel>
															{project.fragments.map(
																(fragment) => (
																	<Text
																		c="dimmed"
																		key={
																			fragment.id
																		}
																		size="sm">
																		{
																			fragment.name
																		}{" "}
																		(
																		{formatBytes(
																			fragment.size,
																		)}
																		,{" "}
																		{formatDuration(
																			fragment.duration,
																		)}
																		)
																	</Text>
																),
															)}
														</Accordion.Panel>
													</Accordion.Item>
												))}
											</Accordion>
										) : null}
									</Card>
								))}
							</Stack>
						)}
					</Card>
				</Tabs.Panel>

				<Tabs.Panel value="requests">
					{/* Incoming */}
					{(() => {
						const myDeviceIds = new Set(
							devices.map((d) => d.deviceId),
						)
						const incoming = requests.filter(
							(r) =>
								r.participants.some(
									(p) =>
										myDeviceIds.has(p.deviceId) &&
										(p.status === "PENDING" ||
											p.status === "ACCEPTED"),
								) &&
								(r.status === "PENDING" ||
									r.status === "ACTIVE") &&
								!isExpired(r),
						)

						if (incoming.length === 0) return null

						return (
							<Card withBorder padding="lg" radius="md" mb="md">
								<Text fw={500} mb="md" size="lg">
									{t("requests.incoming")}
								</Text>
								<Text c="dimmed" mb="md" size="sm">
									{t("requests.incomingDescription")}
								</Text>
								<Stack gap="md">
									{incoming.map((req) => {
										const myParticipant =
											req.participants.find(
												(p) =>
													myDeviceIds.has(
														p.deviceId,
													) &&
													(p.status === "PENDING" ||
														p.status ===
															"ACCEPTED"),
											)
										const isTarget =
											myParticipant?.role === "TARGET"
										const sourceName =
											req.participants.find(
												(p) => p.role === "SOURCE",
											)?.deviceName ?? ""
										const targetName =
											req.participants.find(
												(p) => p.role === "TARGET",
											)?.deviceName ?? ""
										const label = isTarget
											? `${t("requests.from")} ${sourceName} — ${req.direction === "SEND" ? t("requests.sendingYou") : t("requests.requestingFromYou")}`
											: `${t("requests.to")} ${targetName} — ${req.direction === "SEND" ? t("requests.sendingFiles") : t("requests.requestingFiles")}`

										const isAccepted =
											myParticipant?.status === "ACCEPTED"

										return (
											<Card
												key={req.id}
												withBorder
												padding="md"
												radius="sm">
												<Group
													justify="space-between"
													mb="xs">
													<div>
														<Text fw={500}>
															{label}
														</Text>
														<Text
															c="dimmed"
															size="xs">
															{isTarget
																? `${t("requests.to")} ${targetName}`
																: `${t("requests.from")} ${sourceName}`}
														</Text>
														{req.projectName ? (
															<Text
																c="dimmed"
																size="sm">
																{t(
																	"requests.projectLabel",
																)}{" "}
																{
																	req.projectName
																}
															</Text>
														) : null}
														{req.fragmentNames
															.length > 0 ? (
															<Text
																c="dimmed"
																size="sm">
																{t(
																	"requests.fragmentsLabel",
																)}{" "}
																{req.fragmentNames.join(
																	", ",
																)}
															</Text>
														) : null}
														{req.message ? (
															<Text
																c="dimmed"
																size="sm">
																{t(
																	"requests.messageLabel",
																)}{" "}
																{req.message}
															</Text>
														) : null}
														<Text
															c="dimmed"
															size="xs">
															{t(
																"requests.expiresLabel",
															)}{" "}
															{new Date(
																req.expiresAt,
															).toLocaleString()}
														</Text>
													</div>
													{isAccepted ? (
														<Badge
															color="green"
															variant="light"
															size="lg">
															{t(
																"requests.accepted",
															)}
														</Badge>
													) : (
														<Group>
															<Button
																color="green"
																size="sm"
																onClick={() =>
																	handleRespond(
																		req.id,
																		localDeviceId ??
																			"",
																		"accept",
																	)
																}>
																{t(
																	"requests.accept",
																)}
															</Button>
															<Button
																color="red"
																size="sm"
																variant="outline"
																onClick={() =>
																	handleRespond(
																		req.id,
																		localDeviceId ??
																			"",
																		"reject",
																	)
																}>
																{t(
																	"requests.reject",
																)}
															</Button>
														</Group>
													)}
												</Group>
											</Card>
										)
									})}
								</Stack>
							</Card>
						)
					})()}

					{/* Sent */}
					{(() => {
						const myDeviceIds = new Set(
							devices.map((d) => d.deviceId),
						)
						const sent = requests.filter(
							(r) =>
								r.participants.some(
									(p) =>
										myDeviceIds.has(p.deviceId) &&
										p.role === "SOURCE" &&
										(p.status === "PENDING" ||
											p.status === "ACCEPTED"),
								) &&
								(r.status === "PENDING" ||
									r.status === "ACTIVE") &&
								!isExpired(r),
						)

						if (sent.length === 0) return null

						return (
							<Card withBorder padding="lg" radius="md" mb="md">
								<Text fw={500} mb="md" size="lg">
									{t("requests.sent")}
								</Text>
								<Text c="dimmed" mb="md" size="sm">
									{t("requests.sentDescription")}
								</Text>
								<Stack gap="md">
									{sent.map((req) => {
										const myParticipant =
											req.participants.find(
												(p) =>
													myDeviceIds.has(
														p.deviceId,
													) &&
													p.role === "SOURCE" &&
													(p.status === "PENDING" ||
														p.status ===
															"ACCEPTED"),
											)
										const isAccepted =
											myParticipant?.status === "ACCEPTED"
										const targetName =
											req.participants.find(
												(p) => p.role === "TARGET",
											)?.deviceName ?? ""

										return (
											<Card
												key={req.id}
												withBorder
												padding="md"
												radius="sm">
												<Group
													justify="space-between"
													mb="xs">
													<div>
														<Text fw={500}>
															{t("requests.to")}{" "}
															{targetName}
															{" — "}
															{req.direction ===
															"SEND"
																? t(
																		"requests.sendingFiles",
																	)
																: t(
																		"requests.requestingFiles",
																	)}
														</Text>
														{req.projectName ? (
															<Text
																c="dimmed"
																size="sm">
																{t(
																	"requests.projectLabel",
																)}{" "}
																{
																	req.projectName
																}
															</Text>
														) : null}
														{req.fragmentNames
															.length > 0 ? (
															<Text
																c="dimmed"
																size="sm">
																{t(
																	"requests.fragmentsLabel",
																)}{" "}
																{req.fragmentNames.join(
																	", ",
																)}
															</Text>
														) : null}
														{req.message ? (
															<Text
																c="dimmed"
																size="sm">
																{t(
																	"requests.messageLabel",
																)}{" "}
																{req.message}
															</Text>
														) : null}
													</div>
													{isAccepted ? (
														<Badge
															color="green"
															variant="light"
															size="lg">
															{t(
																"requests.accepted",
															)}
														</Badge>
													) : (
														<Button
															color="green"
															size="sm"
															onClick={() =>
																handleRespond(
																	req.id,
																	localDeviceId ??
																		"",
																	"accept",
																)
															}>
															{t(
																"requests.accept",
															)}
														</Button>
													)}
												</Group>
												<Button
													color="red"
													fullWidth
													mt="sm"
													size="xs"
													variant="outline"
													onClick={() =>
														handleCancelTransfer(
															req.id,
															localDeviceId ?? "",
														)
													}>
													{t(
														"requests.cancelRequest",
													)}
												</Button>
											</Card>
										)
									})}
								</Stack>
							</Card>
						)
					})()}

					<Card withBorder padding="lg" radius="md">
						<Text fw={500} mb="md" size="lg">
							{t("requests.title")}
						</Text>
						{requests.length === 0 ? (
							<Text c="dimmed">{t("requests.empty")}</Text>
						) : (
							<>
								{/* Desktop: table layout */}
								<Box visibleFrom="sm">
									<Table>
										<Table.Thead>
											<Table.Tr>
												<Table.Th>
													{t("requests.direction")}
												</Table.Th>
												<Table.Th>
													{t("requests.source")}
												</Table.Th>
												<Table.Th>
													{t("requests.target")}
												</Table.Th>
												<Table.Th>
													{t("requests.project")}
												</Table.Th>
												<Table.Th>
													{t("requests.status")}
												</Table.Th>
												<Table.Th>
													{t("requests.created")}
												</Table.Th>
											</Table.Tr>
										</Table.Thead>
										<Table.Tbody>
											{requests.map((req) => {
												const transfer =
													activeTransfers.get(req.id)

												return (
													<Table.Tr key={req.id}>
														<Table.Td>
															<Badge
																color={
																	req.direction ===
																	"SEND"
																		? "blue"
																		: "violet"
																}
																variant="light">
																{req.direction ===
																"SEND"
																	? t(
																			"requests.sending",
																		)
																	: t(
																			"requests.receiving",
																		)}
															</Badge>
														</Table.Td>
														<Table.Td>
															{req.participants.find(
																(p) =>
																	p.role ===
																	"SOURCE",
															)?.deviceName ?? ""}
														</Table.Td>
														<Table.Td>
															{req.participants.find(
																(p) =>
																	p.role ===
																	"TARGET",
															)?.deviceName ?? ""}
														</Table.Td>
														<Table.Td>
															{req.projectName ?? (
																<Text
																	c="dimmed"
																	size="sm">
																	—
																</Text>
															)}
														</Table.Td>
														<Table.Td>
															<Badge
																color={
																	isExpired(
																		req,
																	)
																		? "gray"
																		: requestStatusColor(
																				req.status,
																			)
																}
																variant="light">
																{isExpired(req)
																	? "EXPIRED"
																	: req.status}
															</Badge>
															{transfer?.peerState ===
																"connected" && (
																<IconPlayerPlay
																	size={14}
																	style={{
																		marginLeft: 4,
																		verticalAlign:
																			"middle",
																	}}
																/>
															)}
														</Table.Td>
														<Table.Td>
															<Text
																c="dimmed"
																size="sm">
																{new Date(
																	req.createdAt,
																).toLocaleString()}
															</Text>
														</Table.Td>
													</Table.Tr>
												)
											})}
										</Table.Tbody>
									</Table>
								</Box>

								{/* Mobile: card layout */}
								<Box hiddenFrom="sm">
									<Stack gap="sm">
										{requests.map((req) => {
											const transfer =
												activeTransfers.get(req.id)

											return (
												<Card
													key={req.id}
													withBorder
													padding="sm"
													radius="sm">
													<Group
														justify="space-between"
														mb="xs">
														<Badge
															color={
																req.direction ===
																"SEND"
																	? "blue"
																	: "violet"
															}
															variant="light">
															{req.direction ===
															"SEND"
																? t(
																		"requests.sending",
																	)
																: t(
																		"requests.receiving",
																	)}
														</Badge>
														<Badge
															color={
																isExpired(req)
																	? "gray"
																	: requestStatusColor(
																			req.status,
																		)
															}
															variant="light">
															{isExpired(req)
																? "EXPIRED"
																: req.status}
															{transfer?.peerState ===
																"connected" && (
																<IconPlayerPlay
																	size={12}
																	style={{
																		marginLeft: 4,
																	}}
																/>
															)}
														</Badge>
													</Group>
													<Text size="sm">
														<span
															style={{
																color: "var(--text-secondary)",
															}}>
															From:{" "}
														</span>
														{req.participants.find(
															(p) =>
																p.role ===
																"SOURCE",
														)?.deviceName ?? ""}
													</Text>
													<Text size="sm">
														<span
															style={{
																color: "var(--text-secondary)",
															}}>
															{t("requests.to")}
															:{" "}
														</span>
														{req.participants.find(
															(p) =>
																p.role ===
																"TARGET",
														)?.deviceName ?? ""}
													</Text>
													{req.projectName && (
														<Text size="sm">
															<span
																style={{
																	color: "var(--text-secondary)",
																}}>
																{t(
																	"requests.projectLabel",
																)}{" "}
															</span>
															{req.projectName}
														</Text>
													)}
													<Text
														c="dimmed"
														size="xs"
														mt="xs">
														{new Date(
															req.createdAt,
														).toLocaleString()}
													</Text>
												</Card>
											)
										})}
									</Stack>
								</Box>
							</>
						)}
					</Card>
				</Tabs.Panel>
			</Tabs>

			<Modal
				onClose={closeRegister}
				opened={registerOpened}
				title={t("modal.title")}>
				<Stack gap="md">
					<TextInput
						autoFocus
						label={t("modal.deviceName")}
						placeholder={t("modal.placeholder")}
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
							{t("modal.cancel")}
						</Button>
						<Button
							disabled={!newDeviceName.trim()}
							leftSection={<IconPlus size={16} />}
							onClick={handleRegister}>
							{t("modal.register")}
						</Button>
					</Group>
				</Stack>
			</Modal>
		</>
	)
}
