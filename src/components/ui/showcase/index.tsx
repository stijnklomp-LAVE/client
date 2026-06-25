import { Button, Group, Stack, Text, Title, Card } from "@mantine/core"
import { notifications } from "@mantine/notifications"
import { IconBell, IconBrandTabler, IconPlayerPlay } from "@tabler/icons-react"
import { useTranslations } from "next-intl"

export const Showcase = (): React.JSX.Element => {
	const t = useTranslations("showcase")

	return (
		<Stack gap="xl" style={{ maxWidth: 800, margin: "0 auto" }}>
			<Section title={t("notifications.title")}>
				<Group gap="sm">
					<Button
						variant="filled"
						onClick={() =>
							notifications.show({
								title: "Success",
								message: "This is a success notification.",
								color: "teal",
							})
						}>
						{t("notifications.success")}
					</Button>
					<Button
						variant="filled"
						color="red"
						onClick={() =>
							notifications.show({
								title: "Error",
								message: "This is an error notification.",
								color: "red",
							})
						}>
						{t("notifications.error")}
					</Button>
					<Button
						variant="filled"
						color="grape"
						onClick={() =>
							notifications.show({
								title: "With icon",
								message: "Notifications can have custom icons.",
								icon: <IconBell size={18} />,
								color: "grape",
							})
						}>
						{t("notifications.withIcon")}
					</Button>
					<Button
						variant="outline"
						onClick={() => {
							const id = notifications.show({
								loading: true,
								title: "Loading",
								message: "Will auto-update in 2s...",
								autoClose: false,
								withCloseButton: false,
							})
							setTimeout(() => {
								notifications.update({
									id,
									loading: false,
									title: "Done",
									message: "Update complete!",
									color: "teal",
									autoClose: 2000,
								})
							}, 2000)
						}}>
						{t("notifications.asyncProgress")}
					</Button>
				</Group>
			</Section>

			<Section title={t("icons.title")}>
				<Group gap="md">
					<IconBrandTabler size={32} />
					<IconBell size={32} />
					<IconPlayerPlay size={32} />
				</Group>
				<Text c="dimmed" size="sm">
					{t("icons.description")}
				</Text>
			</Section>
		</Stack>
	)
}

const Section = ({
	title,
	children,
}: {
	title: string
	children: React.ReactNode
}): React.JSX.Element => {
	return (
		<Card
			shadow="sm"
			padding="lg"
			radius="md"
			style={{
				background: "var(--bg-primary)",
				border: "1px solid var(--border-primary)",
			}}>
			<Stack gap="md">
				<Title order={2} style={{ color: "var(--text-primary)" }}>
					{title}
				</Title>
				{children}
			</Stack>
		</Card>
	)
}

Showcase.displayName = "Showcase"
