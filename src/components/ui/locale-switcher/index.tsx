"use client"

import { useLocale } from "use-intl"
import { Select } from "@mantine/core"
import { usePathname, useRouter } from "@/i18n/navigation"

const locales = [
	{ value: "en", label: "EN" },
	{ value: "nl", label: "NL" },
] as const

export function LocaleSwitcher(): React.JSX.Element {
	const locale = useLocale()
	const pathname = usePathname()
	const router = useRouter()

	const handleChange = (nextLocale: string | null): void => {
		if (nextLocale) {
			router.replace(pathname, { locale: nextLocale })
		}
	}

	return (
		<Select
			data={[...locales]}
			value={locale}
			onChange={handleChange}
			size="xs"
			w={80}
			aria-label="Select language"
			allowDeselect={false}
		/>
	)
}

LocaleSwitcher.displayName = "LocaleSwitcher"
