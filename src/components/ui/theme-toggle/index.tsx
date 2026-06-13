"use client"

import { IconMoon, IconSun } from "@tabler/icons-react"

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
		<button
			className={styles.toggle}
			onClick={toggleTheme}
			aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
			type="button">
			{isDark ? <IconSun size={16} /> : <IconMoon size={16} />}
		</button>
	)
}

ThemeToggle.displayName = "ThemeToggle"
