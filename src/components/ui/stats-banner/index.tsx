"use client"

import { SimpleGrid, Text, Title } from "@mantine/core"
import {
	IconAdjustmentsHorizontal,
	IconCloudOff,
	IconDatabase,
	IconDeviceMobile,
} from "@tabler/icons-react"
import { motion } from "motion/react"

const items = [
	{
		icon: IconCloudOff,
		title: "editing",
		description: "editingDesc",
		color: "#228be6",
	},
	{
		icon: IconDeviceMobile,
		title: "sync",
		description: "syncDesc",
		color: "#7950f2",
	},
	{
		icon: IconDatabase,
		title: "storage",
		description: "storageDesc",
		color: "#40c057",
	},
	{
		icon: IconAdjustmentsHorizontal,
		title: "fidelity",
		description: "fidelityDesc",
		color: "#fab005",
	},
]

export const StatsBanner = ({
	translations,
}: {
	translations: Record<string, string>
}): React.JSX.Element => {
	return (
		<div
			style={{
				borderTop: "1px solid var(--border-primary)",
				borderBottom: "1px solid var(--border-primary)",
				background: "var(--bg-secondary)",
			}}>
			<div
				style={{
					maxWidth: 1200,
					margin: "0 auto",
					padding: "40px 16px",
				}}>
				<SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing={24}>
					{items.map((item, index) => {
						const StatIcon = item.icon
						return (
							<motion.div
								key={item.title}
								initial={{ opacity: 0, y: 20 }}
								whileInView={{ opacity: 1, y: 0 }}
								viewport={{ once: true }}
								transition={{
									duration: 0.4,
									delay: index * 0.1,
								}}>
								<div
									style={{
										display: "flex",
										flexDirection: "column",
										gap: 8,
										padding: 16,
										borderRadius: 12,
									}}>
									<div
										style={{
											width: 40,
											height: 40,
											borderRadius: 10,
											background: `color-mix(in srgb, ${item.color} 15%, transparent)`,
											display: "flex",
											alignItems: "center",
											justifyContent: "center",
											marginBottom: 4,
										}}>
										<StatIcon
											size={20}
											style={{ color: item.color }}
										/>
									</div>
									<Title
										order={4}
										style={{
											fontSize: 14,
											fontWeight: 700,
											color: "var(--text-primary)",
											textTransform: "uppercase",
											letterSpacing: "0.05em",
										}}>
										{translations[item.title]}
									</Title>
									<Text
										size="sm"
										style={{
											color: "var(--text-secondary)",
											lineHeight: 1.5,
										}}>
										{translations[item.description]}
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

StatsBanner.displayName = "StatsBanner"
