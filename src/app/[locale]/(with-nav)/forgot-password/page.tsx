import { ForgotPasswordForm } from "@/components/auth/forgot-password-form"

export default async function ForgotPasswordPage({
	params,
}: {
	params: Promise<{ locale: string }>
}): Promise<React.JSX.Element> {
	await params

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
				<ForgotPasswordForm />
			</main>
		</div>
	)
}
