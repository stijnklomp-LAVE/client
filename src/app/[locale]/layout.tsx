import "@mantine/core/styles.css"
import "@mantine/notifications/styles.css"
import "@mantine/nprogress/styles.css"
import "../globals.scss"

import { NextIntlClientProvider } from "next-intl"
import { getMessages } from "next-intl/server"
import { Notifications } from "@mantine/notifications"

import { ThemeProvider } from "@/lib/theme"
import { RouterProgress } from "@/components/providers/router-progress"
import { SessionProvider } from "@/components/auth/session-provider"
import { auth } from "@/auth"

export default async function LocaleLayout({
	children,
	params,
}: {
	children: React.ReactNode
	params: Promise<{ locale: string }>
}): Promise<React.JSX.Element> {
	const { locale } = await params
	const messages = await getMessages()
	const session = await auth()

	return (
		<html lang={locale} suppressHydrationWarning>
			<body>
				<NextIntlClientProvider locale={locale} messages={messages}>
					<SessionProvider session={session}>
						<ThemeProvider>
							<RouterProgress />
							<Notifications position="top-right" />
							{children}
						</ThemeProvider>
					</SessionProvider>
				</NextIntlClientProvider>
			</body>
		</html>
	)
}
