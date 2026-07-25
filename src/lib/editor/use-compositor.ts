"use client"

import { useRef, useEffect, useCallback, type RefObject } from "react"
import { logger } from "@/lib/logger"
import { DecoderPool } from "./decoder-pool"
import {
	composeFrame,
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
	isPlaying: boolean
	playbackSpeed: number
	duration: number
	onTimeUpdate?: (time: number) => void
	onPlaybackEnd?: () => void
}

type UseCompositorResult = {
	canvasRef: RefObject<HTMLCanvasElement | null>
	seek: (time: number) => void
}

export const useCompositor = ({
	layers,
	fragments,
	projectId,
	rootDirHandle,
	isPlaying,
	playbackSpeed,
	duration,
	onTimeUpdate,
	onPlaybackEnd,
}: UseCompositorOptions): UseCompositorResult => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null)
	const decoderRef = useRef<DecoderPool | null>(null)
	const seekRef = useRef<((time: number) => void) | null>(null)

	const layersRef = useRef(layers)
	const isPlayingRef = useRef(isPlaying)
	const playbackSpeedRef = useRef(playbackSpeed)
	const durationRef = useRef(duration)
	const onTimeUpdateRef = useRef(onTimeUpdate)
	const onPlaybackEndRef = useRef(onPlaybackEnd)

	useEffect(() => {
		layersRef.current = layers
		isPlayingRef.current = isPlaying
		playbackSpeedRef.current = playbackSpeed
		durationRef.current = duration
		onTimeUpdateRef.current = onTimeUpdate
		onPlaybackEndRef.current = onPlaybackEnd
	}, [
		layers,
		isPlaying,
		playbackSpeed,
		duration,
		onTimeUpdate,
		onPlaybackEnd,
	])

	const hasContent = layers.some((l) => l.segments.length > 0)

	useEffect(() => {
		decoderRef.current ??= new DecoderPool(10)

		return () => {
			decoderRef.current?.closeAll()
			decoderRef.current = null
		}
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
						await decoderRef.current.open(id, result.webmFile)
					}
				}
			} catch (err: unknown) {
				logger.error(err, "Failed to open fragment decoders")
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

		let rafId: number
		let lastTime = performance.now()
		let currentTime = 0

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

		seekRef.current = (time: number) => {
			currentTime = Math.max(0, Math.min(time, durationRef.current))
			lastTime = performance.now()
			onTimeUpdateRef.current?.(currentTime)
		}

		const frameProvider: FrameProvider = {
			getFrame: async (fragmentId, seekTime) => {
				try {
					return (
						(await decoderRef.current?.seekToFrame(
							fragmentId,
							seekTime,
						)) ?? null
					)
				} catch {
					return null
				}
			},
		}

		const tick = (now: number) => {
			syncSize()

			if (canvas.width < 1 || canvas.height < 1) {
				rafId = requestAnimationFrame(tick)

				return
			}

			if (isPlayingRef.current && currentTime < durationRef.current) {
				const delta =
					((now - lastTime) / 1000) * playbackSpeedRef.current
				currentTime = Math.min(currentTime + delta, durationRef.current)

				if (currentTime >= durationRef.current) {
					isPlayingRef.current = false
					onPlaybackEndRef.current?.()
				}

				onTimeUpdateRef.current?.(currentTime)
			}

			lastTime = now

			composeFrame(
				ctx,
				canvas.width,
				canvas.height,
				layersRef.current,
				currentTime,
				frameProvider,
				(_ctx, _fragmentId, _zIndex, width, height) => {
					const hue = (currentTime * 60) % 360
					_ctx.fillStyle = `hsl(${hue}, 70%, 50%)`
					_ctx.fillRect(0, 0, width, height)
				},
			).catch((err: unknown) => {
				logger.error(err, "composeFrame failed")
			})

			rafId = requestAnimationFrame(tick)
		}

		rafId = requestAnimationFrame(tick)

		return () => {
			cancelAnimationFrame(rafId)
			observer.disconnect()
		}
	}, [hasContent])

	const seek = useCallback((time: number) => seekRef.current?.(time), [])

	return { canvasRef, seek }
}
