export type TimelineSegment = {
	createdAt: string
	fragmentId: string
	id: string
	inPoint: number
	name: string
	order: number
	outPoint: number
}

export type TimelineLayer = {
	createdAt: string
	id: string
	name: string
	projectId: string
	segments: TimelineSegment[]
	zIndex: number
}

export type TimelineData = {
	layers: TimelineLayer[]
}
