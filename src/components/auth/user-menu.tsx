"use client"

import { ActionIcon, Menu } from "@mantine/core"
import { IconLogout, IconUserCircle } from "@tabler/icons-react"
import { signOut, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

export function UserMenu(): React.JSX.Element | null {
	const { data: session } = useSession()
	const router = useRouter()

	if (!session?.user) {
		return null
	}

	return (
		<Menu shadow="md" width={180}>
			<Menu.Target>
				<ActionIcon variant="subtle" size="lg" aria-label="User menu">
					<IconUserCircle size={22} />
				</ActionIcon>
			</Menu.Target>

			<Menu.Dropdown>
				<Menu.Item
					leftSection={<IconUserCircle size={16} />}
					onClick={() => router.push("/profile")}>
					Profile
				</Menu.Item>

				<Menu.Divider />

				<Menu.Item
					leftSection={<IconLogout size={16} />}
					onClick={() => signOut({ callbackUrl: "/" })}
					color="red">
					Sign Out
				</Menu.Item>
			</Menu.Dropdown>
		</Menu>
	)
}

UserMenu.displayName = "UserMenu"
