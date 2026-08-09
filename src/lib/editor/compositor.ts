export type GenericSegment = {
	fragmentId: string
	order: number
	inPoint: number
	outPoint: number
}

export type GenericLayer = {
	zIndex: number
	segments: GenericSegment[]
}

export type ActiveSegmentResult = {
	segment: GenericSegment
	timelineOffset: number
}

export const getActiveSegment = (
	layer: GenericLayer,
	timelineTime: number,
): ActiveSegmentResult | null => {
	const sorted = [...layer.segments].sort((a, b) => a.order - b.order)

	let timelineCursor = 0

	for (const segment of sorted) {
		const duration = segment.outPoint - segment.inPoint

		if (duration <= 0) continue

		const segmentEnd = timelineCursor + duration

		if (timelineTime >= timelineCursor && timelineTime < segmentEnd) {
			return { segment, timelineOffset: timelineCursor }
		}

		timelineCursor = segmentEnd
	}

	return null
}

export const computeSeekTime = (
	segment: GenericSegment,
	timelineTime: number,
	timelineOffset: number,
): number => {
	return segment.inPoint + (timelineTime - timelineOffset)
}

export const computeDuration = (
	layers: {
		segments: { inPoint: number; outPoint: number; order: number }[]
	}[],
): number => {
	let maxDuration = 0

	for (const layer of layers) {
		const sorted = [...layer.segments].sort((a, b) => a.order - b.order)
		let layerEnd = 0

		for (const segment of sorted) {
			const duration = segment.outPoint - segment.inPoint

			if (duration > 0) {
				layerEnd += duration
			}
		}

		if (layerEnd > maxDuration) {
			maxDuration = layerEnd
		}
	}

	return maxDuration
}

export type FrameBuffer = {
	canvas: OffscreenCanvas | HTMLCanvasElement
	timestamp: number
	duration: number
}

export type FrameProvider = {
	getFrame: (
		fragmentId: string,
		seekTime: number,
	) => Promise<FrameBuffer | null>
}

const drawFallback = (
	ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
	width: number,
	height: number,
): void => {
	ctx.fillStyle = "#1a1a2e"
	ctx.fillRect(0, 0, width, height)
}

export const composeFrame = async (
	ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
	canvasWidth: number,
	canvasHeight: number,
	layers: GenericLayer[],
	currentTime: number,
	frameProvider: FrameProvider,
	onMissingFragment: (
		ctx: OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D,
		fragmentId: string,
		zIndex: number,
		width: number,
		height: number,
	) => void,
): Promise<void> => {
	if (canvasWidth < 1 || canvasHeight < 1) return

	try {
		const sortedLayers = [...layers].sort((a, b) => a.zIndex - b.zIndex)

		const activeLayers: {
			active: ActiveSegmentResult
			layer: GenericLayer
			seekTime: number
		}[] = []

		let drewSomething = false

		for (const layer of sortedLayers) {
			const active = getActiveSegment(layer, currentTime)

			if (!active) continue

			drewSomething = true

			const seekTime = computeSeekTime(
				active.segment,
				currentTime,
				active.timelineOffset,
			)
			activeLayers.push({ active, layer, seekTime })
		}

		const frames: {
			active: ActiveSegmentResult
			layer: GenericLayer
			frame: FrameBuffer | null
		}[] = []

		for (const { active, layer, seekTime } of activeLayers) {
			let frame: FrameBuffer | null = null

			try {
				frame = await frameProvider.getFrame(
					active.segment.fragmentId,
					seekTime,
				)
			} catch {
				frame = null
			}

			frames.push({ active, frame, layer })
		}

		ctx.clearRect(0, 0, canvasWidth, canvasHeight)

		for (const { active, frame, layer } of frames) {
			if (
				frame?.canvas &&
				frame.canvas.width > 0 &&
				frame.canvas.height > 0
			) {
				ctx.drawImage(
					frame.canvas,
					0,
					0,
					frame.canvas.width,
					frame.canvas.height,
					0,
					0,
					canvasWidth,
					canvasHeight,
				)
			} else {
				onMissingFragment(
					ctx,
					active.segment.fragmentId,
					layer.zIndex,
					canvasWidth,
					canvasHeight,
				)
			}
		}

		if (!drewSomething && layers.length > 0) {
			drawFallback(ctx, canvasWidth, canvasHeight)
			ctx.fillStyle = "rgba(255, 255, 255, 0.6)"
			ctx.font = "14px sans-serif"
			ctx.textAlign = "center"
			ctx.fillText(
				"No active segment at current time",
				canvasWidth / 2,
				canvasHeight / 2,
			)
		}
	} catch {
		drawFallback(ctx, canvasWidth, canvasHeight)
	}
}
