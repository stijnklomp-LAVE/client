import { getTranslations } from "next-intl/server"
import Link from "next/link"

import { LoginForm } from "@/components/auth/login-form"

export default async function LoginPage({
	params,
}: {
	params: Promise<{ locale: string }>
}): Promise<React.JSX.Element> {
	const { locale } = await params
	const t = await getTranslations({ locale, namespace: "auth" })

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
				<LoginForm />
			</main>

			<footer
				style={{
					padding: "20px 24px",
					textAlign: "center",
					borderTop: "1px solid var(--border-primary)",
					fontSize: 13,
				}}>
				{t("noAccount")}{" "}
				<Link
					href="/register"
					style={{
						color: "var(--text-primary)",
						fontWeight: 600,
					}}>
					{t("createOne")}
				</Link>
			</footer>
		</div>
	)
}
