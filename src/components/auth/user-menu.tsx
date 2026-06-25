"use client"

import { ActionIcon, Menu } from "@mantine/core"
import { IconLogout, IconUserCircle } from "@tabler/icons-react"
import { signOut, useSession } from "next-auth/react"
import { useLocale } from "use-intl"
import { useRouter } from "next/navigation"
import { nprogress } from "@/components/providers/router-progress"

export const UserMenu = (): React.JSX.Element | null => {
	const { data: session } = useSession()
	const router = useRouter()
	const locale = useLocale()

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
					onClick={() => {
						nprogress.start()
						router.push("/profile")
					}}>
					Profile
				</Menu.Item>

				<Menu.Divider />

				<Menu.Item
					leftSection={<IconLogout size={16} />}
					onClick={() => {
						nprogress.start()
						signOut({ callbackUrl: `/${locale}` })
					}}
					color="red">
					Sign Out
				</Menu.Item>
			</Menu.Dropdown>
		</Menu>
	)
}

UserMenu.displayName = "UserMenu"
