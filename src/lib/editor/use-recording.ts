import { useCallback, useEffect, useRef, useState } from "react"

import {
	MediaStreamVideoTrackSource,
	Output,
	StreamTarget,
	WebMOutputFormat,
} from "mediabunny"

import { createWebmStream, getWebmSize } from "./raw-frames-directory"

export type RecordingConfig = {
	codec: "vp9"
	fps: number
	quality: number
}

export type RecordingState = {
	elapsedMs: number
	error: string | null
	isRecording: boolean
	recordingDurationSec: number
}

export type RecordingResult = {
	recordingId: string
	size: number
}

const DEFAULT_CONFIG: RecordingConfig = {
	codec: "vp9",
	fps: 30,
	quality: 80,
}

const MAX_BITRATE = 6_250_000

export const bitrateFromQuality = (quality: number): number =>
	Math.round((quality / 100) * MAX_BITRATE)

export const useRecording = () => {
	const [state, setState] = useState<RecordingState>({
		elapsedMs: 0,
		error: null,
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
	const startTimeRef = useRef<number>(0)
	const isRecordingRef = useRef(false)
	const pauseStartTimeRef = useRef<number>(0)
	const pausedRef = useRef(false)

	const setError = useCallback((err: unknown, fallback: string) => {
		setState((prev) => ({
			...prev,
			error: err instanceof Error ? err.message : fallback,
		}))
	}, [])

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
			pauseStartTimeRef.current = 0
			pausedRef.current = false

			const videoTrack = stream.getVideoTracks()[0]

			if (!videoTrack) {
				setError(
					new Error("No video track available"),
					"No video track available",
				)

				return
			}

			try {
				const webmStream = await createWebmStream(
					rootDirHandle,
					projectId,
					recordingId,
				)

				const source = new MediaStreamVideoTrackSource(
					videoTrack,
					{
						bitrate: bitrateFromQuality(configRef.current.quality),
						codec: configRef.current.codec,
					},
					{ frameRate: configRef.current.fps },
				)

				source.errorPromise.catch((err: unknown) => {
					setError(err, "Encoding error")
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
				setError(err, "Failed to start recording")

				return
			}

			startTimeRef.current = performance.now()
			setState((prev) => ({
				...prev,
				elapsedMs: 0,
				error: null,
				isRecording: true,
				recordingDurationSec: 0,
			}))
			isRecordingRef.current = true
		},
		[setError],
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
				} catch (err) {
					outputRef.current = null
					setError(err, "Failed to finalize recording")

					return null
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
		}, [setError])

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
				void outputRef.current.finalize().catch(() => undefined)
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
