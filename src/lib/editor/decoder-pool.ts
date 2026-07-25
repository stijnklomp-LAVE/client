import { Input, BlobSource, CanvasSink, ALL_FORMATS } from "mediabunny"

export type CanvasFrame = {
	canvas: OffscreenCanvas | HTMLCanvasElement
	timestamp: number
	duration: number
}

type DecoderEntry = {
	canvasSink: CanvasSink
	generator: AsyncGenerator<CanvasFrame> | null
	input: Input
	lastAccess: number
}

export class DecoderPool {
	private entries = new Map<string, DecoderEntry>()
	private maxSize: number

	constructor(maxSize = 10) {
		this.maxSize = maxSize
	}

	get size(): number {
		return this.entries.size
	}

	async open(fragmentId: string, webmFile: File): Promise<void> {
		if (this.entries.has(fragmentId)) return

		this.evictIfNeeded()

		const input = new Input({
			formats: ALL_FORMATS,
			source: new BlobSource(webmFile),
		})

		const videoTrack = await input.getPrimaryVideoTrack()

		if (!videoTrack) throw new Error("No video track available")

		const canvasSink = new CanvasSink(videoTrack, { poolSize: 2 })

		this.entries.set(fragmentId, {
			canvasSink,
			generator: null,
			input,
			lastAccess: Date.now(),
		})
	}

	async seekToFrame(
		fragmentId: string,
		timestamp: number,
	): Promise<CanvasFrame | null> {
		const entry = this.entries.get(fragmentId)

		if (!entry) return null

		entry.lastAccess = Date.now()

		try {
			return await entry.canvasSink.getCanvas(timestamp)
		} catch {
			return null
		}
	}

	startSequential(fragmentId: string, startTimestamp: number): void {
		const entry = this.entries.get(fragmentId)

		if (!entry) return

		entry.lastAccess = Date.now()
		entry.generator = entry.canvasSink.canvases(
			startTimestamp,
		) as AsyncGenerator<CanvasFrame>
	}

	async nextFrame(fragmentId: string): Promise<CanvasFrame | null> {
		const entry = this.entries.get(fragmentId)

		if (!entry?.generator) return null

		entry.lastAccess = Date.now()

		const result = await entry.generator.next()

		if (result.done ?? false) {
			entry.generator = null

			return null
		}

		return result.value
	}

	close(fragmentId: string): void {
		const entry = this.entries.get(fragmentId)

		if (!entry) return
		entry.input.dispose()
		this.entries.delete(fragmentId)
	}

	closeAll(): void {
		for (const id of this.entries.keys()) {
			this.close(id)
		}
	}

	private evictIfNeeded(): void {
		while (this.entries.size >= this.maxSize) {
			let oldestId: string | null = null
			let oldestAccess = Infinity

			for (const [id, entry] of this.entries) {
				if (entry.lastAccess < oldestAccess) {
					oldestAccess = entry.lastAccess
					oldestId = id
				}
			}

			if (oldestId) {
				this.close(oldestId)
			}
		}
	}
}
