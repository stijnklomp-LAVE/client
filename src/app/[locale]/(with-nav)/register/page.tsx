import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { RegisterForm } from "@/components/auth/register-form"

export default async function RegisterPage({
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
				height: "100%",
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
				<RegisterForm />
			</main>
		</div>
	)
}
