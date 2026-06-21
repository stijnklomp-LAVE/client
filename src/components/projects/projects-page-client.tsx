"use client"

import { useCallback, useEffect, useState } from "react"
import {
	ActionIcon,
	Button,
	Card,
	Group,
	Modal,
	Skeleton,
	SimpleGrid,
	Text,
	TextInput,
	Textarea,
	Title,
} from "@mantine/core"
import { notifications } from "@mantine/notifications"
import {
	IconCheck,
	IconFolder,
	IconPlus,
	IconTrash,
	IconX,
} from "@tabler/icons-react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"

type Project = {
	createdAt: string
	description: string | null
	fragmentCount: number
	id: string
	name: string
}

export function ProjectsPageClient(): React.JSX.Element {
	const t = useTranslations("projects")
	const router = useRouter()
	const [projects, setProjects] = useState<Project[]>([])
	const [loading, setLoading] = useState(true)
	const [newName, setNewName] = useState("")
	const [newDescription, setNewDescription] = useState("")
	const [creating, setCreating] = useState(false)
	const [deleteTarget, setDeleteTarget] = useState<Project | null>(null)
	const [confirmName, setConfirmName] = useState("")
	const [deleting, setDeleting] = useState(false)
	const [editingId, setEditingId] = useState<string | null>(null)
	const [editValue, setEditValue] = useState("")
	const [hoveredId, setHoveredId] = useState<string | null>(null)
	const [cardHoveredId, setCardHoveredId] = useState<string | null>(null)

	const fetchProjects = useCallback(async () => {
		try {
			const res = await fetch("/api/projects")

			if (res.ok) {
				const data = (await res.json()) as { projects: Project[] }
				setProjects(data.projects)
			}
		} catch {
			notifications.show({
				color: "red",
				message: t("notifications.failedLoad"),
				title: t("notifications.error"),
			})
		}
	}, [t])

	useEffect(() => {
		async function load() {
			setLoading(true)
			await fetchProjects()
			setLoading(false)
		}

		void load()
	}, [fetchProjects])

	function nextProjectName(): string {
		let max = 0

		for (const p of projects) {
			const match = p.name.match(/^Project (\d+)$/)

			if (match) {
				const num = Number.parseInt(match[1]!, 10)

				if (num > max) max = num
			}
		}

		return `Project ${max + 1}`
	}

	async function handleCreate() {
		const name = newName.trim() || nextProjectName()

		setCreating(true)

		try {
			const res = await fetch("/api/projects", {
				method: "POST",
				// eslint-disable-next-line @typescript-eslint/naming-convention
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					name,
					description: newDescription.trim() || undefined,
				}),
			})

			if (res.ok) {
				notifications.show({
					color: "green",
					message: t("notifications.created"),
					title: t("notifications.success"),
				})
				setNewName("")
				setNewDescription("")
				await fetchProjects()
			} else {
				const data = await res.json()
				notifications.show({
					color: "red",
					message: data.error ?? t("notifications.failedCreate"),
					title: t("notifications.error"),
				})
			}
		} catch {
			notifications.show({
				color: "red",
				message: t("notifications.failedCreate"),
				title: t("notifications.error"),
			})
		} finally {
			setCreating(false)
		}
	}

	async function handleRename(projectId: string) {
		const trimmed = editValue.trim()

		if (!trimmed) {
			setEditingId(null)

			return
		}

		try {
			const res = await fetch(`/api/projects/${projectId}`, {
				method: "PUT",
				// eslint-disable-next-line @typescript-eslint/naming-convention
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name: trimmed }),
			})

			if (res.ok) {
				setEditingId(null)
				await fetchProjects()
			} else {
				const data = await res.json()
				notifications.show({
					color: "red",
					message: data.error ?? t("notifications.failedRename"),
					title: t("notifications.error"),
				})
			}
		} catch {
			notifications.show({
				color: "red",
				message: t("notifications.failedRename"),
				title: t("notifications.error"),
			})
		}
	}

	async function handleDeleteConfirm() {
		if (!deleteTarget) return

		setDeleting(true)

		try {
			const res = await fetch(`/api/projects/${deleteTarget.id}`, {
				method: "DELETE",
			})

			if (res.ok) {
				notifications.show({
					color: "green",
					message: t("notifications.deleted", {
						name: deleteTarget.name,
					}),
					title: t("notifications.success"),
				})
				setDeleteTarget(null)
				setConfirmName("")
				await fetchProjects()
			} else {
				const data = await res.json()
				notifications.show({
					color: "red",
					message: data.error ?? t("notifications.failedDelete"),
					title: t("notifications.error"),
				})
			}
		} catch {
			notifications.show({
				color: "red",
				message: t("notifications.failedDelete"),
				title: t("notifications.error"),
			})
		} finally {
			setDeleting(false)
		}
	}

	function formatDate(iso: string): string {
		const date = new Date(iso)
		const now = new Date()
		const diffMs = now.getTime() - date.getTime()
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

		if (diffDays === 0) return t("time.today")
		if (diffDays === 1) return t("time.yesterday")
		if (diffDays < 7) return t("time.daysAgo", { days: diffDays })
		return date.toLocaleDateString()
	}

	if (loading) {
		return (
			<>
				<Title order={2} mb="lg">
					{t("title")}
				</Title>
				<SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
					<Skeleton height={180} radius="md" />
					<Skeleton height={180} radius="md" />
					<Skeleton height={180} radius="md" />
				</SimpleGrid>
			</>
		)
	}

	return (
		<>
			<Title order={2} mb="lg">
				{t("title")}
			</Title>

			<SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="lg">
				<Card
					withBorder
					shadow="sm"
					padding="lg"
					radius="md"
					style={{
						display: "flex",
						flexDirection: "column",
						borderStyle: "dashed",
					}}>
					<Text fw={500} ta="center" mb="md">
						{t("newProject")}
					</Text>

					<TextInput
						label={t("nameLabel")}
						placeholder={t("namePlaceholder")}
						value={newName}
						onChange={(e) => setNewName(e.currentTarget.value)}
						mb="sm"
					/>

					<Textarea
						label={t("descriptionLabel")}
						placeholder={t("descriptionPlaceholder")}
						value={newDescription}
						onChange={(e) =>
							setNewDescription(e.currentTarget.value)
						}
						mb="md"
						autosize
						minRows={2}
						maxRows={4}
					/>

					<Button
						fullWidth
						leftSection={<IconPlus size={16} />}
						loading={creating}
						onClick={handleCreate}>
						{t("createButton")}
					</Button>
				</Card>

				{projects.length === 0 ? (
					<Card
						withBorder
						padding="lg"
						radius="md"
						style={{
							display: "flex",
							flexDirection: "column",
							opacity: 0.55,
							borderStyle: "dashed",
							cursor: "default",
							pointerEvents: "none",
						}}>
						<Group justify="space-between" mb="xs">
							<Group gap="xs">
								<IconFolder size={20} />
								<Text fw={500}>{t("placeholderName")}</Text>
							</Group>
						</Group>

						<Text size="xs" c="dimmed" mt="auto">
							{t("placeholderFragments")} &middot;{" "}
							{t("placeholderDate")}
						</Text>
					</Card>
				) : (
					projects.map((project) => (
						<Card
							key={project.id}
							withBorder
							shadow="sm"
							padding="lg"
							radius="md"
							style={{
								display: "flex",
								flexDirection: "column",
								transform:
									cardHoveredId === project.id
										? "scale(1.02)"
										: "scale(1)",
								transition: "transform 0.2s ease",
							}}
							onMouseEnter={() => setCardHoveredId(project.id)}
							onMouseLeave={() => setCardHoveredId(null)}>
							<Group justify="space-between" mb="xs">
								<Group
									gap="xs"
									style={{
										flex: 1,
										minWidth: 0,
										cursor:
											editingId !== project.id
												? "pointer"
												: "text",
										borderRadius: "var(--border-radius-sm)",
										background:
											hoveredId === project.id &&
											editingId !== project.id
												? "var(--bg-tertiary)"
												: "transparent",
										transition: "background 0.15s ease",
									}}
									onMouseEnter={() =>
										setHoveredId(project.id)
									}
									onMouseLeave={() => setHoveredId(null)}
									onClick={(e) => {
										if (editingId !== project.id) {
											e.stopPropagation()
											setEditingId(project.id)
											setEditValue(project.name)
										}
									}}>
									<IconFolder size={20} />
									{editingId === project.id ? (
										<input
											type="text"
											value={editValue}
											onChange={(e) =>
												setEditValue(
													e.currentTarget.value,
												)
											}
											onClick={(e) => e.stopPropagation()}
											onKeyDown={(e) => {
												if (e.key === "Enter") {
													e.preventDefault()
													void handleRename(
														project.id,
													)
												}

												if (e.key === "Escape") {
													setEditingId(null)
												}
											}}
											autoFocus
											style={{
												flex: 1,
												minWidth: 80,
												border: "none",
												outline: "none",
												background: "transparent",
												padding: 0,
												margin: 0,
												fontFamily: "inherit",
												fontSize: "inherit",
												fontWeight: 500,
												color: "inherit",
												lineHeight: "inherit",
											}}
										/>
									) : (
										<Text
											fw={500}
											lineClamp={1}
											style={{ flex: 1 }}>
											{project.name}
										</Text>
									)}
								</Group>

								{editingId === project.id ? (
									<Group gap={2} wrap="nowrap">
										<ActionIcon
											variant="subtle"
											color="green"
											size="sm"
											onClick={(e) => {
												e.stopPropagation()
												void handleRename(project.id)
											}}>
											<IconCheck size={16} />
										</ActionIcon>
										<ActionIcon
											variant="subtle"
											color="gray"
											size="sm"
											onClick={(e) => {
												e.stopPropagation()
												setEditingId(null)
											}}>
											<IconX size={16} />
										</ActionIcon>
									</Group>
								) : (
									<ActionIcon
										variant="subtle"
										color="red"
										size="sm"
										onClick={(e) => {
											e.stopPropagation()
											setDeleteTarget(project)
											setConfirmName("")
										}}
										aria-label={t("deleteProject")}>
										<IconTrash size={16} />
									</ActionIcon>
								)}
							</Group>

							<div
								onClick={() =>
									router.push(`/projects/${project.id}`)
								}
								style={{
									cursor: "pointer",
									flex: 1,
									display: "flex",
									flexDirection: "column",
								}}>
								{project.description && (
									<Text
										size="sm"
										c="dimmed"
										lineClamp={2}
										mb="sm">
										{project.description}
									</Text>
								)}

								<Text size="xs" c="dimmed" mt="auto">
									{project.fragmentCount}{" "}
									{project.fragmentCount === 1
										? t("fragment")
										: t("fragments")}{" "}
									&middot; {formatDate(project.createdAt)}
								</Text>
							</div>
						</Card>
					))
				)}
			</SimpleGrid>

			<Modal
				opened={deleteTarget !== null}
				onClose={() => {
					setDeleteTarget(null)
					setConfirmName("")
				}}
				title={t("deleteModal.title")}
				centered>
				<Text size="sm" mb="md">
					{t("deleteModal.confirm", {
						name: deleteTarget?.name ?? "",
					})}
				</Text>

				<TextInput
					placeholder={deleteTarget?.name ?? ""}
					value={confirmName}
					onChange={(e) => setConfirmName(e.currentTarget.value)}
					mb="lg"
				/>

				<Group justify="flex-end" gap="sm">
					<Button
						variant="default"
						onClick={() => {
							setDeleteTarget(null)
							setConfirmName("")
						}}>
						{t("deleteModal.cancel")}
					</Button>
					<Button
						color="red"
						loading={deleting}
						disabled={confirmName !== deleteTarget?.name}
						onClick={handleDeleteConfirm}>
						{t("deleteModal.delete")}
					</Button>
				</Group>
			</Modal>
		</>
	)
}
