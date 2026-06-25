"use client"

import { Button, Group, Title } from "@mantine/core"
import { IconDeviceDesktop, IconFolder } from "@tabler/icons-react"
import { useSession } from "next-auth/react"
import { useTranslations } from "next-intl"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { ThemeToggle } from "@/components/ui/theme-toggle"
import { LocaleSwitcher } from "@/components/ui/locale-switcher"
import { UserMenu } from "@/components/auth/user-menu"
import { LoginButton } from "@/components/auth/login-button"
import { nprogress } from "@/components/providers/router-progress"

export const Header = (): React.JSX.Element => {
	const { data: session } = useSession()
	const pathname = usePathname()
	const t = useTranslations("nav")

	return (
		<header
			style={{
				position: "sticky",
				top: 0,
				zIndex: 100,
				padding: "12px 24px",
				background: "var(--bg-primary)",
				borderBottom: "1px solid var(--border-primary)",
				display: "flex",
				justifyContent: "space-between",
				alignItems: "center",
			}}>
			<Group gap="lg">
				<Link href="/" style={{ textDecoration: "none" }}>
					<Group gap="xs">
						<div
							style={{
								width: 28,
								height: 28,
								borderRadius: 8,
								background:
									"linear-gradient(135deg, #228be6, #7950f2)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}>
							<svg
								width={16}
								height={16}
								viewBox="0 0 24 24"
								fill="none"
								stroke="white"
								strokeWidth={2}
								strokeLinecap="round"
								strokeLinejoin="round">
								<polygon points="5 3 19 12 5 21 5 3" />
							</svg>
						</div>
						<Title
							order={4}
							style={{
								color: "var(--text-primary)",
								fontWeight: 700,
								fontSize: 16,
							}}>
							Video Editor
						</Title>
					</Group>
				</Link>

				{session?.user && (
					<Group gap={4}>
						<Button
							component={Link}
							href="/projects"
							variant="subtle"
							size="sm"
							leftSection={<IconFolder size={16} />}
							style={{
								borderBottom: pathname.includes("/projects")
									? "2px solid var(--mantine-color-blue-6)"
									: "2px solid transparent",
								borderRadius: pathname.includes("/projects")
									? "var(--border-radius) var(--border-radius) 0 0"
									: undefined,
							}}
							onClick={() => {
								nprogress.start()
							}}>
							{t("projects")}
						</Button>
						<Button
							component={Link}
							href="/devices"
							variant="subtle"
							size="sm"
							leftSection={<IconDeviceDesktop size={16} />}
							style={{
								borderBottom: pathname.includes("/devices")
									? "2px solid var(--mantine-color-blue-6)"
									: "2px solid transparent",
								borderRadius: pathname.includes("/devices")
									? "var(--border-radius) var(--border-radius) 0 0"
									: undefined,
							}}
							onClick={() => {
								nprogress.start()
							}}>
							{t("devices")}
						</Button>
					</Group>
				)}
			</Group>

			<Group gap="sm">
				<UserMenu />
				<LoginButton />
				<LocaleSwitcher />
				<ThemeToggle />
			</Group>
		</header>
	)
}

Header.displayName = "Header"
