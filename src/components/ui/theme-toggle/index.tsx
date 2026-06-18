"use client"

import { IconMoon, IconSun } from "@tabler/icons-react"
import { Tooltip } from "@mantine/core"

import { useTheme } from "@/lib/theme"
import styles from "./styles.module.scss"

export function ThemeToggle(): React.JSX.Element {
	const { data, setThemeModel } = useTheme()

	const toggleTheme = (): void => {
		setThemeModel((prev) => ({
			currentColourMode:
				prev.currentColourMode === "dark" ? "light" : "dark",
		}))
	}

	const isDark = data.currentColourMode === "dark"

	return (
		<Tooltip
			label={`Switch to ${isDark ? "light" : "dark"} mode`}
			position="bottom"
			withArrow
			withinPortal={false}
			openDelay={800}
			closeDelay={200}
			classNames={{
				tooltip: "tooltip-custom",
				arrow: "tooltip-arrow-custom",
			}}>
			<button
				className={styles.toggle}
				onClick={toggleTheme}
				aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
				type="button">
				{isDark ? <IconSun size={16} /> : <IconMoon size={16} />}
			</button>
		</Tooltip>
	)
}

ThemeToggle.displayName = "ThemeToggle"
