"use client"

import { createTheme, MantineProvider } from "@mantine/core"
import { useEffect, useState } from "react"

import { ThemeContext } from "./context"
import { ThemeModel, STORAGE_KEY } from "./types"
import type { TTheme, TThemeModel, TThemeModelInit } from "./types"

const theme = createTheme({
	defaultRadius: "md",
})

export function ThemeProvider({
	children,
	initialTheme,
}: {
	children: React.ReactNode
	initialTheme?: TTheme
}): React.JSX.Element {
	const [themeModelObj, setThemeModel]: TThemeModelInit =
		useState<TThemeModel>({
			currentColourMode: initialTheme ?? ThemeModel.currentColourMode,
		})

	useEffect(() => {
		try {
			localStorage.setItem(STORAGE_KEY, themeModelObj.currentColourMode)
			document.cookie = `${STORAGE_KEY}=${themeModelObj.currentColourMode};path=/;max-age=31536000`
		} catch {
			// storage not available
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
					forceColorScheme={themeModelObj.currentColourMode}
					theme={theme}>
					{children}
				</MantineProvider>
			</div>
		</ThemeContext.Provider>
	)
}
