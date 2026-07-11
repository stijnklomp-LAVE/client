import { describe, test, expect, mock, vi, beforeEach } from "bun:test"
import { renderHook, act } from "@testing-library/react"

const mockSaveFrame = mock(() => Promise.resolve("frame_000000.jpg"))
const mockCreateWebmStream = mock(() =>
	Promise.resolve({ close: mock(), write: mock() }),
)
const mockGetWebmSize = mock(() => Promise.resolve(2048))

const mockSourceInstance = {
	errorPromise: { catch: mock() },
	pause: mock(),
	resume: mock(),
}

const mockOutputInstance = {
	addVideoTrack: mock(),
	finalize: mock(() => Promise.resolve()),
	start: mock(() => Promise.resolve()),
}

const MockMediaStreamVideoTrackSource = mock(
	(_track: unknown, _config: unknown) => mockSourceInstance,
)
const MockOutput = mock(() => mockOutputInstance)
const MockStreamTarget = mock()
const MockWebMOutputFormat = mock()

void vi.mock("./raw-frames-directory", () => ({
	createWebmStream: mockCreateWebmStream,
	getWebmSize: mockGetWebmSize,
	saveFrame: mockSaveFrame,
}))

void vi.mock("mediabunny", () => {
	const mocks: Record<string, unknown> = {}
	mocks.MediaStreamVideoTrackSource = MockMediaStreamVideoTrackSource
	mocks.Output = MockOutput
	mocks.StreamTarget = MockStreamTarget
	mocks.WebMOutputFormat = MockWebMOutputFormat

	return mocks
})

import { useRecording, type RecordingConfig } from "./use-recording"

const createMockVideoTrack = () =>
	({
		kind: "video",
		stop: mock(),
	}) as unknown as MediaStreamVideoTrack

const createMockStream = () =>
	({
		getTracks: mock(() => [createMockVideoTrack()]),
		getVideoTracks: mock(() => [createMockVideoTrack()]),
	}) as unknown as MediaStream

const createMockDirHandle = () =>
	({
		getDirectoryHandle: mock(() => Promise.resolve(createMockDirHandle())),
		getFileHandle: mock(() =>
			Promise.resolve({
				createWritable: mock(() =>
					Promise.resolve({ close: mock(), write: mock() }),
				),
				getFile: mock(() => Promise.resolve(new File([], "test"))),
			}),
		),
		name: "test-dir",
	}) as unknown as FileSystemDirectoryHandle

type SampleShape = {
	codedHeight: number
	codedWidth: number
	draw: ReturnType<typeof vi.fn>
	timestamp: number
}

type EncodingConfigWithCallback = RecordingConfig & {
	onEncodedSample: (sample: SampleShape) => void
}

let capturedEncodingConfig: EncodingConfigWithCallback | null = null

const getEncodingConfig = (): EncodingConfigWithCallback => {
	if (!capturedEncodingConfig)
		throw new Error("Encoding config not set by startRecording")

	return capturedEncodingConfig
}

beforeEach(() => {
	vi.clearAllMocks()
	capturedEncodingConfig = null

	MockMediaStreamVideoTrackSource.mockImplementation(
		(_track: unknown, encodingConfig: unknown) => {
			capturedEncodingConfig =
				encodingConfig as typeof capturedEncodingConfig

			return mockSourceInstance
		},
	)

	mockSourceInstance.errorPromise.catch = mock()

	class MockOffscreenCanvas {
		width = 640
		height = 480
		getContext() {
			return {
				drawImage: mock(),
			}
		}
		convertToBlob() {
			return Promise.resolve(
				new Blob(["fake-image"], { type: "image/jpeg" }),
			)
		}
	}

	Object.defineProperty(globalThis, "OffscreenCanvas", {
		configurable: true,
		value: MockOffscreenCanvas,
		writable: true,
	})
})

const createSample = (timestamp: number) => ({
	codedHeight: 1080,
	codedWidth: 1920,
	draw: mock(),
	timestamp,
})

describe("useRecording", () => {
	test("returns initial default state", () => {
		const { result } = renderHook(() => useRecording())

		expect(result.current.isRecording).toBe(false)
		expect(result.current.error).toBeNull()
		expect(result.current.elapsedMs).toBe(0)
		expect(result.current.frameCount).toBe(0)
		expect(result.current.recordingDurationSec).toBe(0)
		expect(result.current.config).toEqual({
			format: "jpeg",
			fps: 1,
			jpegQuality: 80,
		})
	})

	test("startRecording creates the pipeline and sets isRecording", async () => {
		const { result } = renderHook(() => useRecording())

		await act(async () => {
			await result.current.startRecording(
				createMockStream(),
				createMockDirHandle(),
				"proj-123",
				"rec-456",
			)
		})

		expect(mockCreateWebmStream).toHaveBeenCalledWith(
			expect.anything(),
			"proj-123",
			"rec-456",
		)
		expect(MockMediaStreamVideoTrackSource).toHaveBeenCalled()
		expect(MockOutput).toHaveBeenCalled()
		expect(mockOutputInstance.addVideoTrack).toHaveBeenCalledWith(
			mockSourceInstance,
		)
		expect(mockOutputInstance.start).toHaveBeenCalled()
		expect(result.current.isRecording).toBe(true)
	})

	test("startRecording with partial config merges with defaults", async () => {
		const { result } = renderHook(() => useRecording())

		await act(async () => {
			await result.current.startRecording(
				createMockStream(),
				createMockDirHandle(),
				"proj-123",
				"rec-456",
				{ fps: 5 },
			)
		})

		expect(result.current.config.fps).toBe(5)
		expect(result.current.config.format).toBe("jpeg")
		expect(result.current.config.jpegQuality).toBe(80)
	})

	test("startRecording sets error when no video track", async () => {
		const streamWithoutVideo = {
			getVideoTracks: mock(() => []),
		} as unknown as MediaStream

		const { result } = renderHook(() => useRecording())

		await act(async () => {
			await result.current.startRecording(
				streamWithoutVideo,
				createMockDirHandle(),
				"proj-123",
				"rec-456",
			)
		})

		expect(result.current.error).toBe("No video track available")
		expect(result.current.isRecording).toBe(false)
	})

	test("startRecording sets error when pipeline fails", async () => {
		mockOutputInstance.start.mockRejectedValueOnce(
			new Error("Encoder unavailable"),
		)

		const { result } = renderHook(() => useRecording())

		await act(async () => {
			await result.current.startRecording(
				createMockStream(),
				createMockDirHandle(),
				"proj-123",
				"rec-456",
			)
		})

		expect(result.current.error).toBe("Encoder unavailable")
		expect(result.current.isRecording).toBe(false)
	})

	test("stopRecording finalizes output and returns recording result", async () => {
		const { result } = renderHook(() => useRecording())

		await act(async () => {
			await result.current.startRecording(
				createMockStream(),
				createMockDirHandle(),
				"proj-123",
				"rec-456",
			)
		})

		let recordingResult: Awaited<
			ReturnType<typeof result.current.stopRecording>
		> | null = null

		await act(async () => {
			recordingResult = await result.current.stopRecording()
		})

		expect(mockOutputInstance.finalize).toHaveBeenCalled()
		expect(mockGetWebmSize).toHaveBeenCalled()
		expect(
			recordingResult as unknown as { recordingId: string; size: number },
		).toEqual({
			recordingId: "rec-456",
			size: 2048,
		})
		expect(result.current.isRecording).toBe(false)
	})

	test("stopRecording returns null when nothing was recorded", async () => {
		const { result } = renderHook(() => useRecording())

		let recordingResult: Awaited<
			ReturnType<typeof result.current.stopRecording>
		> | null = null

		await act(async () => {
			recordingResult = await result.current.stopRecording()
		})

		expect(recordingResult).toBeNull()
	})

	test("stopRecording returns recordingId with zero size when getWebmSize fails", async () => {
		mockGetWebmSize.mockRejectedValueOnce(new Error("File not found"))

		const { result } = renderHook(() => useRecording())

		await act(async () => {
			await result.current.startRecording(
				createMockStream(),
				createMockDirHandle(),
				"proj-123",
				"rec-456",
			)
		})

		let recordingResult: Awaited<
			ReturnType<typeof result.current.stopRecording>
		> | null = null

		await act(async () => {
			recordingResult = await result.current.stopRecording()
		})

		expect(
			recordingResult as unknown as { recordingId: string; size: number },
		).toEqual({
			recordingId: "rec-456",
			size: 0,
		})
	})

	test("startRecording after stopRecording resets state correctly", async () => {
		const { result } = renderHook(() => useRecording())

		await act(async () => {
			await result.current.startRecording(
				createMockStream(),
				createMockDirHandle(),
				"proj-123",
				"rec-456",
			)
		})

		expect(result.current.isRecording).toBe(true)
		expect(result.current.frameCount).toBe(0)
		expect(result.current.elapsedMs).toBe(0)

		await act(async () => {
			await result.current.stopRecording()
		})

		expect(result.current.isRecording).toBe(false)

		await act(async () => {
			await result.current.startRecording(
				createMockStream(),
				createMockDirHandle(),
				"proj-123",
				"rec-789",
			)
		})

		expect(result.current.isRecording).toBe(true)
		expect(result.current.frameCount).toBe(0)
		expect(result.current.elapsedMs).toBe(0)
	})

	test("timer resumes after pause-stop-start cycle", async () => {
		vi.useFakeTimers()
		const { result } = renderHook(() => useRecording())

		await act(async () => {
			await result.current.startRecording(
				createMockStream(),
				createMockDirHandle(),
				"proj-123",
				"rec-456",
			)
		})

		act(() => {
			vi.advanceTimersByTime(200)
		})
		expect(result.current.elapsedMs).toBeGreaterThan(0)

		act(() => {
			result.current.pauseRecording()
		})

		act(() => {
			vi.advanceTimersByTime(500)
		})

		await act(async () => {
			await result.current.stopRecording()
		})
		expect(result.current.isRecording).toBe(false)

		act(() => {
			vi.advanceTimersByTime(300)
		})

		await act(async () => {
			await result.current.startRecording(
				createMockStream(),
				createMockDirHandle(),
				"proj-123",
				"rec-789",
			)
		})

		expect(result.current.elapsedMs).toBe(0)

		act(() => {
			vi.advanceTimersByTime(200)
		})
		expect(result.current.elapsedMs).toBeGreaterThan(0)

		vi.useRealTimers()
	})

	test("pauseRecording delegates to source.pause", async () => {
		const { result } = renderHook(() => useRecording())

		await act(async () => {
			await result.current.startRecording(
				createMockStream(),
				createMockDirHandle(),
				"proj-123",
				"rec-456",
			)
		})

		act(() => {
			result.current.pauseRecording()
		})

		expect(mockSourceInstance.pause).toHaveBeenCalled()
	})

	test("elapsedMs does not increase while paused", async () => {
		vi.useFakeTimers()
		const { result } = renderHook(() => useRecording())

		await act(async () => {
			await result.current.startRecording(
				createMockStream(),
				createMockDirHandle(),
				"proj-123",
				"rec-456",
			)
		})

		act(() => {
			vi.advanceTimersByTime(300)
		})

		const elapsedBefore = result.current.elapsedMs
		expect(elapsedBefore).toBeGreaterThan(0)

		act(() => {
			result.current.pauseRecording()
		})

		act(() => {
			vi.advanceTimersByTime(500)
		})

		expect(result.current.elapsedMs).toBe(elapsedBefore)

		act(() => {
			result.current.resumeRecording()
		})

		act(() => {
			vi.advanceTimersByTime(200)
		})

		expect(result.current.elapsedMs).toBeGreaterThan(elapsedBefore)

		vi.useRealTimers()
	})

	test("resumeRecording delegates to source.resume", async () => {
		const { result } = renderHook(() => useRecording())

		await act(async () => {
			await result.current.startRecording(
				createMockStream(),
				createMockDirHandle(),
				"proj-123",
				"rec-456",
			)
		})

		act(() => {
			result.current.resumeRecording()
		})

		expect(mockSourceInstance.resume).toHaveBeenCalled()
	})

	test("updateConfig updates the config state", () => {
		const { result } = renderHook(() => useRecording())

		act(() => {
			result.current.updateConfig({ format: "png", fps: 15 })
		})

		expect(result.current.config.fps).toBe(15)
		expect(result.current.config.format).toBe("png")
		expect(result.current.config.jpegQuality).toBe(80)
	})

	test("updateConfig only changes specified fields", () => {
		const { result } = renderHook(() => useRecording())

		act(() => {
			result.current.updateConfig({ jpegQuality: 50 })
		})

		expect(result.current.config.fps).toBe(1)
		expect(result.current.config.format).toBe("jpeg")
		expect(result.current.config.jpegQuality).toBe(50)
	})

	test("tracks frame count and updates state via onEncodedSample", async () => {
		const { result } = renderHook(() => useRecording())

		await act(async () => {
			await result.current.startRecording(
				createMockStream(),
				createMockDirHandle(),
				"proj-123",
				"rec-456",
			)
		})

		const config = getEncodingConfig()
		await act(async () => {
			config.onEncodedSample(createSample(0))
			await Promise.resolve()
		})

		expect(mockSaveFrame).toHaveBeenCalledTimes(1)
		expect(result.current.frameCount).toBe(1)
	})

	test("uses fidelity thresholds for frame count display updates", async () => {
		const { result } = renderHook(() => useRecording())

		await act(async () => {
			await result.current.startRecording(
				createMockStream(),
				createMockDirHandle(),
				"proj-123",
				"rec-456",
			)
		})

		const cb = getEncodingConfig().onEncodedSample

		await act(async () => {
			cb(createSample(0))
			await Promise.resolve()
		})
		expect(result.current.frameCount).toBe(1)

		await act(async () => {
			cb(createSample(1))
			await Promise.resolve()
		})
		expect(result.current.frameCount).toBe(2)

		for (let i = 2; i < 9; i++) {
			await act(async () => {
				cb(createSample(i))
				await Promise.resolve()
			})
		}

		expect(result.current.frameCount).toBe(9)

		await act(async () => {
			cb(createSample(9))
			await Promise.resolve()
		})
		expect(result.current.frameCount).toBe(10)

		const frameCountAt10 = result.current.frameCount

		for (let i = 10; i < 19; i++) {
			await act(async () => {
				cb(createSample(i))
				await Promise.resolve()
			})
		}

		expect(result.current.frameCount).toBe(frameCountAt10)

		await act(async () => {
			cb(createSample(19))
			await Promise.resolve()
		})
		expect(result.current.frameCount).toBe(20)
	})

	test("throttles frame saving by configured fps", async () => {
		const { result } = renderHook(() => useRecording())

		await act(async () => {
			await result.current.startRecording(
				createMockStream(),
				createMockDirHandle(),
				"proj-123",
				"rec-456",
				{ fps: 2 },
			)
		})

		const cb = getEncodingConfig().onEncodedSample
		const asample = (t: number) => createSample(t)

		await act(async () => {
			cb(asample(0))
			await Promise.resolve()
		})
		expect(mockSaveFrame).toHaveBeenCalledTimes(1)

		await act(async () => {
			cb(asample(0.3))
			await Promise.resolve()
		})
		expect(mockSaveFrame).toHaveBeenCalledTimes(1)

		await act(async () => {
			cb(asample(0.5))
			await Promise.resolve()
		})
		expect(mockSaveFrame).toHaveBeenCalledTimes(2)

		await act(async () => {
			cb(asample(0.7))
			await Promise.resolve()
		})
		expect(mockSaveFrame).toHaveBeenCalledTimes(2)

		await act(async () => {
			cb(asample(1.0))
			await Promise.resolve()
		})
		expect(mockSaveFrame).toHaveBeenCalledTimes(3)
	})

	test("captures first frame even at very low fps", async () => {
		const { result } = renderHook(() => useRecording())

		await act(async () => {
			await result.current.startRecording(
				createMockStream(),
				createMockDirHandle(),
				"proj-123",
				"rec-456",
				{ fps: 0.1 },
			)
		})

		const cb = getEncodingConfig().onEncodedSample

		await act(async () => {
			cb(createSample(0))
			await Promise.resolve()
		})

		expect(mockSaveFrame).toHaveBeenCalledTimes(1)
	})

	test("draws sample to OffscreenCanvas and converts to blob", async () => {
		const { result } = renderHook(() => useRecording())

		await act(async () => {
			await result.current.startRecording(
				createMockStream(),
				createMockDirHandle(),
				"proj-123",
				"rec-456",
			)
		})

		const sample = createSample(0)
		const cb = getEncodingConfig().onEncodedSample

		await act(async () => {
			cb(sample)
			await Promise.resolve()
		})

		expect(sample.draw).toHaveBeenCalled()
		expect(mockSaveFrame).toHaveBeenCalledWith(
			expect.anything(),
			"proj-123",
			"rec-456",
			0,
			expect.any(Blob),
			"jpeg",
		)
	})

	test("cleanup on unmount finalizes output", async () => {
		const { result, unmount } = renderHook(() => useRecording())

		await act(async () => {
			await result.current.startRecording(
				createMockStream(),
				createMockDirHandle(),
				"proj-123",
				"rec-456",
			)
		})

		unmount()

		expect(mockOutputInstance.finalize).toHaveBeenCalled()
	})
})
