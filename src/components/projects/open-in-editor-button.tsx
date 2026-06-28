"use client"

import { Button } from "@mantine/core"
import { IconEdit } from "@tabler/icons-react"
import { useTranslations } from "next-intl"
import Link from "next/link"

type OpenInEditorButtonProps = {
	projectId: string
}

export const OpenInEditorButton = ({
	projectId,
}: OpenInEditorButtonProps): React.JSX.Element => {
	const t = useTranslations("projects")

	return (
		<Button
			component={Link}
			href={`/editor/${projectId}`}
			size="lg"
			leftSection={<IconEdit size={20} />}>
			{t("openInEditor")}
		</Button>
	)
}
