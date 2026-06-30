"use client"

import { useCallback, useState } from "react"
import { Stack, Text, Title } from "@mantine/core"
import { useParams } from "next/navigation"
import { useTranslations } from "next-intl"

import { OpenInEditorButton } from "@/components/projects/open-in-editor-button"
import { pickRawFramesDirectory } from "@/lib/editor/raw-frames-directory"

export default function ProjectSettingsPage() {
	const translations = useTranslations("projects")
	const { id } = useParams<{ id: string }>()
	const [dirName, setDirName] = useState<string | null>(null)

	const handleChooseDirectory = useCallback(async () => {
		const handle = await pickRawFramesDirectory(id)
		if (handle) {
			setDirName(handle.name)
		}
	}, [id])

	const handleRemoveDirectory = useCallback(() => {
		setDirName(null)
	}, [])

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
					maxWidth: 800,
					margin: "0 auto",
					width: "100%",
				}}>
				<Stack gap="lg">
					<Title order={2}>{translations("settings.title")}</Title>
					<Text c="dimmed" ta="center" maw={400}>
						{translations("settings.description")}
					</Text>

					<div
						style={{
							border: "1px solid var(--border-primary)",
							borderRadius: "var(--border-radius)",
							padding: "20px",
						}}>
						<Text fw={600} size="sm" mb="xs">
							Raw Frames Directory
						</Text>
						<Text size="xs" c="dimmed" mb="md">
							Choose where raw video frames will be saved during
							recording.
						</Text>
						{dirName ? (
							<div
								style={{
									display: "flex",
									alignItems: "center",
									gap: "8px",
									padding: "8px 12px",
									border: "1px solid var(--border-primary)",
									borderRadius: "var(--border-radius)",
									background: "var(--bg-secondary)",
								}}>
								<span style={{ flex: 1, fontSize: "13px" }}>
									{dirName}
								</span>
								<button
									onClick={handleRemoveDirectory}
									type="button"
									style={{
										padding: "4px 8px",
										fontSize: "11px",
										border: "none",
										borderRadius: "4px",
										background: "rgba(224, 49, 49, 0.1)",
										color: "#e03131",
										cursor: "pointer",
									}}>
									Remove
								</button>
							</div>
						) : (
							<button
								onClick={handleChooseDirectory}
								type="button"
								style={{
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									width: "100%",
									padding: "10px 16px",
									fontSize: "13px",
									fontWeight: 500,
									border: "1px dashed var(--border-primary)",
									borderRadius: "var(--border-radius)",
									background: "transparent",
									color: "var(--text-secondary)",
									cursor: "pointer",
								}}>
								Choose Directory
							</button>
						)}
					</div>

					<OpenInEditorButton projectId={id} />
				</Stack>
			</main>
		</div>
	)
}
