"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { nprogress } from "@/components/providers/router-progress"
import { AuthCard } from "@/components/ui/auth-card"
import { Button, PasswordInput, Text, Title } from "@mantine/core"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { FormMessage, type Message } from "@/components/ui/form-message"

export const ResetPasswordForm = (): React.JSX.Element => {
	const t = useTranslations("auth")
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
			updateMessage({ text: t("passwordMismatch"), color: "red" })

			return
		}

		if (password.length < 8) {
			updateMessage({ text: t("passwordTooShort"), color: "red" })

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
					text: data.error ?? t("resetError"),
					color: "red",
				})

				return
			}

			nprogress.start()
			router.replace("/login?reset=true")
		} catch {
			updateMessage({ text: t("resetError"), color: "red" })
		} finally {
			setLoading(false)
		}
	}

	if (!token) {
		return (
			<AuthCard>
				<Title order={2} ta="center" mb="xs">
					{t("resetPassword")}
				</Title>
				<Text c="red" size="sm" ta="center" mb="lg">
					{t("resetMissingToken")}
				</Text>
				<Button component="a" href="/login" fullWidth variant="outline">
					{t("backToLogin")}
				</Button>
			</AuthCard>
		)
	}

	return (
		<AuthCard>
			<form onSubmit={handleSubmit}>
				<Title order={2} ta="center" mb="xs">
					{t("resetPassword")}
				</Title>
				<Text c="dimmed" size="sm" ta="center" mb="lg">
					{t("resetPasswordSubtitle")}
				</Text>

				<FormMessage message={message} messageKey={messageKey} />

				<PasswordInput
					label={t("newPassword")}
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
					onChange={(e) => setConfirmPassword(e.currentTarget.value)}
					required
					mb="lg"
				/>

				<Button type="submit" fullWidth loading={loading}>
					{t("resetPasswordButton")}
				</Button>

				<Text c="dimmed" size="sm" ta="center" mt="lg">
					<Link
						href="/login"
						style={{
							color: "var(--text-primary)",
							fontWeight: 600,
						}}>
						{t("backToLogin")}
					</Link>
				</Text>
			</form>
		</AuthCard>
	)
}
