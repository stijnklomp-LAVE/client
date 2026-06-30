"use client"

import { useState } from "react"
import { AuthCard } from "@/components/ui/auth-card"
import { CtaButton } from "@/components/ui/cta-button"
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
	const translations = useTranslations("auth")
	const deletionDate = new Date(deletionScheduledAt)

	return (
		<AuthCard maxWidth={480}>
			<Title order={2} mb="xs">
				{translations("accountClosing")}
			</Title>
			<Text c="dimmed" size="sm" mb="lg">
				{translations("accountClosingMessage", {
					date: deletionDate.toLocaleDateString(),
				})}
			</Text>

			<Button
				fullWidth
				variant="outline"
				color="green"
				leftSection={<IconRestore size={16} />}
				onClick={onRestore}>
				{translations("restoreAccount")}
			</Button>
		</AuthCard>
	)
}

export const ProfileForm = (): React.JSX.Element | null => {
	const translations = useTranslations("auth")
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
				updateMessage({
					text: translations("restoreSuccess"),
					color: "green",
				})
				await update()
			} else {
				const data = await res.json()

				updateMessage({
					text: data.error ?? translations("restoreError"),
					color: "red",
				})
			}
		} catch {
			updateMessage({ text: translations("restoreError"), color: "red" })
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
					title={translations("restoreAccountTitle")}
					centered>
					<Text size="sm" mb="lg">
						{translations("restoreAccountConfirm")}
					</Text>
					<Button
						fullWidth
						color="green"
						loading={restoreSending}
						onClick={handleRestoreAccount}>
						{translations("restoreAccount")}
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
				text: data.error ?? translations("updateError"),
				color: "red",
			})
			setLoading(false)
			return
		}

		updateMessage({ text: translations("updateSuccess"), color: "green" })
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
				updateMessage({
					text: translations("resetPasswordSent"),
					color: "green",
				})
			} else {
				const data = await res.json()

				updateMessage({
					text: data.error ?? translations("resetError"),
					color: "red",
				})
			}
		} catch {
			updateMessage({ text: translations("resetError"), color: "red" })
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
					text: data.error ?? translations("deleteAccountError"),
					color: "red",
				})
			}
		} catch {
			updateMessage({
				text: translations("deleteAccountError"),
				color: "red",
			})
		} finally {
			setDeleteSending(false)
		}
	}

	return (
		<>
			<AuthCard maxWidth={480}>
				<form onSubmit={handleSubmit}>
					<Title order={2} mb="xs">
						{translations("profile")}
					</Title>
					<Text c="dimmed" size="sm" mb="lg">
						{translations("profileSubtitle")}
					</Text>

					<FormMessage message={message} messageKey={messageKey} />

					<TextInput
						label={translations("name")}
						placeholder={translations("namePlaceholder")}
						value={name}
						onChange={(e) => setName(e.currentTarget.value)}
						mb="md"
					/>

					<TextInput
						label={translations("email")}
						placeholder="you@example.com"
						value={email}
						onChange={(e) => setEmail(e.currentTarget.value)}
						required
						mb="lg"
					/>

					<CtaButton
						type="submit"
						fullWidth
						loading={loading}
						mb="md">
						{translations("saveChanges")}
					</CtaButton>
				</form>

				<Button
					fullWidth
					variant="subtle"
					mb="md"
					onClick={resetHandlers.open}>
					{translations("resetPasswordOnProfile")}
				</Button>

				<Modal
					opened={resetOpened}
					onClose={resetHandlers.close}
					title={translations("resetPasswordTitleProfile")}
					centered>
					<Text size="sm" mb="lg">
						{translations("resetPasswordConfirmProfile")}
					</Text>
					<CtaButton
						fullWidth
						loading={resetSending}
						onClick={handleResetPassword}>
						{translations("sendResetLink")}
					</CtaButton>
				</Modal>

				<Divider my="lg" />

				<Button
					fullWidth
					variant="outline"
					color="red"
					leftSection={<IconLogout size={16} />}
					onClick={() => signOut({ callbackUrl: `/${locale}` })}>
					{translations("signOut")}
				</Button>

				<Divider my="lg" />

				<Button
					fullWidth
					variant="outline"
					color="red"
					leftSection={<IconTrash size={16} />}
					onClick={deleteHandlers.open}>
					{translations("deleteAccount")}
				</Button>

				<Modal
					opened={deleteOpened}
					onClose={deleteHandlers.close}
					title={translations("deleteAccountTitle")}
					centered>
					<Text size="sm" mb="xs">
						{translations("deleteAccountWarning")}
					</Text>
					<Text size="sm" mb="lg">
						{translations("deleteAccountConfirm", {
							email: currentSession.user.email ?? "",
						})}
					</Text>

					<TextInput
						label={translations("deleteAccountHint")}
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
						{translations("deleteAccountPermanently")}
					</Button>
				</Modal>
			</AuthCard>
		</>
	)
}

ProfileForm.displayName = "ProfileForm"
