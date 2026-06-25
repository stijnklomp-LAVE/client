"use client"

import { Button } from "@mantine/core"
import type { ButtonProps } from "@mantine/core"

type CtaButtonProps = ButtonProps &
	React.ComponentPropsWithoutRef<"button"> & {
		children: React.ReactNode
	}

export const CtaButton = ({
	children,
	style,
	...props
}: CtaButtonProps): React.JSX.Element => (
	<Button
		size="lg"
		variant="filled"
		style={{
			background: "linear-gradient(135deg, #228be6, #7950f2)",
			border: "none",
			fontWeight: 600,
			...style,
		}}
		{...props}>
		{children}
	</Button>
)

CtaButton.displayName = "CtaButton"
