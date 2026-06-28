"use client"

import {
	createContext,
	useCallback,
	useContext,
	useState,
	type ReactNode,
} from "react"
import { useDisclosure } from "@mantine/hooks"
import type { TimelineLayer, TimelineSegment } from "@/lib/editor/types"

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
	projectId: string
	addLayer: () => Promise<void>
	addSegment: (layerId: string, fragmentId: string) => Promise<void>
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
				fragments: initialFragments,
				projectId,
				addLayer,
				addSegment,
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
