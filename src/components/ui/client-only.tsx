"use client"

import { useSyncExternalStore } from "react"

export const ClientOnly = ({
	children,
	placeholder,
}: {
	children: React.ReactNode
	placeholder?: React.ReactNode
}): React.JSX.Element => {
	const mounted = useSyncExternalStore(
		() => () => {},
		() => true,
		() => false,
	)

	if (!mounted) {
		return <>{placeholder ?? <div />}</>
	}

	return <>{children}</>
}
