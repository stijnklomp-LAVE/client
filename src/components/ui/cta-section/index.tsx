"use client"

import { Button, Text, Title } from "@mantine/core"
import { motion } from "motion/react"

export function CTASection({
	title,
	subtitle,
	primaryLabel,
	secondaryLabel,
}: {
	title: string
	subtitle: string
	primaryLabel: string
	secondaryLabel: string
}): React.JSX.Element {
	return (
		<div style={{ padding: "80px 24px" }}>
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				whileInView={{ opacity: 1, y: 0 }}
				viewport={{ once: true }}
				transition={{ duration: 0.5 }}
				style={{
					maxWidth: 800,
					margin: "0 auto",
					textAlign: "center",
					padding: "48px 40px",
					borderRadius: 24,
					background: "var(--color-bg-primary)",
					border: "1px solid var(--color-border-primary)",
					position: "relative",
					overflow: "hidden",
				}}>
				<div
					style={{
						position: "absolute",
						inset: 0,
						background:
							"radial-gradient(ellipse 60% 50% at 50% 0%, rgba(0,112,243,0.08), transparent)",
						pointerEvents: "none",
					}}
				/>

				<div style={{ position: "relative", zIndex: 1 }}>
					<Title
						order={2}
						style={{
							fontSize: "clamp(1.5rem, 3vw, 2rem)",
							fontWeight: 700,
							color: "var(--color-text-primary)",
							marginBottom: 12,
						}}>
						{title}
					</Title>
					<Text
						size="md"
						style={{
							color: "var(--color-text-secondary)",
							maxWidth: 500,
							margin: "0 auto 32px",
							lineHeight: 1.6,
						}}>
						{subtitle}
					</Text>

					<div
						style={{
							display: "flex",
							gap: 12,
							justifyContent: "center",
							flexWrap: "wrap",
						}}>
						<Button
							size="lg"
							variant="filled"
							style={{
								background:
									"linear-gradient(135deg, #228be6, #7950f2)",
								border: "none",
								fontWeight: 600,
							}}>
							{primaryLabel}
						</Button>
						<Button
							size="lg"
							variant="outline"
							component="a"
							href="https://github.com/stijnklomp-LAVE/client"
							target="_blank"
							rel="noopener noreferrer"
							style={{
								color: "var(--color-text-primary)",
								borderColor: "var(--color-border-primary)",
							}}>
							{secondaryLabel}
						</Button>
					</div>
				</div>
			</motion.div>
		</div>
	)
}

CTASection.displayName = "CTASection"
