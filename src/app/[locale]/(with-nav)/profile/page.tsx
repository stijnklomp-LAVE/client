import { ProfileForm } from "@/components/auth/profile-form"

export default async function ProfilePage(): Promise<React.JSX.Element> {
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
				<ProfileForm />
			</main>
		</div>
	)
}
