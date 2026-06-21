"use client"

import { Box, SimpleGrid, Text, Title } from "@mantine/core"
import {
	IconCloudUpload,
	IconPlayerPlay,
	IconScissors,
	IconTimeline,
} from "@tabler/icons-react"
import { motion } from "motion/react"

const steps = [
	{
		icon: IconCloudUpload,
		title: "step1",
		description: "step1Desc",
		color: "#228be6",
	},
	{
		icon: IconScissors,
		title: "step2",
		description: "step2Desc",
		color: "#7950f2",
	},
	{
		icon: IconTimeline,
		title: "step3",
		description: "step3Desc",
		color: "#40c057",
	},
	{
		icon: IconPlayerPlay,
		title: "step4",
		description: "step4Desc",
		color: "#fab005",
	},
]

export function WorkflowSection({
	translations,
}: {
	translations: Record<string, string>
}): React.JSX.Element {
	return (
		<div
			style={{
				padding: "80px 16px",
				background: "var(--bg-secondary)",
				borderTop: "1px solid var(--border-primary)",
				borderBottom: "1px solid var(--border-primary)",
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
					style={{ textAlign: "center", marginBottom: 56 }}>
					<Title
						order={2}
						style={{
							fontSize: "clamp(1.5rem, 3vw, 2rem)",
							fontWeight: 700,
							color: "var(--text-primary)",
							marginBottom: 12,
						}}>
						{translations.title}
					</Title>
					<Text
						size="md"
						style={{
							color: "var(--text-secondary)",
							maxWidth: 600,
							margin: "0 auto",
							lineHeight: 1.6,
						}}>
						{translations.subtitle}
					</Text>
				</motion.div>

				{/* Desktop layout */}
				<Box visibleFrom="md" style={{ position: "relative" }}>
					<motion.div
						initial={{ opacity: 0, scaleX: 0 }}
						whileInView={{ opacity: 1, scaleX: 1 }}
						viewport={{ once: true }}
						transition={{ duration: 0.5 }}
						style={{
							originX: 0,
							position: "absolute",
							top: 68,
							left: "12.5%",
							right: "12.5%",
							height: 3,
							background:
								"linear-gradient(90deg, #228be6, #7950f2, #40c057, #fab005)",
							zIndex: 0,
						}}
					/>

					<SimpleGrid cols={4} spacing={16}>
						{steps.map((step, index) => {
							const StepIcon = step.icon
							return (
								<motion.div
									key={step.title}
									initial={{ opacity: 0, y: 20 }}
									whileInView={{ opacity: 1, y: 0 }}
									viewport={{ once: true }}
									transition={{
										duration: 0.4,
										delay: index * 0.15,
									}}
									style={{
										height: "100%",
										position: "relative",
										zIndex: 1,
									}}>
									<CenteredStep
										step={step}
										icon={StepIcon}
										index={index}
										translations={translations}
									/>
								</motion.div>
							)
						})}
					</SimpleGrid>
				</Box>

				{/* Tablet layout */}
				<Box hiddenFrom="md" style={{ position: "relative" }}>
					{/* SVG path line (tablet only) */}
					<Box
						visibleFrom="sm"
						hiddenFrom="md"
						style={{
							position: "absolute",
							top: 0,
							left: 0,
							width: "100%",
							height: "100%",
							pointerEvents: "none",
							zIndex: 0,
							overflow: "visible",
						}}>
						<motion.div
							initial={{ opacity: 0 }}
							whileInView={{ opacity: 1 }}
							viewport={{ once: true }}
							transition={{ duration: 0.5, delay: 0.55 }}
							style={{ width: "100%", height: "100%" }}>
							<svg
								width="100%"
								height="100%"
								viewBox="0 0 100 100"
								preserveAspectRatio="none"
								fill="none">
								<defs>
									<linearGradient
										id="tablet-mid"
										x1="1"
										y1="0"
										x2="0"
										y2="1">
										<stop offset="0%" stopColor="#7950f2" />
										<stop
											offset="100%"
											stopColor="#40c057"
										/>
									</linearGradient>
								</defs>
								<path
									d="M 57,16 C 57,46 45,50 40,50 C 35,50 25,50 20,50 C 15,50 5,54 5,68"
									stroke="url(#tablet-mid)"
									strokeWidth="3"
									vectorEffect="non-scaling-stroke"
									strokeLinecap="round"
									strokeLinejoin="round"
								/>
							</svg>
						</motion.div>
					</Box>

					{/* Progress bar 1 (tablet) */}
					<Box
						visibleFrom="sm"
						hiddenFrom="md"
						style={{
							position: "absolute",
							top: 0,
							left: 0,
							width: "100%",
							height: "100%",
							pointerEvents: "none",
							zIndex: 0,
						}}>
						<motion.div
							initial={{ opacity: 0, scaleX: 0 }}
							whileInView={{ opacity: 1, scaleX: 1 }}
							viewport={{ once: true }}
							transition={{ duration: 0.4, delay: 0.15 }}
							style={{
								originX: 0,
								position: "absolute",
								top: 44,
								left: "5%",
								right: "43%",
								height: 3,
								background:
									"linear-gradient(90deg, #228be6, #7950f2)",
								zIndex: 0,
								pointerEvents: "none",
							}}
						/>
					</Box>

					{/* Progress bar 2 (tablet) */}
					<Box
						visibleFrom="sm"
						hiddenFrom="md"
						style={{
							position: "absolute",
							top: 0,
							left: 0,
							width: "100%",
							height: "100%",
							pointerEvents: "none",
							zIndex: 0,
						}}>
						<motion.div
							initial={{ opacity: 0, scaleX: 0 }}
							whileInView={{ opacity: 1, scaleX: 1 }}
							viewport={{ once: true }}
							transition={{ duration: 0.4, delay: 0.45 }}
							style={{
								originX: 0,
								position: "absolute",
								top: "68%",
								left: "5%",
								right: "43%",
								height: 3,
								background:
									"linear-gradient(90deg, #40c057, #fab005)",
								zIndex: 0,
								pointerEvents: "none",
							}}
						/>
					</Box>

					{/* Progress line (mobile) */}
					<Box
						hiddenFrom="sm"
						style={{
							position: "absolute",
							top: 0,
							left: 0,
							width: "100%",
							height: "100%",
							pointerEvents: "none",
							zIndex: 0,
						}}>
						<motion.div
							initial={{ opacity: 0, scaleY: 0 }}
							whileInView={{ opacity: 1, scaleY: 1 }}
							viewport={{ once: true }}
							transition={{ duration: 0.5, delay: 0.15 }}
							style={{
								originY: 0,
								position: "absolute",
								top: 44,
								left: 44,
								width: 3,
								height: "calc(100% - 127px)",
								background:
									"linear-gradient(to bottom, #228be6 0%, #7950f2 33%, #40c057 67%, #fab005 100%)",
								zIndex: 0,
								pointerEvents: "none",
							}}
						/>
					</Box>

					{/* Tablet & Mobile step cards */}
					<SimpleGrid cols={{ base: 1, sm: 2 }} spacing={24}>
						{steps.map((step, index) => {
							const StepIcon = step.icon
							return (
								<motion.div
									key={step.title}
									initial={{ opacity: 0, y: 20 }}
									whileInView={{ opacity: 1, y: 0 }}
									viewport={{ once: true }}
									transition={{
										duration: 0.4,
										delay: index * 0.15,
									}}
									style={{
										height: "100%",
										position: "relative",
										zIndex: 1,
									}}>
									<CardStep
										step={step}
										icon={StepIcon}
										index={index}
										translations={translations}
									/>
								</motion.div>
							)
						})}
					</SimpleGrid>
				</Box>
			</div>
		</div>
	)
}

function CenteredStep({
	step,
	icon: iconComponent,
	index,
	translations,
}: {
	step: (typeof steps)[number]
	icon: (typeof steps)[number]["icon"]
	index: number
	translations: Record<string, string>
}): React.JSX.Element {
	const Icon = iconComponent
	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				textAlign: "center",
				gap: 12,
				padding: "40px 20px 24px",
				borderRadius: 16,
				height: "100%",
				background: `
					radial-gradient(ellipse 100% 60% at 50% 0%, ${step.color}15, transparent),
					color-mix(in srgb, var(--bg-primary) 90%, transparent)
				`,
				border: "1px solid var(--border-primary)",
			}}>
			<div
				style={{
					width: 56,
					height: 56,
					borderRadius: "50%",
					background: `color-mix(in srgb, ${step.color} 15%, transparent)`,
					border: `2px solid ${step.color}`,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}>
				<Icon size={24} style={{ color: step.color }} />
			</div>
			<span
				style={{
					fontSize: 11,
					fontWeight: 700,
					color: "white",
					background: step.color,
					padding: "2px 10px",
					borderRadius: 10,
					letterSpacing: "0.05em",
				}}>
				Step {index + 1}
			</span>
			<Title
				order={4}
				style={{
					fontSize: 15,
					fontWeight: 600,
					color: "var(--text-primary)",
				}}>
				{translations[step.title]}
			</Title>
			<Text
				size="sm"
				style={{
					color: "var(--text-secondary)",
					lineHeight: 1.5,
				}}>
				{translations[step.description]}
			</Text>
		</div>
	)
}

function CardStep({
	step,
	icon: iconComponent,
	index,
	translations,
}: {
	step: (typeof steps)[number]
	icon: (typeof steps)[number]["icon"]
	index: number
	translations: Record<string, string>
}): React.JSX.Element {
	const Icon = iconComponent
	return (
		<div
			style={{
				display: "flex",
				gap: 16,
				padding: 20,
				borderRadius: 16,
				background: `
					radial-gradient(ellipse 100% 100% at 0% 50%, ${step.color}15, transparent),
					color-mix(in srgb, var(--bg-primary) 90%, transparent)
				`,
				border: "1px solid var(--border-primary)",
				alignItems: "flex-start",
				height: "100%",
			}}>
			<div
				style={{
					flexShrink: 0,
					width: 48,
					height: 48,
					borderRadius: 14,
					background: `color-mix(in srgb, ${step.color} 15%, transparent)`,
					border: `1px solid ${step.color}`,
					display: "flex",
					alignItems: "center",
					justifyContent: "center",
				}}>
				<Icon size={22} style={{ color: step.color }} />
			</div>
			<div
				style={{
					display: "flex",
					flexDirection: "column",
					gap: 4,
					flex: 1,
					minWidth: 0,
				}}>
				<span
					style={{
						fontSize: 10,
						fontWeight: 700,
						color: "white",
						background: step.color,
						padding: "1px 8px",
						borderRadius: 8,
						letterSpacing: "0.05em",
						alignSelf: "flex-start",
					}}>
					Step {index + 1}
				</span>
				<Title
					order={4}
					style={{
						fontSize: 15,
						fontWeight: 600,
						color: "var(--text-primary)",
					}}>
					{translations[step.title]}
				</Title>
				<Text
					size="sm"
					style={{
						color: "var(--text-secondary)",
						lineHeight: 1.5,
					}}>
					{translations[step.description]}
				</Text>
			</div>
		</div>
	)
}

WorkflowSection.displayName = "WorkflowSection"
