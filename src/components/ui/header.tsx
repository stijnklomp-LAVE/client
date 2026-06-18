"use client"

import { Group, Title } from "@mantine/core"
import Link from "next/link"

import { ThemeToggle } from "@/components/ui/theme-toggle"
import { LocaleSwitcher } from "@/components/ui/locale-switcher"
import { UserMenu } from "@/components/auth/user-menu"
import { LoginButton } from "@/components/auth/login-button"

export function Header(): React.JSX.Element {
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
