import "@mantine/core/styles.css"
import "@mantine/notifications/styles.css"
import "@mantine/nprogress/styles.css"
import "./globals.scss"

import "@/styles/variables.scss"
import "@/styles/utilities.scss"
import "@/styles/animations.scss"

import type { Metadata, Viewport } from "next"

export const metadata: Metadata = {
	icons: {
		apple: "/icon.svg",
	},
	manifest: "/manifest.json",
}

export const viewport: Viewport = {
	themeColor: "#0a0a0a",
}

const RootLayout = ({
	children,
}: Readonly<{
	children: React.ReactNode
}>): React.JSX.Element => {
	return <>{children}</>
}

export default RootLayout
