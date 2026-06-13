"use client"

import { SimpleGrid, Text, Title } from "@mantine/core"
import {
	IconDeviceDesktop,
	IconCloudComputing,
	IconDevices,
	IconFileImport,
	IconShieldLock,
	IconTags,
} from "@tabler/icons-react"
import { motion } from "motion/react"

const features = [
	{
		key: "local",
		icon: IconDeviceDesktop,
		color: "#228be6",
	},
	{
		key: "remote",
		icon: IconCloudComputing,
		color: "#7950f2",
	},
	{
		key: "crossDevice",
		icon: IconDevices,
		color: "#40c057",
	},
	{
		key: "multiSource",
		icon: IconFileImport,
		color: "#fab005",
	},
	{
		key: "privacy",
		icon: IconShieldLock,
		color: "#fd7e14",
	},
	{
		key: "metadata",
		icon: IconTags,
		color: "#be4bdb",
	},
]

export function FeaturesSection({
	translations,
}: {
	translations: Record<string, string>
}): React.JSX.Element {
	return (
		<div
			style={{
				padding: "80px 16px",
			}}>
			<div
				style={{
					maxWidth: 1200,
					margin: "0 auto",
				}}>
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					whileInView={{ opacity: 1, y: 0 }}
					viewport={{ once: true }}
					transition={{ duration: 0.5 }}
					style={{ textAlign: "center", marginBottom: 48 }}>
					<Title
						order={2}
						style={{
							fontSize: "clamp(1.5rem, 3vw, 2rem)",
							fontWeight: 700,
							color: "var(--color-text-primary)",
							marginBottom: 12,
						}}>
						{translations.title}
					</Title>
					<Text
						size="md"
						style={{
							color: "var(--color-text-secondary)",
							maxWidth: 600,
							margin: "0 auto",
							lineHeight: 1.6,
						}}>
						{translations.subtitle}
					</Text>
				</motion.div>

				<SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing={20}>
					{features.map((feature, index) => {
						const FeatureIcon = feature.icon
						return (
							<motion.div
								key={feature.key}
								initial={{ opacity: 0, y: 24 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{
									duration: 0.4,
									delay: index * 0.08,
								}}>
								<div
									style={{
										padding: 28,
										borderRadius: 16,
										background: `
											radial-gradient(ellipse 100% 60% at 50% 100%, ${feature.color}15, transparent),
											var(--color-bg-primary)
										`,
										border: "1px solid var(--color-border-primary)",
										height: "100%",
									}}>
									<div
										style={{
											width: 44,
											height: 44,
											borderRadius: 12,
											background: `color-mix(in srgb, ${feature.color} 15%, transparent)`,
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											marginBottom: 16,
										}}>
										<FeatureIcon
											size={22}
											style={{ color: feature.color }}
										/>
									</div>
									<Title
										order={4}
										style={{
											fontSize: 16,
											fontWeight: 600,
											color: "var(--color-text-primary)",
											marginBottom: 8,
										}}>
										{translations[`${feature.key}.title`]}
									</Title>
									<Text
										size="sm"
										style={{
											color: "var(--color-text-secondary)",
											lineHeight: 1.6,
										}}>
										{
											translations[
												`${feature.key}.description`
											]
										}
									</Text>
								</div>
							</motion.div>
						)
					})}
				</SimpleGrid>
			</div>
		</div>
	)
}

FeaturesSection.displayName = "FeaturesSection"
