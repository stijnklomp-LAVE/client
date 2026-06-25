"use client"

import { useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useDisclosure } from "@mantine/hooks"
import { nprogress } from "@/components/providers/router-progress"
import { signIn, useSession } from "next-auth/react"
import { AuthCard } from "@/components/ui/auth-card"
import {
	Button,
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

export const LoginForm = () => {
	const t = useTranslations("auth")
	const router = useRouter()
	const { update } = useSession()
	const searchParams = useSearchParams()

	// START dev-only auto-login: pre-fills credentials.
	// Safe to remove — without it, users must type their credentials manually.
	const [email, setEmail] = useState(
		process.env.NODE_ENV === "development" ? "stijnklomp1@hotmail.com" : "",
	)
	const [password, setPassword] = useState(
		process.env.NODE_ENV === "development" ? "test1234" : "",
	)
	// END dev-only auto-login
	const [message, setMessage] = useState<Message | null>(null)
	const [messageKey, setMessageKey] = useState(0)
	const [interacted, setInteracted] = useState(false)
	const [loading, setLoading] = useState(false)

	const updateMessage = (msg: Message | null): void => {
		setMessage(msg)
		if (msg) {
			setMessageKey((k) => k + 1)
		}
	}

	const urlMessage: Message | null = useMemo(() => {
		if (searchParams.get("verified") === "true") {
			return { text: t("emailVerified"), color: "green" }
		}

		if (searchParams.get("reset") === "true") {
			return { text: t("resetSuccess"), color: "green" }
		}

		const errorParam = searchParams.get("error")

		if (errorParam === "expired-token") {
			return { text: t("verificationExpired"), color: "red" }
		}

		if (errorParam === "invalid-token") {
			return { text: t("verificationInvalid"), color: "red" }
		}

		if (errorParam === "missing-token") {
			return { text: t("verificationMissing"), color: "red" }
		}

		if (errorParam === "verification-failed") {
			return { text: t("verificationFailed"), color: "red" }
		}

		return null
	}, [searchParams, t])

	const displayMessage = message ?? (interacted ? null : urlMessage)

	const isUnverified =
		displayMessage?.text === t("emailNotVerified") ||
		displayMessage?.text === t("verificationExpired") ||
		displayMessage?.text === t("verificationInvalid") ||
		displayMessage?.text === t("verificationFailed")
	const [resendOpened, resendHandlers] = useDisclosure(false)
	const [resending, setResending] = useState(false)

	const handleResend = async (): Promise<void> => {
		setInteracted(true)
		setResending(true)

		try {
			const res = await fetch("/api/resend-verification", {
				method: "POST",
				headers: { ["Content-Type"]: "application/json" },
				body: JSON.stringify({ email }),
			})

			if (res.ok) {
				resendHandlers.close()
				updateMessage({ text: t("verificationResent"), color: "green" })
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

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setInteracted(true)
		setLoading(true)

		try {
			const result = await signIn("credentials", {
				email,
				password,
				redirect: false,
			})

			if (result?.error) {
				const check = await fetch(
					`/api/check-verification?email=${encodeURIComponent(email)}`,
				)
				const { exists, verified } = await check.json()

				if (exists && !verified) {
					updateMessage({
						text: t("emailNotVerified"),
						color: "red",
					})
				} else {
					updateMessage({ text: t("loginError"), color: "red" })
				}

				setLoading(false)

				return
			}

			await update()
			nprogress.start()
			router.replace("/")
		} catch {
			updateMessage({ text: t("loginError"), color: "red" })
			setLoading(false)
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
			<AuthCard>
				<form
					onSubmit={handleSubmit}
					onKeyDown={(e) => {
						if (e.key === "Enter" && !e.repeat) {
							e.currentTarget.requestSubmit()
						}
					}}>
					<Title order={2} ta="center" mb="xs">
						{t("login")}
					</Title>
					<Text c="dimmed" size="sm" ta="center" mb="lg">
						{t("loginSubtitle")}
					</Text>

					<FormMessage
						message={displayMessage}
						messageKey={messageKey}
					/>

					{isUnverified && (
						<Text ta="center" mb="md">
							<Button
								variant="subtle"
								size="xs"
								onClick={resendHandlers.open}>
								{t("resendVerification")}
							</Button>
						</Text>
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
					/>

					<Text ta="right" mb="lg">
						<Link
							href="/forgot-password"
							style={{
								color: "var(--text-secondary)",
								fontSize: "14px",
								fontWeight: 500,
							}}>
							{t("forgotPassword")}
						</Link>
					</Text>

					<Button type="submit" fullWidth loading={loading}>
						{t("signIn")}
					</Button>

					<Text c="dimmed" size="sm" ta="center" mt="lg">
						{t("noAccount")}{" "}
						<Link
							href="/register"
							style={{
								color: "var(--text-primary)",
								fontWeight: 600,
							}}>
							{t("createOne")}
						</Link>
					</Text>
				</form>
			</AuthCard>
		</ClientOnly>
	)
}
