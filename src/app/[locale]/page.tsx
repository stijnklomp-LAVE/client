import { Group, Title } from "@mantine/core"
import { getTranslations } from "next-intl/server"

import { ThemeToggle } from "@/components/ui/theme-toggle"
import { LocaleSwitcher } from "@/components/ui/locale-switcher"
import { HeroBanner } from "@/components/ui/hero-banner"
import { StatsBanner } from "@/components/ui/stats-banner"
import { FeaturesSection } from "@/components/ui/features-section"
import { WorkflowSection } from "@/components/ui/workflow-section"
import { CTASection } from "@/components/ui/cta-section"

export default async function HomePage(): Promise<React.JSX.Element> {
	const t = await getTranslations("home")

	const statsTranslations: Record<string, string> = {
		editing: t("stats.editing"),
		editingDesc: t("stats.editingDesc"),
		sync: t("stats.sync"),
		syncDesc: t("stats.syncDesc"),
		storage: t("stats.storage"),
		storageDesc: t("stats.storageDesc"),
		fidelity: t("stats.fidelity"),
		fidelityDesc: t("stats.fidelityDesc"),
	}

	const featuresTranslations: Record<string, string> = {
		title: t("features.title"),
		subtitle: t("features.subtitle"),
		["local.title"]: t("features.local.title"),
		["local.description"]: t("features.local.description"),
		["remote.title"]: t("features.remote.title"),
		["remote.description"]: t("features.remote.description"),
		["crossDevice.title"]: t("features.crossDevice.title"),
		["crossDevice.description"]: t("features.crossDevice.description"),
		["multiSource.title"]: t("features.multiSource.title"),
		["multiSource.description"]: t("features.multiSource.description"),
		["privacy.title"]: t("features.privacy.title"),
		["privacy.description"]: t("features.privacy.description"),
		["metadata.title"]: t("features.metadata.title"),
		["metadata.description"]: t("features.metadata.description"),
	}

	const workflowTranslations: Record<string, string> = {
		title: t("workflow.title"),
		subtitle: t("workflow.subtitle"),
		step1: t("workflow.step1"),
		step1Desc: t("workflow.step1Desc"),
		step2: t("workflow.step2"),
		step2Desc: t("workflow.step2Desc"),
		step3: t("workflow.step3"),
		step3Desc: t("workflow.step3Desc"),
		step4: t("workflow.step4"),
		step4Desc: t("workflow.step4Desc"),
	}

	return (
		<div
			style={{
				minHeight: "100vh",
				display: "flex",
				flexDirection: "column",
				background: "var(--color-bg-primary)",
				color: "var(--color-text-primary)",
			}}>
			<header
				style={{
					position: "sticky",
					top: 0,
					zIndex: 100,
					padding: "12px 24px",
					background: "var(--color-bg-primary)",
					borderBottom: "1px solid var(--color-border-primary)",
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
				}}>
				<Group gap="xs">
					<div
						style={{
							width: 28,
							height: 28,
							borderRadius: 8,
							background:
								"linear-gradient(135deg, #228be6, #7950f2)",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}>
						<svg
							width={16}
							height={16}
							viewBox="0 0 24 24"
							fill="none"
							stroke="white"
							strokeWidth={2}
							strokeLinecap="round"
							strokeLinejoin="round">
							<polygon points="5 3 19 12 5 21 5 3" />
						</svg>
					</div>
					<Title
						order={4}
						style={{
							color: "var(--color-text-primary)",
							fontWeight: 700,
							fontSize: 16,
						}}>
						Video Editor
					</Title>
				</Group>

				<Group gap="sm">
					<LocaleSwitcher />
					<ThemeToggle />
				</Group>
			</header>

			<main style={{ flex: 1 }}>
				<HeroBanner
					title={t("title")}
					subtitle={t("subtitle")}
					ctaLabel={t("heroCta")}
					secondaryLabel={t("heroSecondary")}
				/>

				<StatsBanner translations={statsTranslations} />

				<FeaturesSection translations={featuresTranslations} />

				<WorkflowSection translations={workflowTranslations} />

				<CTASection
					title={t("cta.title")}
					subtitle={t("cta.subtitle")}
					primaryLabel={t("cta.primary")}
					secondaryLabel={t("cta.secondary")}
				/>
			</main>

			<footer
				style={{
					padding: "20px 24px",
					textAlign: "center",
					borderTop: "1px solid var(--color-border-primary)",
					background: "var(--color-bg-secondary)",
					color: "var(--color-text-tertiary)",
					fontSize: 13,
				}}>
				{t("footer")}
			</footer>
		</div>
	)
}
