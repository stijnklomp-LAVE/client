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

export function LocaleSwitcher(): React.JSX.Element {
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
		<ClientOnly>
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
