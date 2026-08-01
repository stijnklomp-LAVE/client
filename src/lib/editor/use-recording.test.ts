import { describe, test, expect, mock, vi, beforeEach } from "bun:test"
import { renderHook, act } from "@testing-library/react"

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
	(_track: unknown, _config: unknown, _options: unknown) =>
		mockSourceInstance,
)
const MockOutput = mock(() => mockOutputInstance)
const MockStreamTarget = mock()
const MockWebMOutputFormat = mock()

void vi.mock("./raw-frames-directory", () => ({
	createWebmStream: mockCreateWebmStream,
	getWebmSize: mockGetWebmSize,
}))

void vi.mock("mediabunny", () => {
	const mocks: Record<string, unknown> = {}
	mocks.MediaStreamVideoTrackSource = MockMediaStreamVideoTrackSource
	mocks.Output = MockOutput
	mocks.StreamTarget = MockStreamTarget
	mocks.WebMOutputFormat = MockWebMOutputFormat

	return mocks
})

import { useRecording, bitrateFromQuality } from "./use-recording"

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

type EncodingConfig = {
	bitrate: number
	codec: "vp9"
}

type SourceArgs = {
	config: EncodingConfig
	options: { frameRate: number }
}

let capturedSourceArgs: SourceArgs | null = null

const getSourceArgs = (): SourceArgs => {
	if (!capturedSourceArgs)
		throw new Error("Source args not set by startRecording")

	return capturedSourceArgs
}

beforeEach(() => {
	vi.clearAllMocks()
	capturedSourceArgs = null

	MockMediaStreamVideoTrackSource.mockImplementation(
		(_track: unknown, config: unknown, options: unknown) => {
			capturedSourceArgs = {
				config: config as SourceArgs["config"],
				options: options as SourceArgs["options"],
			}

			return mockSourceInstance
		},
	)

	mockSourceInstance.errorPromise.catch = mock()
})

describe("useRecording", () => {
	test("returns initial default state", () => {
		const { result } = renderHook(() => useRecording())

		expect(result.current.isRecording).toBe(false)
		expect(result.current.error).toBeNull()
		expect(result.current.elapsedMs).toBe(0)
		expect(result.current.recordingDurationSec).toBe(0)
		expect(result.current.config).toEqual({
			codec: "vp9",
			fps: 30,
			quality: 80,
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

	test("maps config onto the video source encoding config", async () => {
		const { result } = renderHook(() => useRecording())

		await act(async () => {
			await result.current.startRecording(
				createMockStream(),
				createMockDirHandle(),
				"proj-123",
				"rec-456",
				{ fps: 24, quality: 80 },
			)
		})

		const args = getSourceArgs()
		expect(args.config).toEqual({
			bitrate: 5_000_000,
			codec: "vp9",
		})
		expect(args.options).toEqual({ frameRate: 24 })
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
		expect(result.current.config.codec).toBe("vp9")
		expect(result.current.config.quality).toBe(80)
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

	test("surfaces source errorPromise rejections as recording errors", async () => {
		let errorHandler: ((err: unknown) => void) | null = null
		mockSourceInstance.errorPromise.catch = mock(
			(fn: (err: unknown) => void) => {
				errorHandler = fn
			},
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

		act(() => {
			errorHandler?.(new Error("Encoder died"))
		})

		expect(result.current.error).toBe("Encoder died")
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

	test("stopRecording surfaces finalize failures and returns null", async () => {
		mockOutputInstance.finalize.mockRejectedValueOnce(
			new Error("Muxer error"),
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

		let recordingResult: Awaited<
			ReturnType<typeof result.current.stopRecording>
		> | null = null

		await act(async () => {
			recordingResult = await result.current.stopRecording()
		})

		expect(recordingResult).toBeNull()
		expect(result.current.error).toBe("Muxer error")
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
			result.current.updateConfig({ fps: 15 })
		})

		expect(result.current.config.fps).toBe(15)
		expect(result.current.config.codec).toBe("vp9")
		expect(result.current.config.quality).toBe(80)
	})

	test("updateConfig only changes specified fields", () => {
		const { result } = renderHook(() => useRecording())

		act(() => {
			result.current.updateConfig({ quality: 50 })
		})

		expect(result.current.config.fps).toBe(30)
		expect(result.current.config.codec).toBe("vp9")
		expect(result.current.config.quality).toBe(50)
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

	test("bitrateFromQuality maps quality to bitrate", () => {
		expect(bitrateFromQuality(80)).toBe(5_000_000)
		expect(bitrateFromQuality(100)).toBe(6_250_000)
		expect(bitrateFromQuality(1)).toBe(62_500)
	})
})
