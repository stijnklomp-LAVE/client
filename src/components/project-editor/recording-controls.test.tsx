import "@testing-library/jest-dom"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MantineProvider } from "@mantine/core"
import { afterEach, describe, expect, it, vi } from "bun:test"

import { EditorContext, type EditorMode } from "./editor-context"
import { RecordingControls } from "./recording-controls"

vi.mock("next-intl", () => ({
	useTranslations: () => (key: string) => key,
}))

const defaultContextValue = {
	mode: "capture" as EditorMode,
	selectedCameraId: "",
	setSelectedCameraId: vi.fn(),
	availableCameras: [] as MediaDeviceInfo[],
	setAvailableCameras: vi.fn(),
	cameraError: null as string | null,
	setCameraError: vi.fn(),
	sidePaneOpen: false,
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
	setFragments: vi.fn(),
	projectId: "test-project",
	addLayer: vi.fn(() => Promise.resolve(null)),
	addSegment: vi.fn(),
	deleteLayer: vi.fn(),
	isRecording: true,
	recordingLayerId: "layer-1",
	isPaused: false,
	recordingElapsedMs: 65432,
	recordingError: null as string | null,
	recordingDurationSec: 65.432,
	rawFramesDirectoryHandle: null,
	rawFramesDirectoryName: null,
	setRawFramesDirectory: vi.fn(),
	wiggleDirectoryKey: 0,
	notifyNoDirectory: vi.fn(),
	pendingRecordingLayerId: null,
	setPendingRecordingLayerId: vi.fn(),
	clearPendingRecordingLayerId: vi.fn(),
	startRecording: vi.fn(),
	setRecordingLayerId: vi.fn(),
	stopRecording: vi.fn(),
	pauseRecording: vi.fn(),
	resumeRecording: vi.fn(),
	recordingConfig: { codec: "vp9" as const, fps: 30, quality: 80 },
	updateRecordingConfig: vi.fn(),
	currentTime: 0,
	duration: 120,
	isPlaying: false,
	playbackSpeed: 1,
	play: vi.fn(),
	pause: vi.fn(),
	seek: vi.fn(),
	setPlaybackSpeed: vi.fn(),
	onTimeUpdate: vi.fn(),
	onPlaybackEnd: vi.fn(),
	seekImplRef: { current: null },
}

const renderWithContext = (
	overrides: Partial<typeof defaultContextValue> = {},
) =>
	render(
		<MantineProvider>
			<EditorContext.Provider
				value={{ ...defaultContextValue, ...overrides }}>
				<RecordingControls />
			</EditorContext.Provider>
		</MantineProvider>,
	)

afterEach(() => {
	cleanup()
	vi.clearAllMocks()
})

describe("RecordingControls", () => {
	describe("visibility", () => {
		it("returns null when isRecording is false", () => {
			renderWithContext({ isRecording: false })

			expect(
				screen.queryByLabelText("recording.stop"),
			).not.toBeInTheDocument()
		})

		it("renders the controls when isRecording is true", () => {
			renderWithContext()

			expect(screen.getByLabelText("recording.stop")).toBeInTheDocument()
		})
	})

	describe("label and button states", () => {
		it('shows "Recording" label and pause button when isPaused is false', () => {
			renderWithContext({ isPaused: false })

			const recordingLabel = screen.getByText("recording.recording")
			expect(recordingLabel).not.toHaveAttribute("data-hidden")

			const pausedLabel = screen.getByText("recording.paused")
			expect(pausedLabel).toHaveAttribute("data-hidden")

			expect(screen.getByLabelText("recording.pause")).toBeInTheDocument()
		})

		it('shows "Paused" label and play button when isPaused is true', () => {
			renderWithContext({ isPaused: true })

			const recordingLabel = screen.getByText("recording.recording")
			expect(recordingLabel).toHaveAttribute("data-hidden")

			const pausedLabel = screen.getByText("recording.paused")
			expect(pausedLabel).not.toHaveAttribute("data-hidden")

			expect(
				screen.getByLabelText("recording.resume"),
			).toBeInTheDocument()
		})
	})

	describe("actions", () => {
		it("calls pauseRecording when pause button is clicked", async () => {
			const pauseRecording = vi.fn()
			const user = userEvent.setup()
			renderWithContext({ isPaused: false, pauseRecording })

			await user.click(screen.getByLabelText("recording.pause"))

			expect(pauseRecording).toHaveBeenCalledTimes(1)
		})

		it("calls resumeRecording when play button is clicked", async () => {
			const resumeRecording = vi.fn()
			const user = userEvent.setup()
			renderWithContext({ isPaused: true, resumeRecording })

			await user.click(screen.getByLabelText("recording.resume"))

			expect(resumeRecording).toHaveBeenCalledTimes(1)
		})

		it("calls stopRecording when stop button is clicked", async () => {
			const stopRecording = vi.fn()
			const user = userEvent.setup()
			renderWithContext({ stopRecording })

			await user.click(screen.getByLabelText("recording.stop"))

			expect(stopRecording).toHaveBeenCalledTimes(1)
		})
	})

	describe("info display", () => {
		it("displays formatted elapsed time", () => {
			renderWithContext({ recordingElapsedMs: 65432 })

			expect(screen.getByText("01:05")).toBeInTheDocument()
		})

		it("shows zero-padded timer for sub-minute durations", () => {
			renderWithContext({ recordingElapsedMs: 5000 })

			expect(screen.getByText("00:05")).toBeInTheDocument()
		})

		it("shows the recording error when one is set", () => {
			renderWithContext({ recordingError: "Encoder died" })

			expect(screen.getByText("Encoder died")).toBeInTheDocument()
		})
	})
})
