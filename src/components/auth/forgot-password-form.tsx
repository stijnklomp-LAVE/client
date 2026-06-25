"use client"

import { useState } from "react"
import { AuthCard } from "@/components/ui/auth-card"
import { Button, Text, TextInput, Title } from "@mantine/core"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { FormMessage, type Message } from "@/components/ui/form-message"

export const ForgotPasswordForm = (): React.JSX.Element => {
	const t = useTranslations("auth")
	const [email, setEmail] = useState("")
	const [message, setMessage] = useState<Message | null>(null)
	const [messageKey, setMessageKey] = useState(0)
	const [sent, setSent] = useState(false)
	const [loading, setLoading] = useState(false)

	const updateMessage = (msg: Message | null): void => {
		setMessage(msg)
		if (msg) {
			setMessageKey((k) => k + 1)
		}
	}

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault()
		setLoading(true)

		try {
			const res = await fetch("/api/forgot-password", {
				method: "POST",
				headers: { ["Content-Type"]: "application/json" },
				body: JSON.stringify({ email }),
			})

			if (!res.ok) {
				const data = await res.json()

				updateMessage({
					text: data.error ?? t("resetError"),
					color: "red",
				})

				return
			}

			setSent(true)
		} catch {
			updateMessage({ text: t("resetError"), color: "red" })
		} finally {
			setLoading(false)
		}
	}

	if (sent) {
		return (
			<AuthCard>
				<Title order={2} ta="center" mb="xs">
					{t("checkEmail")}
				</Title>
				<Text c="dimmed" size="sm" ta="center" mb="lg">
					{t("resetSent")}
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
					{t("forgotPassword")}
				</Title>
				<Text c="dimmed" size="sm" ta="center" mb="lg">
					{t("forgotPasswordSubtitle")}
				</Text>

				<FormMessage message={message} messageKey={messageKey} />

				<TextInput
					label={t("email")}
					placeholder="you@example.com"
					value={email}
					onChange={(e) => setEmail(e.currentTarget.value)}
					required
					mb="lg"
				/>

				<Button type="submit" fullWidth loading={loading}>
					{t("sendResetLink")}
				</Button>

				<Text c="dimmed" size="sm" ta="center" mt="lg">
					{t("rememberPassword")}{" "}
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
		</AuthCard>
	)
}
