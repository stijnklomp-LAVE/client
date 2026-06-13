"use client"

import { useEffect, useState } from "react"
import { MantineProvider } from "@mantine/core"

import { ThemeContext } from "./context"
import { ThemeModel } from "./types"
import type { TThemeModel, TThemeModelInit } from "./types"

const STORAGE_KEY = "video-editor-theme"

function getInitialTheme(): TThemeModel {
	if (typeof window === "undefined") return ThemeModel
	try {
		const stored = localStorage.getItem(STORAGE_KEY)
		if (stored === "light" || stored === "dark") {
			return { currentColourMode: stored }
		}
	} catch {
		// localStorage not available
	}
	return ThemeModel
}

export function ThemeProvider({
	children,
}: {
	children: React.ReactNode
}): React.JSX.Element {
	const [themeModelObj, setThemeModel]: TThemeModelInit =
		useState<TThemeModel>(getInitialTheme)

	useEffect(() => {
		try {
			localStorage.setItem(STORAGE_KEY, themeModelObj.currentColourMode)
		} catch {
			// localStorage not available
		}
	}, [themeModelObj.currentColourMode])

	return (
		<ThemeContext.Provider
			value={{
				data: themeModelObj,
				setThemeModel,
			}}>
			<div id={themeModelObj.currentColourMode}>
				<MantineProvider
					forceColorScheme={themeModelObj.currentColourMode}>
					{children}
				</MantineProvider>
			</div>
		</ThemeContext.Provider>
	)
}
