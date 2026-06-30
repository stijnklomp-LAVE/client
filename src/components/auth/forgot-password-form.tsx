"use client"

import { useState } from "react"
import { AuthCard } from "@/components/ui/auth-card"
import { CtaButton } from "@/components/ui/cta-button"
import { Button, Text, TextInput, Title } from "@mantine/core"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { FormMessage, type Message } from "@/components/ui/form-message"

export const ForgotPasswordForm = (): React.JSX.Element => {
	const translations = useTranslations("auth")
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
					text: data.error ?? translations("resetError"),
					color: "red",
				})

				return
			}

			setSent(true)
		} catch {
			updateMessage({ text: translations("resetError"), color: "red" })
		} finally {
			setLoading(false)
		}
	}

	if (sent) {
		return (
			<AuthCard>
				<Title order={2} ta="center" mb="xs">
					{translations("checkEmail")}
				</Title>
				<Text c="dimmed" size="sm" ta="center" mb="lg">
					{translations("resetSent")}
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
					{translations("forgotPassword")}
				</Title>
				<Text c="dimmed" size="sm" ta="center" mb="lg">
					{translations("forgotPasswordSubtitle")}
				</Text>

				<FormMessage message={message} messageKey={messageKey} />

				<TextInput
					label={translations("email")}
					placeholder="you@example.com"
					value={email}
					onChange={(e) => setEmail(e.currentTarget.value)}
					required
					mb="lg"
				/>

				<CtaButton type="submit" fullWidth loading={loading}>
					{translations("sendResetLink")}
				</CtaButton>

				<Text c="dimmed" size="sm" ta="center" mt="lg">
					{translations("rememberPassword")}{" "}
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
		</AuthCard>
	)
}
