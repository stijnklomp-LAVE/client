"use client"

import { useRef, useEffect } from "react"

import { DecoderPool } from "./decoder-pool"
import {
	composeFrame,
	defaultMissingFragment,
	type FrameBuffer,
	type FrameProvider,
	type GenericLayer,
} from "./compositor"
import {
	resolveFragmentsMedia,
	type FragmentDescriptor,
} from "./fragment-media"

type UseCompositorOptions = {
	layers: GenericLayer[]
	fragments: FragmentDescriptor[]
	projectId: string
	rootDirHandle: FileSystemDirectoryHandle | null
	currentTime: number
}

type UseCompositorResult = {
	canvasRef: React.RefObject<HTMLCanvasElement | null>
}

export const useCompositor = ({
	layers,
	fragments,
	projectId,
	rootDirHandle,
	currentTime,
}: UseCompositorOptions): UseCompositorResult => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null)
	const decoderRef = useRef<DecoderPool | null>(null)
	const rafRef = useRef<number>(0)

	const hasContent = layers.some((l) => l.segments.length > 0)
	const layersRef = useRef(layers)
	const currentTimeRef = useRef(currentTime)

	useEffect(() => {
		layersRef.current = layers
	}, [layers])

	useEffect(() => {
		currentTimeRef.current = currentTime
	}, [currentTime])

	useEffect(() => {
		decoderRef.current ??= new DecoderPool(10)
	}, [])

	useEffect(() => {
		if (!rootDirHandle || fragments.length === 0) return

		let cancelled = false

		const init = async () => {
			try {
				const results = await resolveFragmentsMedia(
					fragments,
					projectId,
					rootDirHandle,
				)

				if (cancelled) return

				for (const [id, result] of results) {
					if (result.webmFile && decoderRef.current) {
						void decoderRef.current.open(id, result.webmFile)
					}
				}
			} catch {
				// will retry on next prop change
			}
		}

		void init()

		return () => {
			cancelled = true
		}
	}, [rootDirHandle, fragments, projectId])

	useEffect(() => {
		const canvas = canvasRef.current

		if (!canvas || !hasContent) return

		const ctx = canvas.getContext("2d")

		if (!ctx) return

		const syncSize = () => {
			const parent = canvas.parentElement

			if (!parent) return

			const rect = parent.getBoundingClientRect()
			const w = Math.round(rect.width)
			const h = Math.round(rect.height)

			if (w < 1 || h < 1) return

			if (canvas.width !== w) canvas.width = w

			if (canvas.height !== h) canvas.height = h
		}

		syncSize()

		const observer = new ResizeObserver(() => {
			syncSize()
		})

		const parent = canvas.parentElement

		if (parent) {
			observer.observe(parent)
		}

		const FRAME_DURATION = 1 / 30
		const frameCache = new Map<
			string,
			{ quantizedTime: number; frame: FrameBuffer }
		>()

		const quantize = (t: number): number =>
			Math.floor(t / FRAME_DURATION) * FRAME_DURATION

		const frameProvider: FrameProvider = {
			getFrame: async (fragmentId, seekTime) => {
				const qtime = quantize(seekTime)
				const cached = frameCache.get(fragmentId)

				if (cached?.quantizedTime === qtime) {
					return cached.frame
				}

				try {
					const frame =
						(await decoderRef.current?.seekToFrame(
							fragmentId,
							qtime,
						)) ?? null

					if (frame) {
						frameCache.set(fragmentId, {
							frame,
							quantizedTime: qtime,
						})

						return frame
					}

					return cached?.frame ?? null
				} catch {
					return cached?.frame ?? null
				}
			},
		}

		const tick = () => {
			const layersNow = layersRef.current
			const timeNow = currentTimeRef.current

			syncSize()

			if (canvas.width < 1 || canvas.height < 1) {
				rafRef.current = requestAnimationFrame(tick)

				return
			}

			composeFrame(
				ctx,
				canvas.width,
				canvas.height,
				layersNow,
				timeNow,
				frameProvider,
				defaultMissingFragment,
			).catch(() => void 0)

			rafRef.current = requestAnimationFrame(tick)
		}

		rafRef.current = requestAnimationFrame(tick)

		return () => {
			cancelAnimationFrame(rafRef.current)
			frameCache.clear()
			observer.disconnect()
		}
	}, [hasContent])

	useEffect(() => {
		return () => {
			decoderRef.current?.closeAll()
			decoderRef.current = null
		}
	}, [])

	return { canvasRef }
}
