import { redirect } from "next/navigation"

import { auth } from "@/auth"
import { EditorShell } from "@/components/project-editor/editor-shell"
import type { ProjectFragment } from "@/components/project-editor/editor-context"
import { signJwt } from "@/lib/api/jwt"
import { proxyToFragmentComposer } from "@/lib/api/fragment-composer"
import type { TimelineLayer } from "@/lib/editor/types"

type ProjectResponse = {
	createdAt: string
	description: string | null
	fragmentCount: number
	fragments?: ProjectFragment[]
	id: string
	name: string
	updatedAt: string
}

export default async function EditorPage({
	params,
}: {
	params: Promise<{ locale: string; id: string }>
}): Promise<React.JSX.Element> {
	const { locale, id } = await params
	const session = await auth()
	const token = await signJwt(session!.user.id)

	const [projectRes, timelineRes] = await Promise.all([
		proxyToFragmentComposer(`/v1/projects/${id}`, { token }),
		proxyToFragmentComposer(`/v1/projects/${id}/timeline`, { token }),
	])

	if (!projectRes.ok) {
		redirect(`/${locale}/projects`)
	}

	const { project } = (await projectRes.json()) as {
		project: ProjectResponse
	}

	let initialLayers: TimelineLayer[] = []

	if (timelineRes.ok) {
		const timelineBody = (await timelineRes.json()) as {
			layers: TimelineLayer[]
		}
		initialLayers = timelineBody.layers
	}

	return (
		<EditorShell
			initialLayers={initialLayers}
			projectId={id}
			projectName={project.name}
			fragments={project.fragments ?? []}
		/>
	)
}

EditorPage.displayName = "EditorPage"
