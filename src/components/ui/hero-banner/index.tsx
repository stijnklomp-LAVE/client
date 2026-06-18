"use client"

import { Box, Button, Grid, Group, Text, Title } from "@mantine/core"
import {
	IconCloud,
	IconDeviceLaptop,
	IconPlayerPlayFilled,
	IconServer,
} from "@tabler/icons-react"
import { motion } from "motion/react"

const floatingIcons = [
	{
		icon: IconDeviceLaptop,
		label: "Local",
		x: "-30%",
		y: "-40%",
		delay: 0,
		color: "#228be6",
	},
	{
		icon: IconServer,
		label: "NAS",
		x: "30%",
		y: "-35%",
		delay: 0.3,
		color: "#40c057",
	},
	{
		icon: IconCloud,
		label: "Cloud",
		x: "0%",
		y: "30%",
		delay: 0.6,
		color: "#fab005",
	},
]

export function HeroBanner({
	title,
	subtitle,
	ctaLabel,
	secondaryLabel,
}: {
	title: string
	subtitle: string
	ctaLabel: string
	secondaryLabel: string
}): React.JSX.Element {
	return (
		<Box
			style={{
				position: "relative",
				overflow: "hidden",
				padding: "60px 16px",
			}}>
			<Box
				style={{
					position: "absolute",
					inset: 0,
					background:
						"radial-gradient(ellipse 80% 60% at 50% -20%, rgba(0,112,243,0.15), transparent)",
					pointerEvents: "none",
				}}
			/>

			<Box
				style={{
					position: "absolute",
					inset: 0,
					background:
						"radial-gradient(ellipse 60% 50% at 80% 80%, rgba(130,40,230,0.1), transparent)",
					pointerEvents: "none",
				}}
			/>

			<Grid
				gap={{ base: 40, md: 64 }}
				align="center"
				style={{
					position: "relative",
					zIndex: 1,
					maxWidth: 1200,
					margin: "0 auto",
				}}>
				<Grid.Col span={{ base: 12, md: 6 }}>
					<motion.div
						initial={{ opacity: 0, x: -40 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.7, ease: "easeOut" }}>
						<Badge style={{ marginBottom: 16 }}>
							Location-Agnostic Video Editor
						</Badge>

						<Title
							order={1}
							style={{
								fontSize: "clamp(2rem, 5vw, 3.25rem)",
								fontWeight: 800,
								lineHeight: 1.1,
								letterSpacing: "-0.02em",
								color: "var(--text-primary)",
								marginBottom: 20,
							}}>
							{title}
						</Title>

						<Text
							size="lg"
							style={{
								color: "var(--text-secondary)",
								lineHeight: 1.6,
								fontSize: "clamp(1rem, 2vw, 1.125rem)",
								marginBottom: 32,
							}}>
							{subtitle}
						</Text>

						<Group gap="md">
							<Button
								size="lg"
								variant="filled"
								style={{
									background:
										"linear-gradient(135deg, #228be6, #7950f2)",
									border: "none",
									fontWeight: 600,
								}}>
								{ctaLabel}
							</Button>
							<Button
								size="lg"
								variant="outline"
								style={{
									color: "var(--text-primary)",
									borderColor: "var(--border-primary)",
								}}>
								{secondaryLabel}
							</Button>
						</Group>
					</motion.div>
				</Grid.Col>

				<Grid.Col
					span={{ base: 12, md: 6 }}
					style={{
						display: "flex",
						alignItems: "center",
						justifyContent: "center",
					}}>
					<motion.div
						initial={{ opacity: 0, scale: 0.9 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{
							duration: 0.7,
							delay: 0.2,
							ease: "easeOut",
						}}
						style={{
							position: "relative",
							height: 320,
							width: "100%",
							display: "flex",
							alignItems: "center",
							justifyContent: "center",
						}}>
						<div
							style={{
								position: "relative",
								width: "min(260px, 80vw)",
								height: "min(260px, 80vw)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}>
							<div
								className="animate-spin-cw"
								style={{
									position: "absolute",
									inset: 0,
									borderRadius: "50%",
									border: "1px solid var(--border-primary)",
								}}
							/>
							<div
								className="animate-spin-ccw"
								style={{
									position: "absolute",
									inset: 20,
									borderRadius: "50%",
									border: "1px dashed var(--border-secondary)",
									opacity: 0.5,
								}}
							/>

							{floatingIcons.map((item) => {
								const ItemIcon = item.icon
								return (
									<motion.div
										key={item.label}
										initial={{ opacity: 0, scale: 0 }}
										animate={{ opacity: 1, scale: 1 }}
										transition={{
											duration: 0.5,
											delay: 0.5 + item.delay,
										}}
										style={{
											position: "absolute",
											left: `calc(50% + ${item.x})`,
											top: `calc(50% + ${item.y})`,
											transform: "translate(-50%, -50%)",
										}}>
										<div
											className="animate-float"
											style={{
												display: "flex",
												flexDirection: "column",
												alignItems: "center",
												gap: 6,
												animationDelay: `${item.delay}s`,
											}}>
											<div
												style={{
													width: 48,
													height: 48,
													borderRadius: 14,
													background:
														"var(--bg-primary)",
													border: "1px solid var(--border-primary)",
													display: "flex",
													alignItems: "center",
													justifyContent: "center",
													boxShadow:
														"0 4px 20px var(--shadow-md)",
												}}>
												<ItemIcon
													size={20}
													style={{
														color: item.color,
													}}
												/>
											</div>
											<Text
												size="xs"
												style={{
													color: "var(--text-tertiary)",
													fontWeight: 500,
												}}>
												{item.label}
											</Text>
										</div>
									</motion.div>
								)
							})}

							<div
								className="animate-pulse"
								style={{
									width: 72,
									height: 72,
									borderRadius: 20,
									background:
										"linear-gradient(135deg, #228be6, #7950f2)",
									display: "flex",
									alignItems: "center",
									justifyContent: "center",
									boxShadow: "0 8px 32px rgba(0,112,243,0.3)",
									zIndex: 2,
								}}>
								<IconPlayerPlayFilled size={28} color="white" />
							</div>
						</div>
					</motion.div>
				</Grid.Col>
			</Grid>
		</Box>
	)
}

function Badge({
	children,
	style,
}: {
	children: React.ReactNode
	style?: React.CSSProperties
}): React.JSX.Element {
	return (
		<span
			style={{
				display: "inline-flex",
				alignItems: "center",
				padding: "8px 14px",
				borderRadius: 12,
				fontSize: 12,
				fontWeight: 600,
				letterSpacing: "0.05em",
				textTransform: "uppercase",
				background: `
					radial-gradient(ellipse 100% 60% at 50% 100%, rgba(0,112,243,0.08), transparent),
					var(--bg-primary)
				`,
				border: "1px solid var(--border-primary)",
				...style,
			}}>
			<span
				style={{
					background: "linear-gradient(135deg, #228be6, #7950f2)",
					// eslint-disable-next-line @typescript-eslint/naming-convention
					WebkitBackgroundClip: "text",
					// eslint-disable-next-line @typescript-eslint/naming-convention
					WebkitTextFillColor: "transparent",
				}}>
				{children}
			</span>
		</span>
	)
}

HeroBanner.displayName = "HeroBanner"
