import { useCallback, useEffect, useRef, useState } from "react"
import {
	BufferTarget,
	MediaStreamVideoTrackSource,
	Output,
	WebMOutputFormat,
} from "mediabunny"

import { saveFrameToDirectory } from "./raw-frames-directory"

export type RecordingConfig = {
	fps: number
	format: "jpeg" | "png"
	jpegQuality: number
}

export type RecordingState = {
	elapsedMs: number
	error: string | null
	frameCount: number
	isRecording: boolean
	recordingDurationSec: number
}

export const useRecording = () => {
	const [state, setState] = useState<RecordingState>({
		elapsedMs: 0,
		error: null,
		frameCount: 0,
		isRecording: false,
		recordingDurationSec: 0,
	})

	const configRef = useRef<RecordingConfig>({
		format: "jpeg",
		fps: 1,
		jpegQuality: 80,
	})

	const streamRef = useRef<MediaStream | null>(null)
	const dirHandleRef = useRef<FileSystemDirectoryHandle | null>(null)
	const outputRef = useRef<Output | null>(null)
	const startTimeRef = useRef<number>(0)
	const frameCountRef = useRef<number>(0)
	const rafRef = useRef<number>(0)
	const lastFrameTimeRef = useRef<number>(0)
	const canvasRef = useRef<OffscreenCanvas | null>(null)
	const videoRef = useRef<HTMLVideoElement | null>(null)
	const isRecordingRef = useRef(false)
	const isPausedRef = useRef(false)

	const frameLoop = useCallback((timestamp: number) => {
		if (!isRecordingRef.current) return

		if (!isPausedRef.current) {
			const elapsed = timestamp - startTimeRef.current
			const frameInterval = 1000 / configRef.current.fps

			if (timestamp - lastFrameTimeRef.current >= frameInterval) {
				lastFrameTimeRef.current = timestamp

				const video = videoRef.current
				const dirHandle = dirHandleRef.current

				if (video && dirHandle && canvasRef.current) {
					const ctx = canvasRef.current.getContext("2d")

					if (ctx) {
						canvasRef.current.width = video.videoWidth
						canvasRef.current.height = video.videoHeight
						ctx.drawImage(
							video,
							0,
							0,
							canvasRef.current.width,
							canvasRef.current.height,
						)

						const format = configRef.current.format
						const quality = configRef.current.jpegQuality / 100

						canvasRef.current
							.convertToBlob({
								quality,
								type:
									format === "jpeg"
										? "image/jpeg"
										: "image/png",
							})
							.then((blob) => {
								const idx = frameCountRef.current
								frameCountRef.current++

								return saveFrameToDirectory(
									dirHandle,
									idx,
									blob,
									format,
								)
							})
							.catch(() => {
								// frame save failed silently
							})
					}
				}

				setState((prev) => ({
					...prev,
					elapsedMs: elapsed,
					frameCount: frameCountRef.current,
					recordingDurationSec: elapsed / 1000,
				}))
			}
		}

		rafRef.current = requestAnimationFrame(frameLoop)
	}, [])

	const startRecording = useCallback(
		async (
			stream: MediaStream,
			dirHandle: FileSystemDirectoryHandle,
			videoElement: HTMLVideoElement,
			config?: Partial<RecordingConfig>,
		) => {
			if (config) {
				configRef.current = {
					...configRef.current,
					...config,
				}
			}

			streamRef.current = stream
			dirHandleRef.current = dirHandle
			videoRef.current = videoElement
			frameCountRef.current = 0
			lastFrameTimeRef.current = 0

			canvasRef.current = new OffscreenCanvas(640, 480)

			const videoTrack = stream.getVideoTracks()[0]

			if (!videoTrack) {
				setState((prev) => ({
					...prev,
					error: "No video track available",
				}))

				return
			}

			try {
				const source = new MediaStreamVideoTrackSource(videoTrack, {
					bitrate: 5_000_000,
					codec: "vp9",
				})

				source.errorPromise.catch((err: unknown) => {
					setState((prev) => ({
						...prev,
						error:
							err instanceof Error
								? err.message
								: "Encoding error",
					}))
				})

				const output = new Output({
					format: new WebMOutputFormat(),
					target: new BufferTarget(),
				})

				output.addVideoTrack(source)
				outputRef.current = output
				await output.start()
			} catch (err) {
				setState((prev) => ({
					...prev,
					error:
						err instanceof Error
							? err.message
							: "Failed to start recording",
				}))

				return
			}

			startTimeRef.current = performance.now()
			setState((prev) => ({
				...prev,
				elapsedMs: 0,
				error: null,
				frameCount: 0,
				isRecording: true,
				recordingDurationSec: 0,
			}))

			isRecordingRef.current = true

			rafRef.current = requestAnimationFrame(frameLoop)
		},
		[frameLoop],
	)

	const stopRecording = useCallback(async () => {
		isRecordingRef.current = false

		setState((prev) => ({
			...prev,
			isRecording: false,
		}))

		cancelAnimationFrame(rafRef.current)

		if (streamRef.current) {
			streamRef.current.getTracks().forEach((track) => {
				track.stop()
			})
			streamRef.current = null
		}

		let videoBuffer: ArrayBuffer | null = null

		if (outputRef.current) {
			try {
				await outputRef.current.finalize()
				const target = outputRef.current.target as BufferTarget
				videoBuffer = target.buffer
			} catch {
				// finalize failed silently
			}

			outputRef.current = null
		}

		videoRef.current = null
		canvasRef.current = null

		return videoBuffer
	}, [])

	const pauseRecording = useCallback(() => {
		isPausedRef.current = true

		if (streamRef.current) {
			streamRef.current.getVideoTracks().forEach((track) => {
				track.enabled = false
			})
		}
	}, [])

	const resumeRecording = useCallback(() => {
		isPausedRef.current = false

		if (streamRef.current) {
			streamRef.current.getVideoTracks().forEach((track) => {
				track.enabled = true
			})
		}
	}, [])

	const updateConfig = useCallback((config: Partial<RecordingConfig>) => {
		configRef.current = {
			...configRef.current,
			...config,
		}
	}, [])

	useEffect(() => {
		return () => {
			isRecordingRef.current = false
			cancelAnimationFrame(rafRef.current)

			if (streamRef.current) {
				streamRef.current.getTracks().forEach((track) => {
					track.stop()
				})
			}
		}
	}, [])

	return {
		...state,
		pauseRecording,
		resumeRecording,
		startRecording,
		stopRecording,
		updateConfig,
	}
}
