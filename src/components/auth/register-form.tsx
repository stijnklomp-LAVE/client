"use client"

import { useState } from "react"
import { useDisclosure } from "@mantine/hooks"
import { AuthCard } from "@/components/ui/auth-card"
import { CtaButton } from "@/components/ui/cta-button"
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

export const RegisterForm = () => {
	const translations = useTranslations("auth")
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

	const updateMessage = (msg: Message | null): void => {
		setMessage(msg)
		if (msg) {
			setMessageKey((k) => k + 1)
		}
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()

		if (password !== confirmPassword) {
			updateMessage({
				text: translations("passwordMismatch"),
				color: "red",
			})
			return
		}

		if (password.length < 8) {
			updateMessage({
				text: translations("passwordTooShort"),
				color: "red",
			})
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
				text: data.error ?? translations("registerError"),
				color: "red",
			})
			setLoading(false)
			return
		}

		setVerifyUrl(data.verifyUrl)
	}

	const handleResend = async (): Promise<void> => {
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
					text: data.error ?? translations("resendError"),
					color: "red",
				})
			}
		} catch {
			updateMessage({ text: translations("resendError"), color: "red" })
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
			<AuthCard>
				{verifyUrl ? (
					<>
						<Title order={2} ta="center" mb="xs">
							{translations("checkEmail")}
						</Title>
						<Text c="dimmed" size="sm" ta="center" mb="lg">
							{translations("verificationSent")}
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
							{translations("resendVerification")}
						</Button>

						<Button
							component="a"
							href="/login"
							fullWidth
							variant="outline">
							{translations("goToLogin")}
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
							{translations("register")}
						</Title>
						<Text c="dimmed" size="sm" ta="center" mb="lg">
							{translations("registerSubtitle")}
						</Text>

						<FormMessage
							message={message}
							messageKey={messageKey}
						/>

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
							mb="md"
						/>

						<PasswordInput
							label={translations("password")}
							placeholder={translations("passwordPlaceholder")}
							value={password}
							onChange={(e) => setPassword(e.currentTarget.value)}
							required
							mb="md"
						/>

						<PasswordInput
							label={translations("confirmPassword")}
							placeholder={translations(
								"confirmPasswordPlaceholder",
							)}
							value={confirmPassword}
							onChange={(e) =>
								setConfirmPassword(e.currentTarget.value)
							}
							required
							mb="lg"
						/>

						<CtaButton type="submit" fullWidth loading={loading}>
							{translations("createAccount")}
						</CtaButton>

						<Text c="dimmed" size="sm" ta="center" mt="lg">
							{translations("hasAccount")}{" "}
							<Link
								href="/login"
								style={{
									color: "var(--text-primary)",
									fontWeight: 600,
								}}>
								{translations("signIn")}
							</Link>
						</Text>
					</form>
				)}

				<Modal
					opened={resendOpened}
					onClose={resendHandlers.close}
					title={translations("resendVerificationTitle")}
					centered>
					<Text size="sm" mb="lg">
						{translations("resendVerificationConfirm")}
					</Text>
					<CtaButton
						fullWidth
						loading={resending}
						onClick={handleResend}>
						{translations("resendVerificationButton")}
					</CtaButton>
				</Modal>
			</AuthCard>
		</ClientOnly>
	)
}
