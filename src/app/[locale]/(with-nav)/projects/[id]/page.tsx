import { redirect } from "next/navigation"

import { auth } from "@/auth"

export default async function ProjectDetailPage({
	params,
}: {
	params: Promise<{ locale: string; id: string }>
}): Promise<React.JSX.Element> {
	const { locale } = await params
	const session = await auth()

	if (!session?.user) {
		redirect(`/${locale}/login`)
	}

	return (
		<div
			style={{
				minHeight: "100vh",
				display: "flex",
				flexDirection: "column",
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
				Project detail page (coming soon)
			</main>
		</div>
	)
}
