"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signIn, useSession } from "next-auth/react"
import {
	Button,
	Card,
	PasswordInput,
	Text,
	TextInput,
	Title,
} from "@mantine/core"
import { useTranslations } from "next-intl"

export function LoginForm() {
	const t = useTranslations("auth")
	const router = useRouter()
	const { update } = useSession()
	const [email, setEmail] = useState("")
	const [password, setPassword] = useState("")
	const [error, setError] = useState<string | null>(null)
	const [loading, setLoading] = useState(false)

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		setError(null)
		setLoading(true)

		const result = await signIn("credentials", {
			email,
			password,
			redirect: false,
		})

		if (result?.error) {
			setError(t("loginError"))
			setLoading(false)
			return
		}

		await update()
		router.replace("/")
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
					{t("login")}
				</Title>
				<Text c="dimmed" size="sm" ta="center" mb="lg">
					{t("loginSubtitle")}
				</Text>

				{error && (
					<Text c="red" size="sm" mb="md">
						{error}
					</Text>
				)}

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
					mb="lg"
				/>

				<Button type="submit" fullWidth loading={loading}>
					{t("signIn")}
				</Button>
			</form>
		</Card>
	)
}
