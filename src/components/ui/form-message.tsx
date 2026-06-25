"use client"

import { motion } from "motion/react"
import { Text } from "@mantine/core"

type MessageColor = "green" | "red"

export type Message = {
	text: string
	color: MessageColor
}

export const FormMessage = ({
	message,
	messageKey,
}: {
	message: Message | null
	messageKey: number
}): React.JSX.Element | null => {
	if (!message) return null

	return (
		<motion.div
			key={messageKey}
			initial={{ opacity: 0, y: -8 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.25 }}
			style={{
				padding: "10px 16px",
				borderRadius: 12,
				background: `color-mix(in srgb, var(--mantine-color-${message.color}-6) 15%, transparent)`,
				border: `1px solid color-mix(in srgb, var(--mantine-color-${message.color}-6) 30%, transparent)`,
				marginBottom: 16,
			}}>
			<Text
				c={`var(--mantine-color-${message.color}-6)`}
				size="sm"
				ta="center">
				{message.text}
			</Text>
		</motion.div>
	)
}
