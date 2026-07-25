"use client"

import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useRef,
	useState,
	type ReactNode,
} from "react"
import { useDisclosure } from "@mantine/hooks"
import { notifications } from "@mantine/notifications"
import { useTranslations } from "next-intl"
import type { TimelineLayer, TimelineSegment } from "@/lib/editor/types"
import { logger } from "@/lib/logger"
import { useRecording, type RecordingConfig } from "@/lib/editor/use-recording"
import { computeDuration } from "@/lib/editor/compositor"
import {
	getPersistedDirectoryHandle,
	getStoredDirectoryName,
	setStoredDirectoryName,
} from "@/lib/editor/raw-frames-directory"

const STORAGE_PREFIX = "editor."

const getStored = <T,>(key: string, fallback: T): T => {
	if (typeof window === "undefined") return fallback
	try {
		const raw = localStorage.getItem(STORAGE_PREFIX + key)
		if (raw !== null) return JSON.parse(raw) as T
	} catch {
		/* ignore */
	}
	return fallback
}

const setStored = <T,>(key: string, value: T): void => {
	try {
		localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value))
	} catch {
		/* ignore */
	}
}

export type EditorMode = "capture" | "editing"

export type TabId = "settings" | "timeline" | "styling"

export type ProjectFragment = {
	createdAt: string
	duration: number | null
	filePath: string
	id: string
	name: string
	size: number
}

interface EditorContextValue {
	sidePaneOpen: boolean
	toggleSidePane: () => void
	closeSidePane: () => void
	activeTab: TabId
	setActiveTab: (tab: TabId) => void
	timelineExpanded: boolean
	toggleTimeline: () => void
	mode: EditorMode
	setMode: (mode: EditorMode) => void
	selectedCameraId: string
	setSelectedCameraId: (deviceId: string) => void
	availableCameras: MediaDeviceInfo[]
	setAvailableCameras: (cameras: MediaDeviceInfo[]) => void
	cameraError: string | null
	setCameraError: (error: string | null) => void
	layers: TimelineLayer[]
	setLayers: (layers: TimelineLayer[]) => void
	fragments: ProjectFragment[]
	setFragments: (fragments: ProjectFragment[]) => void
	projectId: string
	addLayer: () => Promise<TimelineLayer | null>
	addSegment: (layerId: string, fragmentId: string) => Promise<void>
	deleteLayer: (layerId: string) => Promise<boolean>
	isRecording: boolean
	recordingLayerId: string | null
	isPaused: boolean
	recordingElapsedMs: number
	recordingFrameCount: number
	recordingError: string | null
	recordingDurationSec: number
	rawFramesDirectoryHandle: FileSystemDirectoryHandle | null
	rawFramesDirectoryName: string | null
	setRawFramesDirectory: (handle: FileSystemDirectoryHandle | null) => void
	wiggleDirectoryKey: number
	notifyNoDirectory: () => void
	pendingRecordingLayerId: string | null
	setPendingRecordingLayerId: (layerId: string) => void
	clearPendingRecordingLayerId: () => void
	startRecording: (
		layerId: string | null,
		stream?: MediaStream,
	) => Promise<void>
	setRecordingLayerId: (layerId: string | null) => void
	stopRecording: () => Promise<void>
	pauseRecording: () => void
	resumeRecording: () => void
	recordingConfig: RecordingConfig
	updateRecordingConfig: (config: Partial<RecordingConfig>) => void
	currentTime: number
	duration: number
	isPlaying: boolean
	playbackSpeed: number
	play: () => void
	pause: () => void
	seek: (time: number) => void
	setPlaybackSpeed: (speed: number) => void
	onTimeUpdate: (time: number) => void
	onPlaybackEnd: () => void
	seekImplRef: React.MutableRefObject<((time: number) => void) | null>
}

export const EditorContext = createContext<EditorContextValue | null>(null)

export const EditorProvider = ({
	children,
	initialLayers,
	initialFragments,
	projectId,
}: {
	children: ReactNode
	initialLayers: TimelineLayer[]
	initialFragments: ProjectFragment[]
	projectId: string
}): React.JSX.Element => {
	const translations = useTranslations("editor")
	const [
		sidePaneOpen,
		{
			toggle: toggleSidePaneRaw,
			close: closeSidePaneRaw,
			open: openSidePane,
		},
	] = useDisclosure(false)
	const toggleSidePane = useCallback(() => {
		toggleSidePaneRaw()
		setStored("sidePaneOpen", !sidePaneOpen)
	}, [toggleSidePaneRaw, sidePaneOpen])
	const closeSidePane = useCallback(() => {
		closeSidePaneRaw()
		setStored("sidePaneOpen", false)
	}, [closeSidePaneRaw])

	const [activeTab, setActiveTab] = useState<TabId>("settings")
	const [timelineExpanded, { toggle: toggleTimeline }] = useDisclosure(false)
	const [mode, setModeState] = useState<EditorMode>("editing")
	const [selectedCameraId, setSelectedCameraId] = useState<string>("")
	const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>(
		[],
	)
	const [cameraError, setCameraError] = useState<string | null>(null)
	const [layers, setLayers] = useState<TimelineLayer[]>(initialLayers)
	const [fragments, setFragments] =
		useState<ProjectFragment[]>(initialFragments)
	const [rawFramesDirectoryHandle, setRawFramesDirectoryHandle] =
		useState<FileSystemDirectoryHandle | null>(null)
	const [rawFramesDirectoryName, setRawFramesDirectoryName] = useState<
		string | null
	>(null)
	const [wiggleDirectoryKey, setWiggleDirectoryKey] = useState(0)

	const notifyNoDirectory = useCallback(() => {
		notifications.show({
			color: "red",
			message: translations("recording.noDirectory"),
			title: "No directory configured",
		})
		setWiggleDirectoryKey((k) => k + 1)
	}, [translations])

	useEffect(() => {
		if (getStored("sidePaneOpen", false)) openSidePane()
		const storedMode = getStored<EditorMode>("mode", "editing")
		if (storedMode !== "editing") {
			setTimeout(() => setModeState(storedMode))
		}

		getPersistedDirectoryHandle().then((handle) => {
			if (handle) {
				setRawFramesDirectoryHandle(handle)
				setRawFramesDirectoryName(handle.name)
				setStoredDirectoryName(handle.name)
			} else {
				const prevName = getStoredDirectoryName()
				if (prevName) {
					if (initialFragments.length > 0) {
						notifications.show({
							color: "yellow",
							message: translations("recording.directoryNeeded", {
								name: prevName,
							}),
							title: translations(
								"recording.directoryNeededTitle",
							),
						})
					}
				}
			}
		})
	}, [openSidePane, initialFragments.length, translations, notifyNoDirectory])
	const [recordingLayerId, setRecordingLayerIdState] = useState<
		string | null
	>(null)

	const setRecordingLayerId = useCallback(
		(layerId: string | null) => setRecordingLayerIdState(layerId),
		[setRecordingLayerIdState],
	)
	const [isPaused, setIsPaused] = useState(false)
	const [pendingRecordingLayerId, setPendingRecordingLayerIdState] = useState<
		string | null
	>(null)

	const setPendingRecordingLayerId = useCallback(
		(layerId: string) => setPendingRecordingLayerIdState(layerId),
		[],
	)
	const clearPendingRecordingLayerId = useCallback(
		() => setPendingRecordingLayerIdState(null),
		[],
	)

	const recording = useRecording()
	const streamRef = useRef<MediaStream | null>(null)
	const videoRef = useRef<HTMLVideoElement | null>(null)

	const [currentTime, setCurrentTime] = useState(0)
	const [isPlaying, setIsPlaying] = useState(false)
	const [playbackSpeed, setPlaybackSpeed] = useState(1)
	const seekImplRef = useRef<((time: number) => void) | null>(null)

	const duration = useMemo(() => computeDuration(layers), [layers])

	const play = useCallback(() => {
		if (currentTime >= duration) {
			if (seekImplRef.current) {
				seekImplRef.current(0)
			}
			setCurrentTime(0)
		}
		setIsPlaying(true)
	}, [currentTime, duration])

	const pause = useCallback(() => setIsPlaying(false), [])

	const seek = useCallback(
		(time: number) => {
			if (seekImplRef.current) {
				seekImplRef.current(time)
			} else {
				setCurrentTime(Math.max(0, Math.min(time, duration)))
			}
		},
		[duration],
	)

	const onTimeUpdate = useCallback((time: number) => {
		setCurrentTime(time)
	}, [])

	const onPlaybackEnd = useCallback(() => {
		setIsPlaying(false)
	}, [])

	const addLayer = useCallback(async (): Promise<TimelineLayer | null> => {
		const res = await fetch(`/api/projects/${projectId}/layers`, {
			method: "POST",
		})

		if (!res.ok) {
			logger.error(
				`Failed to create layer: ${res.status} ${JSON.stringify(await res.json())}`,
			)
			return null
		}

		const { layer } = (await res.json()) as { layer: TimelineLayer }

		setLayers((prev) => [...prev, layer])

		return layer
	}, [projectId])

	const addSegment = useCallback(
		async (layerId: string, fragmentId: string) => {
			const res = await fetch(
				`/api/projects/${projectId}/layers/${layerId}/segments`,
				{
					body: JSON.stringify({ fragmentId }),
					// eslint-disable-next-line @typescript-eslint/naming-convention
					headers: { "Content-Type": "application/json" },
					method: "POST",
				},
			)

			if (!res.ok) return

			const { segment } = (await res.json()) as {
				segment: TimelineSegment
			}

			setLayers((prev) =>
				prev.map((l) =>
					l.id === layerId
						? { ...l, segments: [...l.segments, segment] }
						: l,
				),
			)
		},
		[projectId],
	)

	const deleteLayer = useCallback(
		async (layerId: string): Promise<boolean> => {
			const res = await fetch(
				`/api/projects/${projectId}/layers/${layerId}`,
				{ method: "DELETE" },
			)

			if (!res.ok) return false

			setLayers((prev) => prev.filter((l) => l.id !== layerId))

			return true
		},
		[projectId],
	)

	const setMode = useCallback(
		(nextMode: EditorMode) => {
			setModeState(nextMode)
			setStored("mode", nextMode)
			if (nextMode === "capture" && activeTab === "styling") {
				setActiveTab("settings")
			}
		},
		[activeTab],
	)

	const setRawFramesDirectory = useCallback(
		(handle: FileSystemDirectoryHandle | null) => {
			setRawFramesDirectoryHandle(handle)
			setRawFramesDirectoryName(handle?.name ?? null)
			setStoredDirectoryName(handle?.name ?? null)
		},
		[],
	)

	const startRecording = useCallback(
		async (layerId: string | null, stream?: MediaStream) => {
			try {
				setIsPaused(false)

				if (
					!stream ||
					stream
						.getVideoTracks()
						.every((track) => track.readyState !== "live")
				) {
					stream = await navigator.mediaDevices.getUserMedia({
						video: {
							deviceId: selectedCameraId
								? { exact: selectedCameraId }
								: undefined,
						},
						audio: false,
					})
				}

				streamRef.current = stream
				clearPendingRecordingLayerId()

				const video = document.createElement("video")
				video.srcObject = stream
				video.muted = true
				video.playsInline = true
				await video.play()
				videoRef.current = video

				if (layerId !== null) {
					setRecordingLayerIdState(layerId)
				}

				if (!rawFramesDirectoryHandle) {
					notifyNoDirectory()
					return
				}

				setMode("capture")

				const recordingId = crypto.randomUUID()

				await recording.startRecording(
					stream,
					rawFramesDirectoryHandle,
					projectId,
					recordingId,
				)
			} catch (err) {
				setCameraError(
					err instanceof Error
						? err.message
						: "Failed to start recording",
				)
			}
		},
		[
			selectedCameraId,
			rawFramesDirectoryHandle,
			projectId,
			recording,
			setMode,
			clearPendingRecordingLayerId,
			notifyNoDirectory,
			setIsPaused,
		],
	)

	const stopRecording = useCallback(async () => {
		if (streamRef.current) {
			streamRef.current.getTracks().forEach((track) => track.stop())
			streamRef.current = null
		}

		if (videoRef.current) {
			videoRef.current.pause()
			videoRef.current.srcObject = null
			videoRef.current = null
		}

		const result = await recording.stopRecording()

		const layerId = recordingLayerId
		setRecordingLayerId(null)
		setMode("editing")

		if (result && layerId) {
			try {
				const fragmentName = new Date().toLocaleTimeString()
				const res = await fetch(
					`/api/projects/${projectId}/fragments`,
					{
						body: JSON.stringify({
							duration: recording.recordingDurationSec,
							filePath: result.recordingId,
							name: fragmentName,
							size: result.size,
						}),
						// eslint-disable-next-line @typescript-eslint/naming-convention
						headers: { "Content-Type": "application/json" },
						method: "POST",
					},
				)

				if (!res.ok) {
					logger.error("Failed to create fragment")
					return
				}

				const { fragment } = (await res.json()) as {
					fragment: ProjectFragment
				}

				setFragments((prev) => [...prev, fragment])

				await addSegment(layerId, fragment.id)
			} catch (err) {
				logger.error("Failed to save recording", err)
			}
		}
	}, [
		recording,
		recordingLayerId,
		projectId,
		addSegment,
		setMode,
		setRecordingLayerId,
	])

	const pauseRecording = useCallback(() => {
		recording.pauseRecording()
		setIsPaused(true)
	}, [recording])

	const resumeRecording = useCallback(() => {
		recording.resumeRecording()
		setIsPaused(false)
	}, [recording])

	return (
		<EditorContext.Provider
			value={{
				sidePaneOpen,
				toggleSidePane,
				closeSidePane,
				activeTab,
				setActiveTab,
				timelineExpanded,
				toggleTimeline,
				mode,
				setMode,
				selectedCameraId,
				setSelectedCameraId,
				availableCameras,
				setAvailableCameras,
				cameraError,
				setCameraError,
				layers,
				setLayers,
				fragments,
				setFragments,
				projectId,
				addLayer,
				addSegment,
				deleteLayer,
				isRecording: recording.isRecording,
				recordingLayerId,
				isPaused,
				recordingElapsedMs: recording.elapsedMs,
				recordingFrameCount: recording.frameCount,
				recordingError: recording.error,
				recordingDurationSec: recording.recordingDurationSec,
				rawFramesDirectoryHandle,
				rawFramesDirectoryName,
				setRawFramesDirectory,
				wiggleDirectoryKey,
				notifyNoDirectory,
				pendingRecordingLayerId,
				setPendingRecordingLayerId,
				clearPendingRecordingLayerId,
				startRecording,
				setRecordingLayerId,
				stopRecording,
				pauseRecording,
				resumeRecording,
				recordingConfig: recording.config,
				updateRecordingConfig: recording.updateConfig,
				currentTime,
				duration,
				isPlaying,
				playbackSpeed,
				play,
				pause,
				seek,
				setPlaybackSpeed,
				onTimeUpdate,
				onPlaybackEnd,
				seekImplRef,
			}}>
			{children}
		</EditorContext.Provider>
	)
}

EditorProvider.displayName = "EditorProvider"

export const useEditorContext = (): EditorContextValue => {
	const ctx = useContext(EditorContext)
	if (!ctx) {
		throw new Error(
			"useEditorContext must be used within an EditorProvider",
		)
	}
	return ctx
}
