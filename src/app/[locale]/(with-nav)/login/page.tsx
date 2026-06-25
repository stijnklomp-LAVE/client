import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { LoginForm } from "@/components/auth/login-form"

export default async function LoginPage({
	params,
}: {
	params: Promise<{ locale: string }>
}): Promise<React.JSX.Element> {
	const { locale } = await params
	const session = await auth()

	if (session?.user) {
		redirect(`/${locale}/profile`)
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
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
					padding: "24px",
				}}>
				<LoginForm />
			</main>
		</div>
	)
}
