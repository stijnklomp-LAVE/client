"use client"

import { useState } from "react"
import { useDisclosure } from "@mantine/hooks"
import {
	Button,
	Card,
	Modal,
	PasswordInput,
	Text,
	TextInput,
	Title,
} from "@mantine/core"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { FormMessage, type Message } from "@/components/ui/form-message"
import { ClientOnly } from "@/components/ui/client-only"

export function RegisterForm() {
	const t = useTranslations("auth")
	const [name, setName] = useState("")
	const [email, setEmail] = useState("")
	const [password, setPassword] = useState("")
	const [confirmPassword, setConfirmPassword] = useState("")
	const [message, setMessage] = useState<Message | null>(null)
	const [messageKey, setMessageKey] = useState(0)
	const [loading, setLoading] = useState(false)
	const [verifyUrl, setVerifyUrl] = useState<string | null>(null)
	const [resendOpened, resendHandlers] = useDisclosure(false)
	const [resending, setResending] = useState(false)

	function updateMessage(msg: Message | null): void {
		setMessage(msg)
		if (msg) {
			setMessageKey((k) => k + 1)
		}
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()

		if (password !== confirmPassword) {
			updateMessage({ text: t("passwordMismatch"), color: "red" })
			return
		}

		if (password.length < 8) {
			updateMessage({ text: t("passwordTooShort"), color: "red" })
			return
		}

		setLoading(true)

		const res = await fetch("/api/register", {
			method: "POST",
			headers: { ["Content-Type"]: "application/json" },
			body: JSON.stringify({ name, email, password }),
		})

		const data = await res.json()

		if (!res.ok) {
			updateMessage({
				text: data.error ?? t("registerError"),
				color: "red",
			})
			setLoading(false)
			return
		}

		setVerifyUrl(data.verifyUrl)
	}

	async function handleResend(): Promise<void> {
		setResending(true)

		try {
			const res = await fetch("/api/resend-verification", {
				method: "POST",
				headers: { ["Content-Type"]: "application/json" },
				body: JSON.stringify({ email }),
			})

			if (res.ok) {
				resendHandlers.close()
				setVerifyUrl(null)
			} else {
				const data = await res.json()

				updateMessage({
					text: data.error ?? t("resendError"),
					color: "red",
				})
			}
		} catch {
			updateMessage({ text: t("resendError"), color: "red" })
		} finally {
			setResending(false)
		}
	}

	return (
		<ClientOnly
			placeholder={
				<div
					style={{
						width: 420,
						maxWidth: "100%",
						height: 400,
					}}
				/>
			}>
			<Card
				withBorder
				shadow="sm"
				padding="xl"
				radius="md"
				maw={420}
				w="100%">
				{verifyUrl ? (
					<>
						<Title order={2} ta="center" mb="xs">
							{t("checkEmail")}
						</Title>
						<Text c="dimmed" size="sm" ta="center" mb="lg">
							{t("verificationSent")}
						</Text>

						{process.env.NODE_ENV === "development" && (
							<Text size="sm" ta="center" mb="lg">
								<Link
									href={verifyUrl}
									style={{ color: "var(--accent)" }}>
									{verifyUrl}
								</Link>
							</Text>
						)}

						<Button
							variant="subtle"
							size="xs"
							fullWidth
							mb="sm"
							onClick={resendHandlers.open}>
							{t("resendVerification")}
						</Button>

						<Button
							component="a"
							href="/login"
							fullWidth
							variant="outline">
							{t("goToLogin")}
						</Button>
					</>
				) : (
					<form
						onSubmit={handleSubmit}
						onKeyDown={(e) => {
							if (e.key === "Enter" && !e.repeat) {
								e.currentTarget.requestSubmit()
							}
						}}>
						<Title order={2} ta="center" mb="xs">
							{t("register")}
						</Title>
						<Text c="dimmed" size="sm" ta="center" mb="lg">
							{t("registerSubtitle")}
						</Text>

						<FormMessage
							message={message}
							messageKey={messageKey}
						/>

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
							mb="md"
						/>

						<PasswordInput
							label={t("password")}
							placeholder={t("passwordPlaceholder")}
							value={password}
							onChange={(e) => setPassword(e.currentTarget.value)}
							required
							mb="md"
						/>

						<PasswordInput
							label={t("confirmPassword")}
							placeholder={t("confirmPasswordPlaceholder")}
							value={confirmPassword}
							onChange={(e) =>
								setConfirmPassword(e.currentTarget.value)
							}
							required
							mb="lg"
						/>

						<Button type="submit" fullWidth loading={loading}>
							{t("createAccount")}
						</Button>

						<Text c="dimmed" size="sm" ta="center" mt="lg">
							{t("hasAccount")}{" "}
							<Link
								href="/login"
								style={{
									color: "var(--text-primary)",
									fontWeight: 600,
								}}>
								{t("signIn")}
							</Link>
						</Text>
					</form>
				)}

				<Modal
					opened={resendOpened}
					onClose={resendHandlers.close}
					title={t("resendVerificationTitle")}
					centered>
					<Text size="sm" mb="lg">
						{t("resendVerificationConfirm")}
					</Text>
					<Button
						fullWidth
						loading={resending}
						onClick={handleResend}>
						{t("resendVerificationButton")}
					</Button>
				</Modal>
			</Card>
		</ClientOnly>
	)
}
