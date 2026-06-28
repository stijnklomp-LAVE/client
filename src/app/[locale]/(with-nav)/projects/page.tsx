import { ProjectsPageClient } from "@/components/projects/projects-page-client"

export default async function ProjectsPage(): Promise<React.JSX.Element> {
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
				<ProjectsPageClient />
			</main>
		</div>
	)
}
