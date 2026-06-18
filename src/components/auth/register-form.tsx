"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import {
	Button,
	Card,
	PasswordInput,
	Text,
	TextInput,
	Title,
} from "@mantine/core"
import { useTranslations } from "next-intl"

export function RegisterForm() {
	const t = useTranslations("auth")
	const router = useRouter()
	const [name, setName] = useState("")
	const [email, setEmail] = useState("")
	const [password, setPassword] = useState("")
	const [confirmPassword, setConfirmPassword] = useState("")
	const [error, setError] = useState<string | null>(null)
	const [loading, setLoading] = useState(false)

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		setError(null)

		if (password !== confirmPassword) {
			setError(t("passwordMismatch"))
			return
		}

		if (password.length < 8) {
			setError(t("passwordTooShort"))
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
			setError(data.error ?? t("registerError"))
			setLoading(false)
			return
		}

		router.push("/login?registered=true")
		router.refresh()
	}

	return (
		<Card
			withBorder
			shadow="sm"
			padding="xl"
			radius="md"
			maw={420}
			w="100%">
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

				{error && (
					<Text c="red" size="sm" mb="md">
						{error}
					</Text>
				)}

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
					onChange={(e) => setConfirmPassword(e.currentTarget.value)}
					required
					mb="lg"
				/>

				<Button type="submit" fullWidth loading={loading}>
					{t("createAccount")}
				</Button>
			</form>
		</Card>
	)
}
