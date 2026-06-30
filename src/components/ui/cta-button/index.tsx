"use client"

import { Button } from "@mantine/core"
import type { ButtonProps } from "@mantine/core"
import styles from "./index.module.scss"

type CtaButtonProps = ButtonProps &
	React.ComponentPropsWithoutRef<"button"> & {
		children: React.ReactNode
		component?: React.ElementType
		href?: string
		target?: string
		rel?: string
	}

export const CtaButton = ({
	children,
	size = "lg",
	style,
	...props
}: CtaButtonProps): React.JSX.Element => (
	<Button
		className={styles.root}
		size={size}
		variant="filled"
		style={{
			background:
				"linear-gradient(135deg, var(--cta-gradient-from), var(--cta-gradient-to))",
			border: "none",
			fontWeight: 600,
			...style,
		}}
		{...(props as Record<string, unknown>)}>
		{children}
	</Button>
)

CtaButton.displayName = "CtaButton"
