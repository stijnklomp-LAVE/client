"use client"

import { useEffect, useRef, useState } from "react"
import { MantineProvider } from "@mantine/core"

import { ThemeContext } from "./context"
import { ThemeModel } from "./types"
import type { TThemeModel, TThemeModelInit } from "./types"

const STORAGE_KEY = "video-editor-theme"

export function ThemeProvider({
	children,
}: {
	children: React.ReactNode
}): React.JSX.Element {
	const [themeModelObj, setThemeModel]: TThemeModelInit =
		useState<TThemeModel>(ThemeModel)
	const isInitialMount = useRef(true)

	useEffect(() => {
		if (isInitialMount.current) {
			isInitialMount.current = false

			try {
				const stored = localStorage.getItem(STORAGE_KEY)
				if (stored === "light" || stored === "dark") {
					// eslint-disable-next-line react-hooks/set-state-in-effect
					setThemeModel({ currentColourMode: stored })
				}
			} catch {
				// localStorage not available
			}

			return
		}

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
