import "@testing-library/jest-dom"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MantineProvider } from "@mantine/core"
import { afterEach, describe, expect, it, vi } from "bun:test"

if (typeof globalThis.ShadowRoot === "undefined") {
	// @ts-expect-error test environment doesn't have ShadowRoot
	globalThis.ShadowRoot = class {}
}

import { EditorContext, type EditorMode } from "./editor-context"
import { SidePane } from "./side-pane"

vi.mock("next-intl", () => ({
	useTranslations: () => (key: string) => key,
}))

vi.mock("@mantine/hooks", () => ({
	useMediaQuery: () => true,
}))

const mockSetSelectedCameraId = vi.fn()

const mockCameras = [
	{
		deviceId: "cam-1",
		groupId: "group-1",
		kind: "videoinput",
		label: "Camera One",
		toJSON: () => ({}),
	},
	{
		deviceId: "cam-2",
		groupId: "group-1",
		kind: "videoinput",
		label: "Camera Two",
		toJSON: () => ({}),
	},
] as MediaDeviceInfo[]

const mockAddLayer = vi.fn()
const mockAddSegment = vi.fn()
const mockSetFragments = vi.fn()
const mockStartRecording = vi.fn()
const mockStopRecording = vi.fn()
const mockPauseRecording = vi.fn()
const mockResumeRecording = vi.fn()
const mockSetRawFramesDirectory = vi.fn()
const mockUpdateRecordingConfig = vi.fn()

const defaultContextValue = {
	mode: "capture" as EditorMode,
	selectedCameraId: "",
	setSelectedCameraId: mockSetSelectedCameraId,
	availableCameras: mockCameras,
	setAvailableCameras: vi.fn(),
	cameraError: null as string | null,
	setCameraError: vi.fn(),
	sidePaneOpen: true,
	toggleSidePane: vi.fn(),
	closeSidePane: vi.fn(),
	activeTab: "settings" as const,
	setActiveTab: vi.fn(),
	timelineExpanded: false,
	toggleTimeline: vi.fn(),
	setMode: vi.fn(),
	layers: [],
	setLayers: vi.fn(),
	fragments: [],
	setFragments: mockSetFragments,
	projectId: "test-project",
	addLayer: mockAddLayer,
	addSegment: mockAddSegment,
	isRecording: false,
	recordingLayerId: null,
	isPaused: false,
	recordingElapsedMs: 0,
	recordingFrameCount: 0,
	recordingError: null,
	recordingDurationSec: 0,
	rawFramesDirectoryHandle: null,
	rawFramesDirectoryName: null,
	setRawFramesDirectory: mockSetRawFramesDirectory,
	wiggleDirectoryKey: 0,
	notifyNoDirectory: vi.fn(),
	pendingRecordingLayerId: null,
	setPendingRecordingLayerId: vi.fn(),
	clearPendingRecordingLayerId: vi.fn(),
	startRecording: mockStartRecording,
	stopRecording: mockStopRecording,
	pauseRecording: mockPauseRecording,
	resumeRecording: mockResumeRecording,
	recordingConfig: { fps: 1, format: "jpeg" as const, jpegQuality: 80 },
	updateRecordingConfig: mockUpdateRecordingConfig,
}

const renderWithContext = (
	overrides: Partial<typeof defaultContextValue> = {},
) =>
	render(
		<MantineProvider>
			<EditorContext.Provider
				value={{ ...defaultContextValue, ...overrides }}>
				<SidePane />
			</EditorContext.Provider>
		</MantineProvider>,
	)

afterEach(() => {
	cleanup()
	vi.clearAllMocks()
})

describe("SidePane camera list", () => {
	it("shows a None option alongside camera options", () => {
		renderWithContext()

		const select = screen.getByRole("combobox", {
			name: "camera.selectCamera",
		})
		expect(select).toBeInTheDocument()
		const options = screen.getAllByRole("option")
		expect(options).toHaveLength(3)
		expect(options[0]).toHaveTextContent("camera.none")
		expect(options[1]).toHaveTextContent("Camera One")
		expect(options[2]).toHaveTextContent("Camera Two")
	})

	it("selects None when None is chosen", async () => {
		const user = userEvent.setup()
		renderWithContext()

		const select = screen.getByRole("combobox", {
			name: "camera.selectCamera",
		})
		await user.selectOptions(select, "")

		expect(mockSetSelectedCameraId).toHaveBeenCalledWith("")
	})

	it("selects a camera when it is chosen", async () => {
		const user = userEvent.setup()
		renderWithContext()

		const select = screen.getByRole("combobox", {
			name: "camera.selectCamera",
		})
		await user.selectOptions(select, "cam-2")

		expect(mockSetSelectedCameraId).toHaveBeenCalledWith("cam-2")
	})

	it("has None selected when no camera is chosen", () => {
		renderWithContext()

		const select = screen.getByRole("combobox", {
			name: "camera.selectCamera",
		}) as HTMLSelectElement
		expect(select.value).toBe("")
	})

	it("has the active camera selected", () => {
		renderWithContext({ selectedCameraId: "cam-1" })

		const select = screen.getByRole("combobox", {
			name: "camera.selectCamera",
		}) as HTMLSelectElement
		expect(select.value).toBe("cam-1")
	})

	it("shows camera settings with no cameras available", () => {
		renderWithContext({ availableCameras: [] })

		const select = screen.getByRole("combobox", {
			name: "camera.selectCamera",
		})
		expect(select).toBeInTheDocument()
		expect(screen.getByText("camera.selectCamera")).toBeInTheDocument()
		const options = screen.getAllByRole("option")
		expect(options).toHaveLength(1)
		expect(options[0]).toHaveTextContent("camera.none")
	})
})
