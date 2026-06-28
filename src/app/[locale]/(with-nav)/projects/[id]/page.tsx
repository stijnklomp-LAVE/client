import { getTranslations } from "next-intl/server"

import { Stack, Text, Title } from "@mantine/core"

import { OpenInEditorButton } from "@/components/projects/open-in-editor-button"

export default async function ProjectSettingsPage({
	params,
}: {
	params: Promise<{ locale: string; id: string }>
}): Promise<React.JSX.Element> {
	const t = await getTranslations("projects")
	const { id } = await params

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				minHeight: "100%",
				background: "var(--bg-primary)",
				color: "var(--text-primary)",
			}}>
			<main
				style={{
					flex: 1,
					padding: "24px",
					maxWidth: 1200,
					margin: "0 auto",
					width: "100%",
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}>
				<Stack align="center" gap="lg">
					<Title order={2}>{t("settings.title")}</Title>
					<Text c="dimmed" ta="center" maw={400}>
						{t("settings.description")}
					</Text>
					<OpenInEditorButton projectId={id} />
				</Stack>
			</main>
		</div>
	)
}

ProjectSettingsPage.displayName = "ProjectSettingsPage"
