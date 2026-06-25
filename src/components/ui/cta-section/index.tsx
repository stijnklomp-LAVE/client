"use client"

import { Button, Text, Title } from "@mantine/core"
import { CtaButton } from "@/components/ui/cta-button"
import { motion } from "motion/react"

export const CTASection = ({
	title,
	subtitle,
	primaryLabel,
	secondaryLabel,
}: {
	title: string
	subtitle: string
	primaryLabel: string
	secondaryLabel: string
}): React.JSX.Element => {
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
					background: "var(--bg-primary)",
					border: "1px solid var(--border-primary)",
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
							color: "var(--text-primary)",
							marginBottom: 12,
						}}>
						{title}
					</Title>
					<Text
						size="md"
						style={{
							color: "var(--text-secondary)",
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
						<CtaButton>{primaryLabel}</CtaButton>
						<Button
							size="lg"
							variant="outline"
							component="a"
							href="https://github.com/stijnklomp-LAVE/client"
							target="_blank"
							rel="noopener noreferrer"
							style={{
								color: "var(--text-primary)",
								borderColor: "var(--border-primary)",
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
