import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { ProfileForm } from "@/components/auth/profile-form"

export default async function ProfilePage({
	params,
}: {
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
				minHeight: "100vh",
				display: "flex",
				flexDirection: "column",
				background: "var(--bg-primary)",
				color: "var(--text-primary)",
			}}>
			<main
				style={{
					flex: 1,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					padding: "24px",
				}}>
				<ProfileForm />
			</main>
		</div>
	)
}
