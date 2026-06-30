"use client"

import { CtaButton } from "@/components/ui/cta-button"
import { IconEdit } from "@tabler/icons-react"
import { useTranslations } from "next-intl"
import Link from "next/link"

type OpenInEditorButtonProps = {
	projectId: string
}

export const OpenInEditorButton = ({
	projectId,
}: OpenInEditorButtonProps): React.JSX.Element => {
	const translations = useTranslations("projects")

	return (
		<CtaButton
			component={Link}
			href={`/editor/${projectId}`}
			size="lg"
			leftSection={<IconEdit size={20} />}>
			{translations("openInEditor")}
		</CtaButton>
	)
}
