"use client"

import { useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"
import { NavigationProgress, nprogress } from "@mantine/nprogress"

export { nprogress }

export function RouterProgress(): React.JSX.Element {
	const pathname = usePathname()
	const searchParams = useSearchParams()

	useEffect(() => {
		nprogress.complete()
	}, [pathname, searchParams])

	useEffect(() => {
		const handleLinkClick = (event: MouseEvent): void => {
			const target = event.target as HTMLElement
			const anchor = target.closest("a")

			if (!anchor) return
			if (anchor.target === "_blank") return
			if (event.ctrlKey || event.metaKey || event.shiftKey) return

			const href = anchor.getAttribute("href")

			if (!href || href.startsWith("mailto:") || href.startsWith("#"))
				return

			try {
				const current = window.location
				const targetUrl = new URL(href, current.origin)

				if (targetUrl.origin !== current.origin) return
				if (targetUrl.pathname === current.pathname) return

				nprogress.start()
			} catch {
				// invalid URL
			}
		}

		document.addEventListener("click", handleLinkClick)

		return () => {
			document.removeEventListener("click", handleLinkClick)
		}
	}, [])

	return <NavigationProgress />
}

RouterProgress.displayName = "RouterProgress"
