import { useCallback, useEffect, useRef, useState } from "react"
import {
	MediaStreamVideoTrackSource,
	Output,
	StreamTarget,
	WebMOutputFormat,
	type VideoSample,
} from "mediabunny"

import {
	saveFrame,
	createWebmStream,
	getWebmSize,
} from "./raw-frames-directory"

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

export type RecordingResult = {
	recordingId: string
	size: number
}

const DEFAULT_CONFIG: RecordingConfig = {
	format: "jpeg",
	fps: 1,
	jpegQuality: 80,
}

export const useRecording = () => {
	const [state, setState] = useState<RecordingState>({
		elapsedMs: 0,
		error: null,
		frameCount: 0,
		isRecording: false,
		recordingDurationSec: 0,
	})

	const [config, setConfig] = useState<RecordingConfig>(DEFAULT_CONFIG)
	const configRef = useRef<RecordingConfig>(DEFAULT_CONFIG)

	const streamRef = useRef<MediaStream | null>(null)
	const rootDirHandleRef = useRef<FileSystemDirectoryHandle | null>(null)
	const projectIdRef = useRef<string>("")
	const recordingIdRef = useRef<string>("")
	const sourceRef = useRef<MediaStreamVideoTrackSource | null>(null)
	const outputRef = useRef<Output | null>(null)
	const canvasRef = useRef<OffscreenCanvas | null>(null)
	const startTimeRef = useRef<number>(0)
	const lastSavedTimeRef = useRef<number>(0)
	const frameCountRef = useRef<number>(0)
	const isRecordingRef = useRef(false)
	const pauseStartTimeRef = useRef<number>(0)
	const pausedRef = useRef(false)

	const saveFrameIfNeeded = useCallback(
		async (sample: VideoSample): Promise<void> => {
			const now = sample.timestamp
			const interval = 1 / configRef.current.fps

			if (now - lastSavedTimeRef.current < interval) return
			lastSavedTimeRef.current = now

			const rootDir = rootDirHandleRef.current
			const projectId = projectIdRef.current
			const recordingId = recordingIdRef.current

			if (!rootDir || !projectId || !recordingId) return

			const canvas = canvasRef.current

			if (!canvas) return

			const ctx = canvas.getContext("2d")

			if (!ctx) return

			try {
				canvas.width = sample.codedWidth
				canvas.height = sample.codedHeight
				sample.draw(ctx, 0, 0, canvas.width, canvas.height)
				const format = configRef.current.format
				const quality = configRef.current.jpegQuality / 100
				const blob = await canvas.convertToBlob({
					quality,
					type: format === "jpeg" ? "image/jpeg" : "image/png",
				})
				const idx = frameCountRef.current
				frameCountRef.current++
				await saveFrame(
					rootDir,
					projectId,
					recordingId,
					idx,
					blob,
					format,
				)
				setState((prev) => ({
					...prev,
					frameCount: frameCountRef.current,
				}))
			} catch {
				// frame save failed silently
			}
		},
		[],
	)

	const startRecording = useCallback(
		async (
			stream: MediaStream,
			rootDirHandle: FileSystemDirectoryHandle,
			projectId: string,
			recordingId: string,
			config?: Partial<RecordingConfig>,
		): Promise<void> => {
			if (config) {
				configRef.current = {
					...configRef.current,
					...config,
				}
				setConfig({ ...configRef.current })
			}

			streamRef.current = stream
			rootDirHandleRef.current = rootDirHandle
			projectIdRef.current = projectId
			recordingIdRef.current = recordingId
			frameCountRef.current = 0
			lastSavedTimeRef.current = -Infinity
			pauseStartTimeRef.current = 0

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
				const webmStream = await createWebmStream(
					rootDirHandle,
					projectId,
					recordingId,
				)

				const source = new MediaStreamVideoTrackSource(videoTrack, {
					bitrate: 5_000_000,
					codec: "vp9",
					onEncodedSample: (sample: VideoSample) => {
						void saveFrameIfNeeded(sample)
					},
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

				sourceRef.current = source

				const target = new StreamTarget(webmStream)

				const output = new Output({
					format: new WebMOutputFormat(),
					target,
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
		},
		[saveFrameIfNeeded],
	)

	const elapsedTimerRef = useRef<ReturnType<typeof setInterval>>(undefined)

	useEffect(() => {
		if (state.isRecording) {
			elapsedTimerRef.current = setInterval(() => {
				if (!isRecordingRef.current || pausedRef.current) return
				setState((prev) => {
					const elapsed = performance.now() - startTimeRef.current

					return {
						...prev,
						elapsedMs: elapsed,
						recordingDurationSec: elapsed / 1000,
					}
				})
			}, 100)
		}

		return () => {
			clearInterval(elapsedTimerRef.current)
		}
	}, [state.isRecording])

	const stopRecording =
		useCallback(async (): Promise<RecordingResult | null> => {
			const rootDir = rootDirHandleRef.current
			const projectId = projectIdRef.current
			const recordingId = recordingIdRef.current

			isRecordingRef.current = false
			setState((prev) => ({
				...prev,
				isRecording: false,
			}))

			if (outputRef.current) {
				try {
					await outputRef.current.finalize()
				} catch {
					// finalize failed silently
				}

				outputRef.current = null
			}

			sourceRef.current = null

			if (streamRef.current) {
				streamRef.current.getTracks().forEach((track) => {
					track.stop()
				})
				streamRef.current = null
			}

			canvasRef.current = null

			if (rootDir && projectId && recordingId) {
				try {
					const size = await getWebmSize(
						rootDir,
						projectId,
						recordingId,
					)

					return { recordingId, size }
				} catch {
					return { recordingId, size: 0 }
				}
			}

			return null
		}, [])

	const pauseRecording = useCallback(() => {
		pausedRef.current = true
		pauseStartTimeRef.current = performance.now()
		sourceRef.current?.pause()
	}, [])

	const resumeRecording = useCallback(() => {
		startTimeRef.current += performance.now() - pauseStartTimeRef.current
		pausedRef.current = false
		sourceRef.current?.resume()
	}, [])

	const updateConfig = useCallback((partial: Partial<RecordingConfig>) => {
		configRef.current = {
			...configRef.current,
			...partial,
		}
		setConfig({ ...configRef.current })
	}, [])

	useEffect(() => {
		return () => {
			isRecordingRef.current = false
			clearInterval(elapsedTimerRef.current)

			if (outputRef.current) {
				void outputRef.current.finalize()
			}
		}
	}, [])

	return {
		...state,
		config,
		pauseRecording,
		resumeRecording,
		startRecording,
		stopRecording,
		updateConfig,
	}
}
