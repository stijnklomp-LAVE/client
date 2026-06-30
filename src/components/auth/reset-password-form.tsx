"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { nprogress } from "@/components/providers/router-progress"
import { AuthCard } from "@/components/ui/auth-card"
import { CtaButton } from "@/components/ui/cta-button"
import { Button, PasswordInput, Text, Title } from "@mantine/core"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { FormMessage, type Message } from "@/components/ui/form-message"

export const ResetPasswordForm = (): React.JSX.Element => {
	const translations = useTranslations("auth")
	const router = useRouter()
	const searchParams = useSearchParams()
	const token = searchParams.get("token")
	const [password, setPassword] = useState("")
	const [confirmPassword, setConfirmPassword] = useState("")
	const [message, setMessage] = useState<Message | null>(null)
	const [messageKey, setMessageKey] = useState(0)
	const [loading, setLoading] = useState(false)

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

		try {
			const res = await fetch("/api/reset-password", {
				method: "POST",
				headers: { ["Content-Type"]: "application/json" },
				body: JSON.stringify({ token, password }),
			})

			const data = await res.json()

			if (!res.ok) {
				updateMessage({
					text: data.error ?? translations("resetError"),
					color: "red",
				})

				return
			}

			nprogress.start()
			router.replace("/login?reset=true")
		} catch {
			updateMessage({ text: translations("resetError"), color: "red" })
		} finally {
			setLoading(false)
		}
	}

	if (!token) {
		return (
			<AuthCard>
				<Title order={2} ta="center" mb="xs">
					{translations("resetPassword")}
				</Title>
				<Text c="red" size="sm" ta="center" mb="lg">
					{translations("resetMissingToken")}
				</Text>
				<Button component="a" href="/login" fullWidth variant="outline">
					{translations("backToLogin")}
				</Button>
			</AuthCard>
		)
	}

	return (
		<AuthCard>
			<form onSubmit={handleSubmit}>
				<Title order={2} ta="center" mb="xs">
					{translations("resetPassword")}
				</Title>
				<Text c="dimmed" size="sm" ta="center" mb="lg">
					{translations("resetPasswordSubtitle")}
				</Text>

				<FormMessage message={message} messageKey={messageKey} />

				<PasswordInput
					label={translations("newPassword")}
					placeholder={translations("passwordPlaceholder")}
					value={password}
					onChange={(e) => setPassword(e.currentTarget.value)}
					required
					mb="md"
				/>

				<PasswordInput
					label={translations("confirmPassword")}
					placeholder={translations("confirmPasswordPlaceholder")}
					value={confirmPassword}
					onChange={(e) => setConfirmPassword(e.currentTarget.value)}
					required
					mb="lg"
				/>

				<CtaButton type="submit" fullWidth loading={loading}>
					{translations("resetPasswordButton")}
				</CtaButton>

				<Text c="dimmed" size="sm" ta="center" mt="lg">
					<Link
						href="/login"
						style={{
							color: "var(--text-primary)",
							fontWeight: 600,
						}}>
						{translations("backToLogin")}
					</Link>
				</Text>
			</form>
		</AuthCard>
	)
}
