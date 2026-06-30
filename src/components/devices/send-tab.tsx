"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { CtaButton } from "@/components/ui/cta-button"
import {
	Accordion,
	Badge,
	Box,
	Button,
	Card,
	Checkbox,
	Divider,
	Group,
	Stack,
	Text,
	Textarea,
	Tooltip,
} from "@mantine/core"
import { notifications } from "@mantine/notifications"
import {
	IconAlertTriangle,
	IconCircle,
	IconCircleCheckFilled,
	IconDeviceDesktop,
	IconSend,
	IconStar,
} from "@tabler/icons-react"
import { useTranslations } from "next-intl"

import {
	useSendFragments,
	type Device,
	type DeviceFragmentMap,
	type Project,
	type SourceFragmentInfo,
} from "@/lib/devices/send-fragments"

type SendTabProps = {
	devices: Device[]
	deviceFragments: DeviceFragmentMap
	localDeviceId: string | null
	projects: Project[]
	onSendComplete?: () => void
}

const formatBytes = (bytes: number): string => {
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
	if (bytes < 1024 * 1024 * 1024)
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
	return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`
}

const formatDuration = (seconds: number): string => {
	const m = Math.floor(seconds / 60)
	const s = Math.round(seconds % 60)
	return `${m}:${s.toString().padStart(2, "0")}`
}

const formatRelativeTime = (isoString: string): string => {
	const diff = Date.now() - new Date(isoString).getTime()
	const seconds = Math.floor(diff / 1000)
	const minutes = Math.floor(seconds / 60)
	const hours = Math.floor(minutes / 60)
	const days = Math.floor(hours / 24)

	if (days > 7) return `${Math.floor(days / 7)}w ago`
	if (days > 0) return `${days}d ago`
	if (hours > 0) return `${hours}h ago`
	if (minutes > 0) return `${minutes}m ago`

	return `${seconds}s ago`
}

export const SendTab = ({
	devices,
	deviceFragments,
	localDeviceId,
	projects,
	onSendComplete,
}: SendTabProps): React.JSX.Element => {
	const sendTranslations = useTranslations("devices.send")
	const msgTranslations = useTranslations("devices.notifications")

	const hook = useSendFragments({
		deviceFragments,
		devices,
		localDeviceId,
		projects,
	})

	const {
		selectedProjectIds,
		selectedTargetDeviceIds,
		selectedSourceDeviceIds,
		availableTargetDevices,
		duplicateFragmentIds,
		greyedOutFragmentIds,
		uncheckedPerSource,
		sourceDevicesWithFragments,
		canSend,
		toggleProject,
		toggleTarget,
		toggleSource,
		initSourceDefaults,
		toggleFragmentOnSource,
		getFragmentsForSource,
		buildSendPayload,
		resolveDuplicate,
		resolveAllDuplicatesOnDevice,
		resolvedDuplicates,
	} = hook

	const [message, setMessage] = useState("")

	const handleTargetToggle = useCallback(
		(deviceId: string) => {
			toggleTarget(deviceId)
		},
		[toggleTarget],
	)

	const handleProjectToggle = useCallback(
		(projectId: string) => {
			toggleProject(projectId)
		},
		[toggleProject],
	)

	// Auto-initialise source defaults whenever project or target selection changes
	const prevKey = useRef("")

	useEffect(() => {
		const currentKey = `${selectedProjectIds.join()}|${selectedTargetDeviceIds.join()}`

		if (currentKey !== prevKey.current && currentKey !== "|") {
			prevKey.current = currentKey
			initSourceDefaults()
		}
	}, [selectedProjectIds, selectedTargetDeviceIds, initSourceDefaults])

	const totalFragmentsToSend = useMemo(() => {
		if (selectedSourceDeviceIds.length === 0) return 0
		const ids = new Set<string>()
		for (const sourceId of selectedSourceDeviceIds) {
			const frags = getFragmentsForSource(sourceId)
			for (const f of frags) ids.add(f.id)
		}
		return ids.size
	}, [selectedSourceDeviceIds, getFragmentsForSource])

	const handleSend = useCallback(async () => {
		const payload = buildSendPayload(message)

		if (payload.length === 0) return

		let successCount = 0
		let failCount = 0

		for (const item of payload) {
			if (item.sourceDeviceId === item.targetDeviceId) continue

			try {
				const res = await fetch("/api/transfer-requests", {
					body: JSON.stringify({
						direction: "SEND",
						fragmentIds: item.fragmentIds,
						fragmentNames: item.fragmentNames,
						message: item.message || undefined,
						projectId: item.projectIds[0] ?? undefined,
						projectName: item.projectNames[0] ?? undefined,
						sourceDeviceIds: [item.sourceDeviceId],
						targetDeviceIds: [item.targetDeviceId],
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

		if (successCount > 0) {
			notifications.show({
				color: "green",
				message: msgTranslations("requestSent", {
					count: successCount.toString(),
				}),
				title: msgTranslations("success"),
			})
		}

		if (failCount > 0) {
			notifications.show({
				color: "red",
				message: msgTranslations("failedSendRequest"),
				title: msgTranslations("error"),
			})
		}

		setMessage("")
		onSendComplete?.()
	}, [buildSendPayload, message, msgTranslations, onSendComplete])

	return (
		<Card withBorder padding="lg" radius="md" mb="md">
			<Text fw={500} mb="md" size="lg">
				{sendTranslations("title")}
			</Text>

			<Stack gap="md">
				{/* Step 1: Project Selection */}
				<div>
					<Text fw={500} mb="xs" size="sm">
						{sendTranslations("selectProject")}
					</Text>
					{projects.length === 0 ? (
						<Text c="dimmed" size="sm">
							{sendTranslations("noProjects")}
						</Text>
					) : (
						<Accordion multiple>
							{projects.map((project) => {
								const isSelected = selectedProjectIds.includes(
									project.id,
								)
								const greyedCount = isSelected
									? project.fragments.filter((f) =>
											greyedOutFragmentIds.has(f.id),
										).length
									: 0

								return (
									<Accordion.Item
										key={project.id}
										value={project.id}>
										<Accordion.Control>
											<Group gap="sm">
												<Checkbox
													checked={isSelected}
													onChange={() =>
														handleProjectToggle(
															project.id,
														)
													}
													onClick={(e) =>
														e.stopPropagation()
													}
												/>
												<div>
													<Text size="sm">
														{project.name}
													</Text>
													<Text c="dimmed" size="xs">
														{
															project.fragments
																.length
														}{" "}
														{sendTranslations(
															"fragments",
														)}
														{project.description
															? ` — ${project.description}`
															: ""}
													</Text>
												</div>
												{isSelected &&
												greyedCount > 0 ? (
													<Badge
														color="gray"
														size="sm"
														variant="light">
														{sendTranslations(
															"alreadyOnTarget",
															{
																count: greyedCount.toString(),
															},
														)}
													</Badge>
												) : null}
											</Group>
										</Accordion.Control>
										<Accordion.Panel>
											{project.fragments.length > 0
												? project.fragments.map(
														(fragment) => {
															const checked =
																isSelected
															const greyedOut =
																isSelected &&
																greyedOutFragmentIds.has(
																	fragment.id,
																)

															return (
																<Group
																	key={
																		fragment.id
																	}
																	gap="xs"
																	mb="xs">
																	{checked ? (
																		<IconCircleCheckFilled
																			size={
																				16
																			}
																			color={
																				greyedOut
																					? "var(--mantine-color-gray-5)"
																					: "var(--mantine-color-blue-6)"
																			}
																			style={
																				greyedOut
																					? {
																							opacity: 0.5,
																						}
																					: undefined
																			}
																		/>
																	) : (
																		<IconCircle
																			size={
																				16
																			}
																			color="var(--mantine-color-gray-5)"
																		/>
																	)}
																	<Text
																		size="sm"
																		c={
																			greyedOut
																				? "dimmed"
																				: undefined
																		}
																		style={
																			greyedOut
																				? {
																						textDecoration:
																							"line-through",
																					}
																				: undefined
																		}>
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
																</Group>
															)
														},
													)
												: null}
										</Accordion.Panel>
									</Accordion.Item>
								)
							})}
						</Accordion>
					)}
				</div>

				{/* Step 2: Target Selection */}
				<div>
					<Text
						fw={500}
						mb="xs"
						size="sm"
						c={
							selectedProjectIds.length === 0
								? "dimmed"
								: undefined
						}>
						{sendTranslations("selectTarget")}
						<Text component="span" c="dimmed" fw={400} size="sm">
							{" — "}
							{sendTranslations("selectTargetDescription")}
						</Text>
					</Text>
					{selectedProjectIds.length > 0 ? (
						availableTargetDevices.length === 0 ? (
							<Text c="dimmed" size="sm">
								{sendTranslations("noDevicesForProject")}
							</Text>
						) : (
							<Box pl="md">
								<Stack gap="xs">
									{availableTargetDevices.map((device) => {
										const isTarget =
											selectedTargetDeviceIds.includes(
												device.deviceId,
											)

										return (
											<Checkbox
												key={device.deviceId}
												checked={isTarget}
												onChange={() =>
													handleTargetToggle(
														device.deviceId,
													)
												}
												label={device.deviceName}
												description={
													device.deviceId ===
													localDeviceId
														? sendTranslations(
																"thisDevice",
															)
														: undefined
												}
											/>
										)
									})}
								</Stack>
							</Box>
						)
					) : null}
				</div>

				<Divider />

				{/* Step 3: Source Selection */}
				<div>
					<Text
						fw={500}
						mb="xs"
						size="sm"
						c={
							selectedTargetDeviceIds.length === 0
								? "dimmed"
								: undefined
						}>
						{sendTranslations("selectSource")}
						<Text component="span" c="dimmed" fw={400} size="sm">
							{" — "}
							{sendTranslations("selectSourceDescription")}
						</Text>
					</Text>
					{selectedProjectIds.length > 0 &&
					selectedTargetDeviceIds.length > 0 ? (
						<>
							{duplicateFragmentIds.size > 0 ? (
								<>
									<Text
										c="dimmed"
										mb={4}
										size="xs"
										component="div">
										<Group gap={4}>
											<IconAlertTriangle
												color="var(--mantine-color-yellow-6)"
												size={14}
											/>
											<Text c="dimmed" size="xs">
												{sendTranslations(
													"duplicateWarning",
												)}
											</Text>
										</Group>
									</Text>
									{resolvedDuplicates.size > 0 ? (
										<Text
											c="dimmed"
											mb="xs"
											size="xs"
											component="div">
											<Group gap={4}>
												<IconCircleCheckFilled
													color="var(--mantine-color-teal-6)"
													size={14}
												/>
												<Text c="dimmed" size="xs">
													{sendTranslations(
														"duplicatesResolved",
													)}
												</Text>
											</Group>
										</Text>
									) : null}
								</>
							) : null}
							{sourceDevicesWithFragments.length > 0 ? (
								<Accordion multiple>
									{sourceDevicesWithFragments.map(
										({
											device,
											fragments,
											isDuplicate,
											unresolvedDuplicateCount,
										}) => (
											<Accordion.Item
												key={device.deviceId}
												value={device.deviceId}>
												<Accordion.Control>
													<Group gap="sm">
														<Checkbox
															checked={selectedSourceDeviceIds.includes(
																device.deviceId,
															)}
															onChange={() =>
																toggleSource(
																	device.deviceId,
																)
															}
															onClick={(e) =>
																e.stopPropagation()
															}
														/>
														<IconDeviceDesktop
															size={16}
														/>
														<Text size="sm">
															{device.deviceName}
														</Text>
														{isDuplicate ? (
															<Tooltip
																label={sendTranslations(
																	"duplicateWarning",
																)}
																withArrow>
																<Box
																	style={{
																		display:
																			"flex",
																		alignItems:
																			"center",
																	}}>
																	<IconAlertTriangle
																		color="var(--mantine-color-yellow-6)"
																		size={
																			16
																		}
																	/>
																</Box>
															</Tooltip>
														) : null}
														{unresolvedDuplicateCount >
														0 ? (
															<Button
																size="compact-xs"
																variant="light"
																color="teal"
																leftSection={
																	<IconStar
																		size={
																			12
																		}
																	/>
																}
																onClick={(
																	e,
																) => {
																	e.stopPropagation()
																	resolveAllDuplicatesOnDevice(
																		device.deviceId,
																	)
																}}>
																{sendTranslations(
																	"resolveAllDuplicates",
																)}
															</Button>
														) : null}
													</Group>
												</Accordion.Control>
												<Accordion.Panel>
													{fragments.map(
														(
															fragmentInfo: SourceFragmentInfo,
														) => {
															const {
																fragment,
																isDuplicate:
																	isDup,
																isResolved,
																updatedAt,
															} = fragmentInfo
															const isUnchecked =
																uncheckedPerSource
																	.get(
																		device.deviceId,
																	)
																	?.has(
																		fragment.id,
																	) ?? false
															const checkboxColor =
																isDup &&
																!isResolved
																	? "yellow"
																	: isDup &&
																		  isResolved
																		? "teal"
																		: "blue"

															return (
																<Group
																	key={
																		fragment.id
																	}
																	gap="xs"
																	mb="xs">
																	<Checkbox
																		checked={
																			!isUnchecked
																		}
																		onChange={() =>
																			toggleFragmentOnSource(
																				device.deviceId,
																				fragment.id,
																			)
																		}
																		color={
																			checkboxColor
																		}
																	/>
																	<Box>
																		<Text size="sm">
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
																		{isDup ? (
																			<Group
																				gap={
																					4
																				}>
																				<Text
																					c="dimmed"
																					size="xs">
																					{isResolved
																						? sendTranslations(
																								"duplicateResolved",
																								{
																									device:
																										fragments.find(
																											(
																												fi,
																											) =>
																												fi.isDuplicate &&
																												fi.isAuthoritative,
																										)
																											?.fragment
																											.name ??
																										"",
																								},
																							)
																						: sendTranslations(
																								"alsoOnAnotherSource",
																							)}
																				</Text>
																				{isDup ? (
																					<Tooltip
																						label={
																							updatedAt
																								? `${sendTranslations("updatedAt", { time: formatRelativeTime(updatedAt) })} — ${new Date(updatedAt).toISOString()}`
																								: ""
																						}
																						withArrow>
																						<Text
																							c="dimmed"
																							size="xs">
																							{updatedAt
																								? formatRelativeTime(
																										updatedAt,
																									)
																								: ""}
																						</Text>
																					</Tooltip>
																				) : null}
																			</Group>
																		) : null}
																	</Box>
																	{isDup &&
																	!isResolved ? (
																		<Button
																			size="compact-xs"
																			variant="light"
																			color="teal"
																			leftSection={
																				<IconStar
																					size={
																						12
																					}
																				/>
																			}
																			onClick={() =>
																				resolveDuplicate(
																					fragment.id,
																					device.deviceId,
																				)
																			}>
																			{sendTranslations(
																				"resolveDuplicate",
																			)}
																		</Button>
																	) : null}
																</Group>
															)
														},
													)}
												</Accordion.Panel>
											</Accordion.Item>
										),
									)}
								</Accordion>
							) : (
								<Text c="dimmed" size="sm">
									{sendTranslations("noSourceDevices")}
								</Text>
							)}
						</>
					) : null}
				</div>

				<Divider />

				{/* Message */}
				<Textarea
					label={sendTranslations("messageLabel")}
					placeholder={sendTranslations("messagePlaceholder")}
					value={message}
					onChange={(e) => setMessage(e.currentTarget.value)}
				/>

				{/* Send Button */}
				<CtaButton
					disabled={!canSend}
					leftSection={<IconSend size={16} />}
					onClick={handleSend}>
					{canSend
						? sendTranslations("sendCount", {
								fragments: totalFragmentsToSend.toString(),
								targets:
									selectedTargetDeviceIds.length.toString(),
							})
						: sendTranslations("sendButton")}
				</CtaButton>
			</Stack>
		</Card>
	)
}
