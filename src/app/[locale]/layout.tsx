import { NextIntlClientProvider } from "next-intl"
import { getMessages } from "next-intl/server"
import { Notifications } from "@mantine/notifications"
import { cookies } from "next/headers"

import { ThemeProvider } from "@/lib/theme"
import { RouterProgress } from "@/components/providers/router-progress"
import { SessionProvider } from "@/components/auth/session-provider"
import { auth } from "@/auth"
import { STORAGE_KEY } from "@/lib/theme/types"
import type { TTheme } from "@/lib/theme/types"

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
	const cookieStore = await cookies()
	const themeCookie = cookieStore.get(STORAGE_KEY)?.value
	const initialTheme: TTheme | undefined =
		themeCookie === "light" || themeCookie === "dark"
			? themeCookie
			: undefined

	return (
		<NextIntlClientProvider locale={locale} messages={messages}>
			<SessionProvider session={session}>
				<ThemeProvider initialTheme={initialTheme}>
					<RouterProgress />
					<Notifications position="top-right" />
					{children}
				</ThemeProvider>
			</SessionProvider>
		</NextIntlClientProvider>
	)
}
