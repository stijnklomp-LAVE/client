"use client"

import { useState } from "react"
import { AuthCard } from "@/components/ui/auth-card"
import { Button, Divider, Modal, Text, TextInput, Title } from "@mantine/core"
import { useDisclosure } from "@mantine/hooks"
import { IconLogout, IconTrash, IconRestore } from "@tabler/icons-react"
import { signOut, useSession } from "next-auth/react"
import { useLocale, useTranslations } from "next-intl"
import { FormMessage, type Message } from "@/components/ui/form-message"

const DeletionNotice = ({
	deletionScheduledAt,
	onRestore,
}: {
	deletionScheduledAt: string
	onRestore: () => void
}): React.JSX.Element => {
	const t = useTranslations("auth")
	const deletionDate = new Date(deletionScheduledAt)

	return (
		<AuthCard maxWidth={480}>
			<Title order={2} mb="xs">
				{t("accountClosing")}
			</Title>
			<Text c="dimmed" size="sm" mb="lg">
				{t("accountClosingMessage", {
					date: deletionDate.toLocaleDateString(),
				})}
			</Text>

			<Button
				fullWidth
				variant="outline"
				color="green"
				leftSection={<IconRestore size={16} />}
				onClick={onRestore}>
				{t("restoreAccount")}
			</Button>
		</AuthCard>
	)
}

export const ProfileForm = (): React.JSX.Element | null => {
	const t = useTranslations("auth")
	const locale = useLocale()
	const { data: session, update } = useSession()

	const [name, setName] = useState(session?.user?.name ?? "")
	const [email, setEmail] = useState(session?.user?.email ?? "")
	const [message, setMessage] = useState<Message | null>(null)
	const [messageKey, setMessageKey] = useState(0)
	const [loading, setLoading] = useState(false)
	const [resetOpened, resetHandlers] = useDisclosure(false)
	const [resetSending, setResetSending] = useState(false)

	const [deleteOpened, deleteHandlers] = useDisclosure(false)
	const [deleteEmail, setDeleteEmail] = useState("")
	const [deleteSending, setDeleteSending] = useState(false)

	const [restoreOpened, restoreHandlers] = useDisclosure(false)
	const [restoreSending, setRestoreSending] = useState(false)

	const updateMessage = (msg: Message | null): void => {
		setMessage(msg)
		if (msg) {
			setMessageKey((k) => k + 1)
		}
	}

	const handleRestoreAccount = async (): Promise<void> => {
		setRestoreSending(true)

		try {
			const res = await fetch("/api/profile/restore-account", {
				method: "POST",
				headers: { ["Content-Type"]: "application/json" },
			})

			if (res.ok) {
				restoreHandlers.close()
				updateMessage({ text: t("restoreSuccess"), color: "green" })
				await update()
			} else {
				const data = await res.json()

				updateMessage({
					text: data.error ?? t("restoreError"),
					color: "red",
				})
			}
		} catch {
			updateMessage({ text: t("restoreError"), color: "red" })
		} finally {
			setRestoreSending(false)
		}
	}

	if (!session?.user) {
		return null
	}

	if (session.user.markedForDeletionAt) {
		return (
			<>
				<DeletionNotice
					deletionScheduledAt={
						(session.user as { deletionScheduledAt?: string })
							.deletionScheduledAt ??
						session.user.markedForDeletionAt
					}
					onRestore={restoreHandlers.open}
				/>
				<Modal
					opened={restoreOpened}
					onClose={restoreHandlers.close}
					title={t("restoreAccountTitle")}
					centered>
					<Text size="sm" mb="lg">
						{t("restoreAccountConfirm")}
					</Text>
					<Button
						fullWidth
						color="green"
						loading={restoreSending}
						onClick={handleRestoreAccount}>
						{t("restoreAccount")}
					</Button>
				</Modal>
			</>
		)
	}

	const currentSession = session

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setLoading(true)

		const res = await fetch("/api/profile", {
			method: "PUT",
			headers: { ["Content-Type"]: "application/json" },
			body: JSON.stringify({ name, email }),
		})

		const data = await res.json()

		if (!res.ok) {
			updateMessage({
				text: data.error ?? t("updateError"),
				color: "red",
			})
			setLoading(false)
			return
		}

		updateMessage({ text: t("updateSuccess"), color: "green" })
		setLoading(false)
		await update()
	}

	const handleResetPassword = async (): Promise<void> => {
		setResetSending(true)

		try {
			const res = await fetch("/api/forgot-password", {
				method: "POST",
				headers: { ["Content-Type"]: "application/json" },
				body: JSON.stringify({ email: currentSession.user.email }),
			})

			if (res.ok) {
				resetHandlers.close()
				updateMessage({ text: t("resetPasswordSent"), color: "green" })
			} else {
				const data = await res.json()

				updateMessage({
					text: data.error ?? t("resetError"),
					color: "red",
				})
			}
		} catch {
			updateMessage({ text: t("resetError"), color: "red" })
		} finally {
			setResetSending(false)
		}
	}

	const handleDeleteAccount = async (): Promise<void> => {
		setDeleteSending(true)

		try {
			const res = await fetch("/api/profile/close-account", {
				method: "POST",
				headers: { ["Content-Type"]: "application/json" },
				body: JSON.stringify({ email: deleteEmail }),
			})

			if (res.ok) {
				deleteHandlers.close()
				await signOut({ callbackUrl: `/${locale}?accountClosed=true` })
			} else {
				const data = await res.json()

				updateMessage({
					text: data.error ?? t("deleteAccountError"),
					color: "red",
				})
			}
		} catch {
			updateMessage({ text: t("deleteAccountError"), color: "red" })
		} finally {
			setDeleteSending(false)
		}
	}

	return (
		<>
			<AuthCard maxWidth={480}>
				<form onSubmit={handleSubmit}>
					<Title order={2} mb="xs">
						{t("profile")}
					</Title>
					<Text c="dimmed" size="sm" mb="lg">
						{t("profileSubtitle")}
					</Text>

					<FormMessage message={message} messageKey={messageKey} />

					<TextInput
						label={t("name")}
						placeholder={t("namePlaceholder")}
						value={name}
						onChange={(e) => setName(e.currentTarget.value)}
						mb="md"
					/>

					<TextInput
						label={t("email")}
						placeholder="you@example.com"
						value={email}
						onChange={(e) => setEmail(e.currentTarget.value)}
						required
						mb="lg"
					/>

					<Button type="submit" fullWidth loading={loading} mb="md">
						{t("saveChanges")}
					</Button>
				</form>

				<Button
					fullWidth
					variant="subtle"
					mb="md"
					onClick={resetHandlers.open}>
					{t("resetPasswordOnProfile")}
				</Button>

				<Modal
					opened={resetOpened}
					onClose={resetHandlers.close}
					title={t("resetPasswordTitleProfile")}
					centered>
					<Text size="sm" mb="lg">
						{t("resetPasswordConfirmProfile")}
					</Text>
					<Button
						fullWidth
						loading={resetSending}
						onClick={handleResetPassword}>
						{t("sendResetLink")}
					</Button>
				</Modal>

				<Divider my="lg" />

				<Button
					fullWidth
					variant="outline"
					color="red"
					leftSection={<IconLogout size={16} />}
					onClick={() => signOut({ callbackUrl: `/${locale}` })}>
					{t("signOut")}
				</Button>

				<Divider my="lg" />

				<Button
					fullWidth
					variant="outline"
					color="red"
					leftSection={<IconTrash size={16} />}
					onClick={deleteHandlers.open}>
					{t("deleteAccount")}
				</Button>

				<Modal
					opened={deleteOpened}
					onClose={deleteHandlers.close}
					title={t("deleteAccountTitle")}
					centered>
					<Text size="sm" mb="xs">
						{t("deleteAccountWarning")}
					</Text>
					<Text size="sm" mb="lg">
						{t("deleteAccountConfirm", {
							email: currentSession.user.email ?? "",
						})}
					</Text>

					<TextInput
						label={t("deleteAccountHint")}
						placeholder={currentSession.user.email ?? ""}
						value={deleteEmail}
						onChange={(e) => setDeleteEmail(e.currentTarget.value)}
						mb="md"
						required
					/>

					<Button
						fullWidth
						color="red"
						loading={deleteSending}
						disabled={deleteEmail !== currentSession.user.email}
						onClick={handleDeleteAccount}>
						{t("deleteAccountPermanently")}
					</Button>
				</Modal>
			</AuthCard>
		</>
	)
}

ProfileForm.displayName = "ProfileForm"
