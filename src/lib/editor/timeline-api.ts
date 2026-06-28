import type { TimelineData, TimelineLayer, TimelineSegment } from "./types"

export const fetchTimeline = async (
	projectId: string,
): Promise<TimelineData> => {
	const res = await fetch(`/api/projects/${projectId}/timeline`)

	if (!res.ok) {
		throw new Error("Failed to fetch timeline")
	}

	const { layers } = (await res.json()) as { layers: TimelineLayer[] }

	return { layers }
}

export const createLayer = async (
	projectId: string,
): Promise<TimelineLayer> => {
	const res = await fetch(`/api/projects/${projectId}/layers`, {
		method: "POST",
	})

	if (!res.ok) {
		throw new Error("Failed to create layer")
	}

	const { layer } = (await res.json()) as { layer: TimelineLayer }

	return layer
}

export const createSegment = async (
	projectId: string,
	layerId: string,
	fragmentId: string,
): Promise<TimelineSegment> => {
	const res = await fetch(
		`/api/projects/${projectId}/layers/${layerId}/segments`,
		{
			body: JSON.stringify({ fragmentId }),
			// eslint-disable-next-line @typescript-eslint/naming-convention
			headers: { "Content-Type": "application/json" },
			method: "POST",
		},
	)

	if (!res.ok) {
		throw new Error("Failed to create segment")
	}

	const { segment } = (await res.json()) as { segment: TimelineSegment }

	return segment
}
