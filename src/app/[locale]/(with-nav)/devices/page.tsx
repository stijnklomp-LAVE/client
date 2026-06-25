"use client"

import { Badge, Card, Group, Skeleton, Stack, Table, Text } from "@mantine/core"
import { IconDeviceDesktop } from "@tabler/icons-react"
import { useTranslations } from "next-intl"

import { useDevicesContext } from "@/lib/devices/devices-context"

const statusColor = (status: "online" | "stale" | "offline"): string => {
	switch (status) {
		case "online":
			return "green"
		case "stale":
			return "yellow"
		case "offline":
			return "gray"
	}
}

export default function DevicesPage(): React.JSX.Element {
	const t = useTranslations("devices")
	const { devices, statuses, loading, localDeviceId } = useDevicesContext()

	return (
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
							<Table.Th>{t("table.lastSeen")}</Table.Th>
						</Table.Tr>
					</Table.Thead>
					<Table.Tbody>
						{devices.map((device) => {
							const deviceStatus =
								statuses[device.deviceId]?.state ?? "offline"
							const isCurrent = device.deviceId === localDeviceId

							return (
								<Table.Tr key={device.deviceId}>
									<Table.Td>
										<Group gap="sm">
											<IconDeviceDesktop size={18} />
											<Text>
												{device.deviceName}
												{isCurrent ? " (this)" : ""}
											</Text>
										</Group>
									</Table.Td>
									<Table.Td>
										<Badge
											color={statusColor(deviceStatus)}
											variant="light">
											{t(`status.${deviceStatus}`)}
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
	)
}
