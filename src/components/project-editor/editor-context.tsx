"use client"

import {
	createContext,
	useCallback,
	useContext,
	useRef,
	useState,
	type ReactNode,
} from "react"
import { useDisclosure } from "@mantine/hooks"
import type { TimelineLayer, TimelineSegment } from "@/lib/editor/types"
import { useRecording, type RecordingConfig } from "@/lib/editor/use-recording"

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
	addLayer: () => Promise<void>
	addSegment: (layerId: string, fragmentId: string) => Promise<void>
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
	startRecording: (layerId: string) => Promise<void>
	stopRecording: () => Promise<void>
	pauseRecording: () => void
	resumeRecording: () => void
	recordingConfig: RecordingConfig
	updateRecordingConfig: (config: Partial<RecordingConfig>) => void
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
	const [sidePaneOpen, { toggle: toggleSidePane, close: closeSidePane }] =
		useDisclosure(false)
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
	const [recordingLayerId, setRecordingLayerId] = useState<string | null>(
		null,
	)
	const [isPaused, setIsPaused] = useState(false)

	const recording = useRecording()
	const streamRef = useRef<MediaStream | null>(null)
	const videoRef = useRef<HTMLVideoElement | null>(null)

	const addLayer = useCallback(async () => {
		const res = await fetch(`/api/projects/${projectId}/layers`, {
			method: "POST",
		})

		if (!res.ok) {
			console.error(
				`Failed to create layer: ${res.status} ${JSON.stringify(await res.json())}`,
			)
			return
		}

		const { layer } = (await res.json()) as { layer: TimelineLayer }

		setLayers((prev) => [...prev, layer])
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

	const setMode = useCallback(
		(nextMode: EditorMode) => {
			setModeState(nextMode)
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
		},
		[],
	)

	const startRecording = useCallback(
		async (layerId: string) => {
			try {
				const stream = await navigator.mediaDevices.getUserMedia({
					video: {
						deviceId: selectedCameraId
							? { exact: selectedCameraId }
							: undefined,
					},
					audio: false,
				})

				streamRef.current = stream

				const video = document.createElement("video")
				video.srcObject = stream
				video.muted = true
				video.playsInline = true
				await video.play()
				videoRef.current = video

				setRecordingLayerId(layerId)

				if (!rawFramesDirectoryHandle) {
					throw new Error("No raw frames directory configured")
				}

				setModeState("capture")

				await recording.startRecording(
					stream,
					rawFramesDirectoryHandle,
					video,
				)
			} catch (err) {
				setCameraError(
					err instanceof Error
						? err.message
						: "Failed to start recording",
				)
			}
		},
		[selectedCameraId, rawFramesDirectoryHandle, recording, setModeState],
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

		const videoBuffer = await recording.stopRecording()

		const layerId = recordingLayerId
		setRecordingLayerId(null)
		setModeState("editing")

		if (videoBuffer && layerId) {
			try {
				const fragmentName = `Recording ${new Date().toLocaleTimeString()}`
				const res = await fetch(
					`/api/projects/${projectId}/fragments`,
					{
						body: JSON.stringify({
							duration: recording.recordingDurationSec,
							filePath: `recording-${Date.now()}.webm`,
							name: fragmentName,
							size: videoBuffer.byteLength,
						}),
						// eslint-disable-next-line @typescript-eslint/naming-convention
						headers: { "Content-Type": "application/json" },
						method: "POST",
					},
				)

				if (!res.ok) {
					console.error("Failed to create fragment")
					return
				}

				const { fragment } = (await res.json()) as {
					fragment: ProjectFragment
				}

				setFragments((prev) => [...prev, fragment])

				await addSegment(layerId, fragment.id)
			} catch (err) {
				console.error("Failed to save recording", err)
			}
		}
	}, [recording, recordingLayerId, projectId, addSegment, setModeState])

	const pauseRecording = useCallback(() => {
		if (streamRef.current) {
			streamRef.current.getVideoTracks().forEach((track) => {
				track.enabled = false
			})
		}
		setIsPaused(true)
	}, [])

	const resumeRecording = useCallback(() => {
		if (streamRef.current) {
			streamRef.current.getVideoTracks().forEach((track) => {
				track.enabled = true
			})
		}
		setIsPaused(false)
	}, [])

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
				startRecording,
				stopRecording,
				pauseRecording,
				resumeRecording,
				recordingConfig: {
					fps: 1,
					format: "jpeg",
					jpegQuality: 80,
				},
				updateRecordingConfig: recording.updateConfig,
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
