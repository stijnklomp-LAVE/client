"use client"

import { useLocale } from "use-intl"
import { Select } from "@mantine/core"
import { usePathname, useRouter } from "@/i18n/navigation"
import { nprogress } from "@/components/providers/router-progress"
import { ClientOnly } from "@/components/ui/client-only"

const locales = [
	{ value: "en", label: "EN" },
	{ value: "nl", label: "NL" },
] as const

export const LocaleSwitcher = (): React.JSX.Element => {
	const locale = useLocale()
	const pathname = usePathname()
	const router = useRouter()

	const handleChange = (nextLocale: string | null): void => {
		if (nextLocale) {
			nprogress.start()
			router.replace(pathname, { locale: nextLocale })
		}
	}

	return (
		<ClientOnly
			placeholder={
				<div
					style={{
						width: 80,
						height: 30,
						borderRadius: "var(--mantine-radius-default)",
						border: "1px solid var(--mantine-color-default-border)",
						background: "var(--mantine-color-default)",
						color: "var(--mantine-color-text)",
						fontSize: "var(--mantine-font-size-xs)",
						display: "flex",
						alignItems: "center",
						paddingInline: "var(--mantine-spacing-xs)",
					}}
					aria-hidden="true">
					{locale.toUpperCase()}
				</div>
			}>
			<Select
				data={[...locales]}
				value={locale}
				onChange={handleChange}
				size="xs"
				w={80}
				aria-label="Select language"
				allowDeselect={false}
			/>
		</ClientOnly>
	)
}

LocaleSwitcher.displayName = "LocaleSwitcher"
