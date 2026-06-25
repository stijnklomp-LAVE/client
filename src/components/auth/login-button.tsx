"use client"

import { Button } from "@mantine/core"
import { Link } from "@/i18n/navigation"
import { useSession } from "next-auth/react"

export const LoginButton = (): React.JSX.Element | null => {
	const { data: session } = useSession()

	if (session?.user) {
		return null
	}

	return (
		<Button
			component={Link}
			href="/login"
			variant="subtle"
			size="compact-sm">
			Sign In
		</Button>
	)
}

LoginButton.displayName = "LoginButton"
