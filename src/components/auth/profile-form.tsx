"use client"

import { useState } from "react"
import { Button, Card, Divider, Text, TextInput, Title } from "@mantine/core"
import { IconLogout } from "@tabler/icons-react"
import { signOut, useSession } from "next-auth/react"
import { useTranslations } from "next-intl"

export function ProfileForm(): React.JSX.Element | null {
	const t = useTranslations("auth")
	const { data: session, update } = useSession()

	const [name, setName] = useState(session?.user?.name ?? "")
	const [email, setEmail] = useState(session?.user?.email ?? "")
	const [error, setError] = useState<string | null>(null)
	const [success, setSuccess] = useState<string | null>(null)
	const [loading, setLoading] = useState(false)

	if (!session?.user) {
		return null
	}

	async function handleSubmit(e: React.FormEvent) {
		e.preventDefault()
		setError(null)
		setSuccess(null)
		setLoading(true)

		const res = await fetch("/api/profile", {
			method: "PUT",
			headers: { ["Content-Type"]: "application/json" },
			body: JSON.stringify({ name, email }),
		})

		const data = await res.json()

		if (!res.ok) {
			setError(data.error ?? t("updateError"))
			setLoading(false)
			return
		}

		setSuccess(t("updateSuccess"))
		setLoading(false)
		await update()
	}

	return (
		<Card
			withBorder
			shadow="sm"
			padding="xl"
			radius="md"
			maw={480}
			w="100%">
			<form onSubmit={handleSubmit}>
				<Title order={2} mb="xs">
					{t("profile")}
				</Title>
				<Text c="dimmed" size="sm" mb="lg">
					{t("profileSubtitle")}
				</Text>

				{error && (
					<Text c="red" size="sm" mb="md">
						{error}
					</Text>
				)}

				{success && (
					<Text c="green" size="sm" mb="md">
						{success}
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
					mb="lg"
				/>

				<Button type="submit" fullWidth loading={loading} mb="md">
					{t("saveChanges")}
				</Button>
			</form>

			<Divider my="lg" />

			<Button
				fullWidth
				variant="outline"
				color="red"
				leftSection={<IconLogout size={16} />}
				onClick={() => signOut({ callbackUrl: "/" })}>
				{t("signOut")}
			</Button>
		</Card>
	)
}

ProfileForm.displayName = "ProfileForm"
