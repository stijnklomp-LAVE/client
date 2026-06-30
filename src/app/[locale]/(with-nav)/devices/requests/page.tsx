"use client"

import {
	Badge,
	Box,
	Button,
	Card,
	Group,
	Stack,
	Table,
	Text,
} from "@mantine/core"
import { IconPlayerPlay } from "@tabler/icons-react"
import { useTranslations } from "next-intl"

import { useDevicesContext } from "@/lib/devices/devices-context"
import type { TransferRequest } from "@/lib/devices/devices-context"

const requestStatusColor = (status: TransferRequest["status"]): string => {
	switch (status) {
		case "PENDING":
			return "blue"
		case "ACTIVE":
			return "green"
		case "DELETED":
			return "red"
		case "EXPIRED":
			return "gray"
		case "COMPLETED":
			return "teal"
	}
}

const isExpired = (req: TransferRequest): boolean => {
	return req.status === "PENDING" && new Date(req.expiresAt) < new Date()
}

export default function RequestsPage(): React.JSX.Element {
	const translations = useTranslations("devices")
	const {
		devices,
		requests,
		localDeviceId,
		activeTransfers,
		handleRespond,
		handleCancelTransfer,
	} = useDevicesContext()

	const myDeviceIds = new Set(devices.map((d) => d.deviceId))

	const incoming = requests.filter(
		(r) =>
			r.participants.some(
				(p) =>
					myDeviceIds.has(p.deviceId) &&
					(p.status === "PENDING" || p.status === "ACCEPTED"),
			) &&
			(r.status === "PENDING" || r.status === "ACTIVE") &&
			!isExpired(r),
	)

	const sent = requests.filter(
		(r) =>
			r.participants.some(
				(p) =>
					myDeviceIds.has(p.deviceId) &&
					p.role === "SOURCE" &&
					(p.status === "PENDING" || p.status === "ACCEPTED"),
			) &&
			(r.status === "PENDING" || r.status === "ACTIVE") &&
			!isExpired(r),
	)

	return (
		<>
			{/* Incoming */}
			{incoming.length > 0 ? (
				<Card withBorder padding="lg" radius="md" mb="md">
					<Text fw={500} mb="md" size="lg">
						{translations("requests.incoming")}
					</Text>
					<Text c="dimmed" mb="md" size="sm">
						{translations("requests.incomingDescription")}
					</Text>
					<Stack gap="md">
						{incoming.map((req) => {
							const myParticipant = req.participants.find(
								(p) =>
									myDeviceIds.has(p.deviceId) &&
									(p.status === "PENDING" ||
										p.status === "ACCEPTED"),
							)
							const isTarget = myParticipant?.role === "TARGET"
							const sourceName =
								req.participants.find(
									(p) => p.role === "SOURCE",
								)?.deviceName ?? ""
							const targetName =
								req.participants.find(
									(p) => p.role === "TARGET",
								)?.deviceName ?? ""
							const label = isTarget
								? `${translations("requests.from")} ${sourceName} — ${req.direction === "SEND" ? translations("requests.sendingYou") : translations("requests.requestingFromYou")}`
								: `${translations("requests.to")} ${targetName} — ${req.direction === "SEND" ? translations("requests.sendingFiles") : translations("requests.requestingFiles")}`

							const isAccepted =
								myParticipant?.status === "ACCEPTED"

							return (
								<Card
									key={req.id}
									withBorder
									padding="md"
									radius="sm">
									<Group justify="space-between" mb="xs">
										<div>
											<Text fw={500}>{label}</Text>
											<Text c="dimmed" size="xs">
												{isTarget
													? `${translations("requests.to")} ${targetName}`
													: `${translations("requests.from")} ${sourceName}`}
											</Text>
											{req.projectName ? (
												<Text c="dimmed" size="sm">
													{translations(
														"requests.projectLabel",
													)}{" "}
													{req.projectName}
												</Text>
											) : null}
											{req.fragmentNames.length > 0 ? (
												<Text c="dimmed" size="sm">
													{translations(
														"requests.fragmentsLabel",
													)}{" "}
													{req.fragmentNames.join(
														", ",
													)}
												</Text>
											) : null}
											{req.message ? (
												<Text c="dimmed" size="sm">
													{translations(
														"requests.messageLabel",
													)}{" "}
													{req.message}
												</Text>
											) : null}
											<Text c="dimmed" size="xs">
												{translations(
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
												{translations(
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
															localDeviceId ?? "",
															"accept",
														)
													}>
													{translations(
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
															localDeviceId ?? "",
															"reject",
														)
													}>
													{translations(
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
			) : null}

			{/* Sent */}
			{sent.length > 0 ? (
				<Card withBorder padding="lg" radius="md" mb="md">
					<Text fw={500} mb="md" size="lg">
						{translations("requests.sent")}
					</Text>
					<Text c="dimmed" mb="md" size="sm">
						{translations("requests.sentDescription")}
					</Text>
					<Stack gap="md">
						{sent.map((req) => {
							const myParticipant = req.participants.find(
								(p) =>
									myDeviceIds.has(p.deviceId) &&
									p.role === "SOURCE" &&
									(p.status === "PENDING" ||
										p.status === "ACCEPTED"),
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
									<Group justify="space-between" mb="xs">
										<div>
											<Text fw={500}>
												{translations("requests.to")}{" "}
												{targetName}
												{" — "}
												{req.direction === "SEND"
													? translations(
															"requests.sendingFiles",
														)
													: translations(
															"requests.requestingFiles",
														)}
											</Text>
											{req.projectName ? (
												<Text c="dimmed" size="sm">
													{translations(
														"requests.projectLabel",
													)}{" "}
													{req.projectName}
												</Text>
											) : null}
											{req.fragmentNames.length > 0 ? (
												<Text c="dimmed" size="sm">
													{translations(
														"requests.fragmentsLabel",
													)}{" "}
													{req.fragmentNames.join(
														", ",
													)}
												</Text>
											) : null}
											{req.message ? (
												<Text c="dimmed" size="sm">
													{translations(
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
												{translations(
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
														localDeviceId ?? "",
														"accept",
													)
												}>
												{translations(
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
										{translations("requests.cancelRequest")}
									</Button>
								</Card>
							)
						})}
					</Stack>
				</Card>
			) : null}

			{/* History */}
			<Card withBorder padding="lg" radius="md">
				<Text fw={500} mb="md" size="lg">
					{translations("requests.title")}
				</Text>
				{requests.length === 0 ? (
					<Text c="dimmed">{translations("requests.empty")}</Text>
				) : (
					<>
						<Box visibleFrom="sm">
							<Table>
								<Table.Thead>
									<Table.Tr>
										<Table.Th>
											{translations("requests.direction")}
										</Table.Th>
										<Table.Th>
											{translations("requests.source")}
										</Table.Th>
										<Table.Th>
											{translations("requests.target")}
										</Table.Th>
										<Table.Th>
											{translations("requests.project")}
										</Table.Th>
										<Table.Th>
											{translations("requests.status")}
										</Table.Th>
										<Table.Th>
											{translations("requests.created")}
										</Table.Th>
									</Table.Tr>
								</Table.Thead>
								<Table.Tbody>
									{requests.map((req) => {
										const transfer = activeTransfers.get(
											req.id,
										)

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
															? translations(
																	"requests.sending",
																)
															: translations(
																	"requests.receiving",
																)}
													</Badge>
												</Table.Td>
												<Table.Td>
													{req.participants.find(
														(p) =>
															p.role === "SOURCE",
													)?.deviceName ?? ""}
												</Table.Td>
												<Table.Td>
													{req.participants.find(
														(p) =>
															p.role === "TARGET",
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
													<Text c="dimmed" size="sm">
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

						<Box hiddenFrom="sm">
							<Stack gap="sm">
								{requests.map((req) => {
									const transfer = activeTransfers.get(req.id)

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
														req.direction === "SEND"
															? "blue"
															: "violet"
													}
													variant="light">
													{req.direction === "SEND"
														? translations(
																"requests.sending",
															)
														: translations(
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
													(p) => p.role === "SOURCE",
												)?.deviceName ?? ""}
											</Text>
											<Text size="sm">
												<span
													style={{
														color: "var(--text-secondary)",
													}}>
													{translations(
														"requests.to",
													)}
													:{" "}
												</span>
												{req.participants.find(
													(p) => p.role === "TARGET",
												)?.deviceName ?? ""}
											</Text>
											{req.projectName && (
												<Text size="sm">
													<span
														style={{
															color: "var(--text-secondary)",
														}}>
														{translations(
															"requests.projectLabel",
														)}{" "}
													</span>
													{req.projectName}
												</Text>
											)}
											<Text c="dimmed" size="xs" mt="xs">
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
		</>
	)
}
