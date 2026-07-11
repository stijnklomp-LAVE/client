import "@testing-library/jest-dom"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MantineProvider } from "@mantine/core"
import { afterEach, beforeEach, describe, expect, it, vi } from "bun:test"

import {
	EditorContext,
	type EditorMode,
	type ProjectFragment,
} from "./editor-context"
import { VideoViewer } from "./video-viewer"
import type { TimelineLayer, TimelineSegment } from "@/lib/editor/types"

vi.mock("next-intl", () => ({
	useTranslations: () => (key: string) => key,
}))

const createMockCamera = (
	overrides: Partial<MediaDeviceInfo> = {},
): MediaDeviceInfo =>
	({
		deviceId: "cam-1",
		groupId: "group-1",
		kind: "videoinput",
		label: "Test Camera",
		toJSON: () => ({}),
		...overrides,
	}) as MediaDeviceInfo

const createMockStream = () =>
	({
		getTracks: () => [{ stop: vi.fn() }],
	}) as unknown as MediaStream

const mockEnumerateDevices =
	vi.fn<(typeof navigator.mediaDevices)["enumerateDevices"]>()
const mockGetUserMedia =
	vi.fn<(typeof navigator.mediaDevices)["getUserMedia"]>()
const mockAddEventListener = vi.fn()
const mockRemoveEventListener = vi.fn()

const mockSetAvailableCameras = vi.fn()
const mockSetCameraError = vi.fn()
const mockSetSelectedCameraId = vi.fn()

const defaultContextValue = {
	mode: "capture" as EditorMode,
	selectedCameraId: "",
	setSelectedCameraId: mockSetSelectedCameraId,
	availableCameras: [] as MediaDeviceInfo[],
	setAvailableCameras: mockSetAvailableCameras,
	cameraError: null as string | null,
	setCameraError: mockSetCameraError,
	sidePaneOpen: false,
	toggleSidePane: vi.fn(),
	closeSidePane: vi.fn(),
	activeTab: "settings" as const,
	setActiveTab: vi.fn(),
	timelineExpanded: false,
	toggleTimeline: vi.fn(),
	setMode: vi.fn(),
	layers: [] as TimelineLayer[],
	setLayers: vi.fn(),
	fragments: [] as ProjectFragment[],
	setFragments: vi.fn(),
	projectId: "test-project",
	addLayer: vi.fn(),
	addSegment: vi.fn(),
	deleteLayer: vi.fn(),
	isRecording: false,
	recordingLayerId: null as string | null,
	isPaused: false,
	recordingElapsedMs: 0,
	recordingFrameCount: 0,
	recordingError: null as string | null,
	recordingDurationSec: 0,
	rawFramesDirectoryHandle: null as FileSystemDirectoryHandle | null,
	rawFramesDirectoryName: null,
	setRawFramesDirectory: vi.fn(),
	wiggleDirectoryKey: 0,
	notifyNoDirectory: vi.fn(),
	pendingRecordingLayerId: null as string | null,
	setPendingRecordingLayerId: vi.fn(),
	clearPendingRecordingLayerId: vi.fn(),
	startRecording: vi.fn(),
	setRecordingLayerId: vi.fn(),
	stopRecording: vi.fn(),
	pauseRecording: vi.fn(),
	resumeRecording: vi.fn(),
	recordingConfig: { fps: 1, format: "jpeg" as const, jpegQuality: 80 },
	updateRecordingConfig: vi.fn(),
}

const renderWithContext = (
	overrides: Partial<typeof defaultContextValue> = {},
) =>
	render(
		<MantineProvider>
			<EditorContext.Provider
				value={{ ...defaultContextValue, ...overrides }}>
				<VideoViewer />
			</EditorContext.Provider>
		</MantineProvider>,
	)

beforeEach(() => {
	Object.defineProperty(globalThis.navigator, "mediaDevices", {
		value: {
			enumerateDevices: mockEnumerateDevices,
			getUserMedia: mockGetUserMedia,
			addEventListener: mockAddEventListener,
			removeEventListener: mockRemoveEventListener,
		},
		configurable: true,
		writable: true,
	})
})

afterEach(() => {
	cleanup()
	vi.clearAllMocks()
})

describe("VideoViewer", () => {
	describe("mode guard", () => {
		it("shows video preview placeholder when mode is not capture", () => {
			renderWithContext({ mode: "editing" })

			expect(screen.getByText("videoPreview")).toBeInTheDocument()
		})

		it("does not enumerate devices in editing mode", () => {
			renderWithContext({ mode: "editing" })

			expect(mockEnumerateDevices).not.toHaveBeenCalled()
		})

		it("does not call getUserMedia in editing mode", () => {
			renderWithContext({ mode: "editing" })

			expect(mockGetUserMedia).not.toHaveBeenCalled()
		})
	})

	describe("camera acquisition", () => {
		it("does not call getUserMedia when no camera is selected", async () => {
			mockEnumerateDevices.mockResolvedValue([])
			renderWithContext()

			await waitFor(() => {
				expect(mockEnumerateDevices).toHaveBeenCalled()
			})
			expect(mockGetUserMedia).not.toHaveBeenCalled()
		})

		it("calls getUserMedia with the selected camera's deviceId", async () => {
			mockEnumerateDevices.mockResolvedValue([])
			mockGetUserMedia.mockResolvedValue(createMockStream())
			renderWithContext({ selectedCameraId: "cam-1" })

			await waitFor(() => {
				expect(mockGetUserMedia).toHaveBeenCalledWith({
					video: { deviceId: { exact: "cam-1" } },
					audio: false,
				})
			})
		})

		it("sets cameraError when getUserMedia fails", async () => {
			mockEnumerateDevices.mockResolvedValue([])
			mockGetUserMedia.mockRejectedValue(
				new DOMException("Permission denied"),
			)
			renderWithContext({ selectedCameraId: "cam-1" })

			await waitFor(() => {
				expect(mockSetCameraError).toHaveBeenCalledWith(
					"Permission denied",
				)
			})
		})
	})

	describe("device enumeration", () => {
		it("enumerates devices on mount in capture mode", async () => {
			mockEnumerateDevices.mockResolvedValue([])
			renderWithContext()

			await waitFor(() => {
				expect(mockEnumerateDevices).toHaveBeenCalledTimes(1)
			})
		})

		it("filters to videoinput devices and sets available cameras", async () => {
			const cameras = [createMockCamera({ deviceId: "cam-1" })]
			const audioInput = {
				deviceId: "mic-1",
				groupId: "group-2",
				kind: "audioinput",
				label: "Test Mic",
				toJSON: () => ({}),
			} as MediaDeviceInfo
			mockEnumerateDevices.mockResolvedValue([...cameras, audioInput])
			renderWithContext()

			await waitFor(() => {
				expect(mockSetAvailableCameras).toHaveBeenCalledWith(cameras)
			})
		})
	})

	describe("devicechange listener", () => {
		it("registers a devicechange listener on mount in capture mode", async () => {
			mockEnumerateDevices.mockResolvedValue([])
			renderWithContext()

			await waitFor(() => {
				expect(mockAddEventListener).toHaveBeenCalledWith(
					"devicechange",
					expect.any(Function),
				)
			})
		})

		it("re-enumerates cameras when devicechange fires", async () => {
			mockEnumerateDevices.mockResolvedValue([])
			renderWithContext()

			await waitFor(() => {
				expect(mockAddEventListener).toHaveBeenCalledWith(
					"devicechange",
					expect.any(Function),
				)
			})

			const handler = mockAddEventListener.mock.calls.find(
				([event]) => event === "devicechange",
			)![1] as () => Promise<void>

			const newCameras = [createMockCamera({ deviceId: "cam-2" })]
			mockEnumerateDevices.mockResolvedValue(newCameras)

			await handler()

			expect(mockSetAvailableCameras).toHaveBeenCalledWith(newCameras)
		})

		it("clears cameraError when cameras become available", async () => {
			mockEnumerateDevices.mockResolvedValue([])
			renderWithContext()

			await waitFor(() => {
				expect(mockAddEventListener).toHaveBeenCalledWith(
					"devicechange",
					expect.any(Function),
				)
			})

			const handler = mockAddEventListener.mock.calls.find(
				([event]) => event === "devicechange",
			)![1] as () => Promise<void>

			mockEnumerateDevices.mockResolvedValue([
				createMockCamera(),
			] as MediaDeviceInfo[])

			await handler()

			expect(mockSetCameraError).toHaveBeenCalledWith(null)
		})

		it("removes the devicechange listener on unmount", async () => {
			mockEnumerateDevices.mockResolvedValue([])
			const { unmount } = renderWithContext()

			await waitFor(() => {
				expect(mockAddEventListener).toHaveBeenCalled()
			})

			const handler = mockAddEventListener.mock.calls.find(
				([event]) => event === "devicechange",
			)![1]

			unmount()

			expect(mockRemoveEventListener).toHaveBeenCalledWith(
				"devicechange",
				handler,
			)
		})
	})

	describe("render output", () => {
		it("shows select-camera placeholder when no camera is selected", () => {
			mockEnumerateDevices.mockResolvedValue([])
			renderWithContext()

			expect(screen.getByText("camera.selectCamera")).toBeInTheDocument()
		})

		it("shows video element when a camera is active", async () => {
			mockEnumerateDevices.mockResolvedValue([])
			mockGetUserMedia.mockResolvedValue(createMockStream())
			renderWithContext({ selectedCameraId: "cam-1" })

			await waitFor(() => {
				expect(document.querySelector("video")).toBeInTheDocument()
			})
		})

		it("shows the camera error text when cameraError is set", () => {
			renderWithContext({
				selectedCameraId: "cam-1",
				cameraError: "Camera is in use by another app",
			})

			expect(
				screen.getByText("Camera is in use by another app"),
			).toBeInTheDocument()
		})

		it("does not show the video element when cameraError is set", () => {
			renderWithContext({
				selectedCameraId: "cam-1",
				cameraError: "Permission denied",
			})

			expect(document.querySelector("video")).toBeNull()
		})
	})

	describe("cleanup", () => {
		it("stops all tracks on unmount when a camera is active", async () => {
			const mockTrack = { stop: vi.fn() }
			mockGetUserMedia.mockResolvedValue({
				getTracks: () => [mockTrack],
			} as unknown as MediaStream)
			mockEnumerateDevices.mockResolvedValue([])
			const { unmount } = renderWithContext({
				selectedCameraId: "cam-1",
			})

			await waitFor(() => {
				expect(mockGetUserMedia).toHaveBeenCalled()
			})

			unmount()

			expect(mockTrack.stop).toHaveBeenCalledTimes(1)
		})

		it("clears cameraError on unmount", () => {
			mockEnumerateDevices.mockResolvedValue([])
			const { unmount } = renderWithContext()

			unmount()

			expect(mockSetCameraError).toHaveBeenCalledWith(null)
		})
	})

	describe("split button and recording", () => {
		const mockDirHandle = {
			name: "frames",
		} as unknown as FileSystemDirectoryHandle

		it("renders split button (main + chevron) when camera is active", async () => {
			mockEnumerateDevices.mockResolvedValue([])
			mockGetUserMedia.mockResolvedValue(createMockStream())
			renderWithContext({ selectedCameraId: "cam-1" })

			await waitFor(() => {
				expect(mockGetUserMedia).toHaveBeenCalled()
			})

			expect(
				screen.getByText("recording.startWithLayer"),
			).toBeInTheDocument()
			expect(screen.getByLabelText("Select layer")).toBeInTheDocument()
		})

		it("hides chevron when pendingRecordingLayerId is set", async () => {
			mockEnumerateDevices.mockResolvedValue([])
			mockGetUserMedia.mockResolvedValue(createMockStream())
			renderWithContext({
				selectedCameraId: "cam-1",
				pendingRecordingLayerId: "layer-1",
			})

			await waitFor(() => {
				expect(mockGetUserMedia).toHaveBeenCalled()
			})

			expect(screen.getByText("recording.start")).toBeInTheDocument()
			expect(
				screen.queryByLabelText("Select layer"),
			).not.toBeInTheDocument()
		})

		it("defaults selected layer to first layer when layers exist", async () => {
			mockEnumerateDevices.mockResolvedValue([])
			mockGetUserMedia.mockResolvedValue(createMockStream())

			const startRecording = vi.fn()
			const user = userEvent.setup()

			renderWithContext({
				selectedCameraId: "cam-1",
				layers: [
					{
						id: "layer-1",
						name: "Layer 1",
						createdAt: "",
						projectId: "p1",
						segments: [] as TimelineSegment[],
						zIndex: 0,
					},
					{
						id: "layer-2",
						name: "Layer 2",
						createdAt: "",
						projectId: "p1",
						segments: [] as TimelineSegment[],
						zIndex: 1,
					},
				],
				rawFramesDirectoryHandle: mockDirHandle,
				startRecording,
			})

			await waitFor(() => {
				expect(mockGetUserMedia).toHaveBeenCalled()
			})

			await user.click(screen.getByText("recording.startWithLayer"))

			expect(startRecording).toHaveBeenCalledWith(
				"layer-1",
				expect.anything(),
			)
		})

		it("creates a new layer when no layers exist and record is clicked", async () => {
			mockEnumerateDevices.mockResolvedValue([])
			mockGetUserMedia.mockResolvedValue(createMockStream())

			const addLayer = vi.fn(() =>
				Promise.resolve({
					id: "new-layer",
					name: "New Layer",
					createdAt: "",
					projectId: "p1",
					segments: [],
					zIndex: 0,
				}),
			)
			const startRecording = vi.fn()
			const setRecordingLayerId = vi.fn()
			const user = userEvent.setup()

			renderWithContext({
				selectedCameraId: "cam-1",
				layers: [],
				rawFramesDirectoryHandle: mockDirHandle,
				startRecording,
				addLayer,
				setRecordingLayerId,
			})

			await waitFor(() => {
				expect(mockGetUserMedia).toHaveBeenCalled()
			})

			await user.click(screen.getByText("recording.startWithLayer"))

			expect(startRecording).toHaveBeenCalledWith(null, expect.anything())

			await waitFor(() => {
				expect(addLayer).toHaveBeenCalled()
			})

			await waitFor(() => {
				expect(setRecordingLayerId).toHaveBeenCalledWith("new-layer")
			})
		})
	})
})
