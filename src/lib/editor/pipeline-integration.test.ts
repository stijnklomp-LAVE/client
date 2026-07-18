import { describe, test, expect, mock, vi, beforeEach } from "bun:test"

// Mock OffscreenCanvas for the test environment
class MockOffscreenCanvas {
	width: number
	height: number
	clearRect = mock((..._args: unknown[]) => undefined)
	drawImage = mock((..._args: unknown[]) => undefined)
	fillRect = mock((..._args: unknown[]) => undefined)
	fillText = mock((..._args: unknown[]) => undefined)
	constructor(w: number, h: number) {
		this.width = w
		this.height = h
	}
	getContext(_contextType?: string) {
		return {
			clearRect: this.clearRect,
			drawImage: this.drawImage,
			fillRect: this.fillRect,
			fillText: this.fillText,
		} as unknown as OffscreenCanvasRenderingContext2D
	}
	convertToBlob() {
		return Promise.resolve(new Blob())
	}
}

Object.defineProperty(globalThis, "OffscreenCanvas", {
	configurable: true,
	value: MockOffscreenCanvas,
	writable: true,
})

import {
	getActiveSegment,
	computeSeekTime,
	composeFrame,
	computeDuration,
} from "./compositor"
import { resolveFragmentMedia } from "./fragment-media"
import { DecoderPool } from "./decoder-pool"

const createMockFileHandle = (name: string, size = 1024) => ({
	createWritable: mock(() => Promise.reject(new Error("not writable"))),
	getFile: mock(() =>
		Promise.resolve(new File([new Uint8Array(size)], name)),
	),
	isSameEntry: mock(() => Promise.resolve(false)),
	kind: "file" as const,
	move: mock(() => Promise.resolve()),
	name,
})

// Shared helper: creates a mock FileSystemDirectoryHandle tree
type MockDirHandle = FileSystemDirectoryHandle & {
	queryPermission: (opts: { mode: "readwrite" }) => Promise<PermissionState>
	requestPermission: (opts: { mode: "readwrite" }) => Promise<PermissionState>
}

const createMockDirHandle = (
	name: string,
	entries: Record<string, unknown> = {},
) =>
	({
		getDirectoryHandle: mock(
			(dirName: string, opts?: { create?: boolean }) => {
				if (dirName in entries) {
					return Promise.resolve(
						entries[dirName] as FileSystemDirectoryHandle,
					)
				}

				if (opts?.create) {
					const dir = createMockDirHandle(dirName)
					entries[dirName] = dir

					return Promise.resolve(
						dir as unknown as FileSystemDirectoryHandle,
					)
				}

				return Promise.reject(
					new DOMException("Not found", "NotFoundError"),
				)
			},
		),
		getFileHandle: mock((fileName: string, opts?: { create?: boolean }) => {
			if (fileName in entries) {
				return Promise.resolve(
					entries[fileName] as FileSystemFileHandle,
				)
			}

			if (opts?.create) {
				const handle = createMockFileHandle(fileName)
				entries[fileName] = handle

				return Promise.resolve(handle)
			}

			return Promise.reject(
				new DOMException("Not found", "NotFoundError"),
			)
		}),
		kind: "directory" as const,
		name,
		queryPermission: mock(() =>
			Promise.resolve("granted" as PermissionState),
		),
		removeEntry: mock(() => Promise.resolve()),
		requestPermission: mock(() =>
			Promise.resolve("granted" as PermissionState),
		),
		resolve: mock(() => Promise.resolve<string[] | null>(null)),
		values: mock(function* (): Generator<
			FileSystemDirectoryHandle | FileSystemFileHandle
		> {
			void 0
		}) as unknown as () => AsyncIterableIterator<
			FileSystemDirectoryHandle | FileSystemFileHandle
		>,
	}) as unknown as MockDirHandle

beforeEach(() => {
	mock.restore()
})

// Mock mediabunny since DecoderPool uses it
const mockInputInstance = {
	close: mock(() => Promise.resolve()),
	getPrimaryVideoTrack: mock(() => Promise.resolve({})),
}

const mockCanvasSink = {
	canvases: mock(function* () {
		void 0
	}),
	getCanvas: mock((_timestamp: number) =>
		Promise.resolve({
			canvas: new OffscreenCanvas(100, 100),
			duration: 1 / 30,
			timestamp: 0,
		}),
	),
}

const MockInput = mock(() => mockInputInstance)
const MockCanvasSink = mock(() => mockCanvasSink)

void vi.mock("mediabunny", () => {
	const mocks: Record<string, unknown> = {}
	mocks.Input = MockInput
	mocks.BlobSource = class BlobSource {
		name = "BlobSource"
	}
	mocks.CanvasSink = MockCanvasSink
	mocks.ALL_FORMATS = Symbol("ALL_FORMATS")

	return mocks
})

const PROJECT_ID = "proj-123"
const RECORDING_ID = "rec-456"

const makeFragment = (
	id: string,
	filePath: string,
	duration: number | null = 10,
) => ({
	createdAt: "2025-01-01T00:00:00Z",
	duration,
	filePath,
	id,
	name: `Fragment ${id}`,
	size: 50000,
})

const makeSegment = (fragmentId: string, inPoint = 0, outPoint = 10) => ({
	createdAt: "2025-01-01T00:00:00Z",
	fragmentId,
	id: `seg-${fragmentId}`,
	inPoint,
	name: "Segment",
	order: 0,
	outPoint,
})

const makeLayer = (
	zIndex: number,
	segments: ReturnType<typeof makeSegment>[],
) => ({
	createdAt: "2025-01-01T00:00:00Z",
	id: `layer-${String(zIndex)}`,
	name: `Layer ${String(zIndex)}`,
	projectId: PROJECT_ID,
	segments,
	zIndex,
})

describe("Full pipeline: resolve → open → seek → compose", () => {
	test("fragment-media resolves to synced state and provides a webm file", async () => {
		const webmFile = createMockFileHandle("recording.webm", 50000)
		const recordingDirEntries: Record<string, unknown> = {}
		recordingDirEntries["recording.webm"] = webmFile
		const recordingDir = createMockDirHandle(
			RECORDING_ID,
			recordingDirEntries,
		)
		const projectDir = createMockDirHandle(PROJECT_ID, {
			[RECORDING_ID]: recordingDir,
		})
		const rootDir = createMockDirHandle("root", {
			[PROJECT_ID]: projectDir,
		})

		const fragment = makeFragment("frag-1", RECORDING_ID, 15)
		const result = await resolveFragmentMedia(fragment, PROJECT_ID, rootDir)

		expect(result.state).toBe("synced")
		expect(result.webmFile).not.toBeNull()
		expect(result.duration).toBe(15)
	})

	test("resolve + decoder pool open + seekToFrame works end-to-end", async () => {
		const webmFile = createMockFileHandle("recording.webm", 50000)
		const recordingDirEntries: Record<string, unknown> = {}
		recordingDirEntries["recording.webm"] = webmFile
		const recordingDir = createMockDirHandle(
			RECORDING_ID,
			recordingDirEntries,
		)
		const projectDir = createMockDirHandle(PROJECT_ID, {
			[RECORDING_ID]: recordingDir,
		})
		const rootDir = createMockDirHandle("root", {
			[PROJECT_ID]: projectDir,
		})

		const fragment = makeFragment("frag-1", RECORDING_ID, 15)
		const result = await resolveFragmentMedia(fragment, PROJECT_ID, rootDir)

		expect(result.state).toBe("synced")
		expect(result.webmFile).not.toBeNull()

		if (!result.webmFile) throw new Error("unreachable")

		const pool = new DecoderPool(5)
		await pool.open("frag-1", result.webmFile)

		expect(pool.size).toBe(1)

		const frame = await pool.seekToFrame("frag-1", 0)

		expect(frame).not.toBeNull()

		if (!frame) throw new Error("unreachable")
		expect(frame.canvas).toBeDefined()
		expect(frame.timestamp).toBe(0)

		pool.closeAll()
	})

	test("composeFrame draws available frame after open and seek", async () => {
		const webmFile = createMockFileHandle("recording.webm", 50000)
		const recordingDirEntries: Record<string, unknown> = {}
		recordingDirEntries["recording.webm"] = webmFile
		const recordingDir = createMockDirHandle(
			RECORDING_ID,
			recordingDirEntries,
		)
		const projectDir = createMockDirHandle(PROJECT_ID, {
			[RECORDING_ID]: recordingDir,
		})
		const rootDir = createMockDirHandle("root", {
			[PROJECT_ID]: projectDir,
		})

		const fragment = makeFragment("frag-1", RECORDING_ID, 15)
		const result = await resolveFragmentMedia(fragment, PROJECT_ID, rootDir)

		if (!result.webmFile) throw new Error("unreachable")

		const pool = new DecoderPool(5)
		await pool.open("frag-1", result.webmFile)

		const canvas = new OffscreenCanvas(
			200,
			100,
		) as unknown as MockOffscreenCanvas
		const ctx = canvas.getContext("2d")

		const fragmentId = "frag-1"
		const layers = [makeLayer(0, [makeSegment(fragmentId, 0, 15)])]

		const frameProvider = {
			getFrame: async (id: string, seekTime: number) => {
				return pool.seekToFrame(id, seekTime)
			},
		}

		const onMissing = mock()

		await composeFrame(ctx, 200, 100, layers, 0, frameProvider, onMissing)

		// Should have drawn the frame (drawImage) since frame was available
		expect(canvas.drawImage).toHaveBeenCalled()
		expect(onMissing).not.toHaveBeenCalled()

		pool.closeAll()
	})

	test("composeFrame calls placeholder when no decoder is open", async () => {
		const canvas = new OffscreenCanvas(
			200,
			100,
		) as unknown as MockOffscreenCanvas
		const ctx = canvas.getContext("2d")

		const layers = [makeLayer(0, [makeSegment("unknown-frag", 0, 10)])]

		const frameProvider = {
			getFrame: () => Promise.resolve(null),
		}

		const onMissing = mock()

		await composeFrame(ctx, 200, 100, layers, 0, frameProvider, onMissing)

		expect(onMissing).toHaveBeenCalled()
		expect(canvas.clearRect).toHaveBeenCalled()
	})

	test("getActiveSegment returns a segment at time 0 for a valid layer", () => {
		const layer = makeLayer(0, [makeSegment("frag-1", 0, 10)])

		const result = getActiveSegment(layer, 0)

		expect(result).not.toBeNull()

		if (!result) throw new Error("unreachable")
		expect(result.segment.fragmentId).toBe("frag-1")
		expect(result.timelineOffset).toBe(0)
	})

	test("computeDuration returns non-zero for valid layers", () => {
		const layers = [makeLayer(0, [makeSegment("frag-1", 0, 10)])]

		const duration = computeDuration(layers)

		expect(duration).toBe(10)
	})

	test("seekTime is correctly computed for segment at time 0", () => {
		const segment = makeSegment("frag-1", 2, 10)
		const seekTime = computeSeekTime(segment, 0, 0)
		expect(seekTime).toBe(2)
	})

	test("fragment with null duration resolves correctly", async () => {
		const webmFile = createMockFileHandle("recording.webm", 50000)
		const recordingDirEntries: Record<string, unknown> = {}
		recordingDirEntries["recording.webm"] = webmFile
		const recordingDir = createMockDirHandle(
			RECORDING_ID,
			recordingDirEntries,
		)
		const projectDir = createMockDirHandle(PROJECT_ID, {
			[RECORDING_ID]: recordingDir,
		})
		const rootDir = createMockDirHandle("root", {
			[PROJECT_ID]: projectDir,
		})

		const fragment = makeFragment("frag-1", RECORDING_ID, null)
		const result = await resolveFragmentMedia(fragment, PROJECT_ID, rootDir)

		expect(result.state).toBe("synced")
		expect(result.duration).toBe(0)
	})

	test("fragment not on device (missing from FSAA) returns missing state", async () => {
		const rootDir = createMockDirHandle("root", {})
		const fragment = makeFragment("frag-remote", "nonexistent-rec", 10)
		const result = await resolveFragmentMedia(fragment, PROJECT_ID, rootDir)

		expect(result.state).toBe("missing")
		expect(result.webmFile).toBeNull()
	})
})
