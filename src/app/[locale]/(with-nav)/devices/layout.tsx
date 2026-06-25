import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { DevicesLayoutClient } from "@/components/devices/devices-layout-client"

export default async function DevicesLayout({
	children,
	params,
}: {
	children: React.ReactNode
	params: Promise<{ locale: string }>
}): Promise<React.JSX.Element> {
	const { locale } = await params
	const session = await auth()

	if (!session?.user) {
		redirect(`/${locale}/login`)
	}

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				minHeight: "100%",
				background: "var(--bg-primary)",
				color: "var(--text-primary)",
			}}>
			<main
				style={{
					flex: 1,
					padding: "24px",
					maxWidth: 1200,
					margin: "0 auto",
					width: "100%",
				}}>
				<DevicesLayoutClient>{children}</DevicesLayoutClient>
			</main>
		</div>
	)
}
