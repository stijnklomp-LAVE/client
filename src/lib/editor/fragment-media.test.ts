import { describe, test, expect, mock, beforeEach, type Mock } from "bun:test"

type MockFileHandle = FileSystemFileHandle & {
	move: (name: string) => Promise<void>
}

const createMockFileHandle = (name: string, size = 1024): MockFileHandle => {
	const file = new File([new Uint8Array(size)], name, {
		type: "application/octet-stream",
	})

	return {
		createWritable: mock(() => Promise.reject(new Error("not writable"))),
		getFile: mock(() => Promise.resolve(file)),
		isSameEntry: mock(() => Promise.resolve(false)),
		kind: "file",
		move: mock(() => Promise.resolve()) as unknown as (
			name: string,
		) => Promise<void>,
		name,
	} as unknown as MockFileHandle
}

type MockDirHandle = FileSystemDirectoryHandle & {
	queryPermission: (opts: { mode: "readwrite" }) => Promise<PermissionState>
	requestPermission: (opts: { mode: "readwrite" }) => Promise<PermissionState>
}

const createMockDirectoryHandle = (
	name: string,
	entries: Record<string, unknown> = {},
): MockDirHandle => {
	const getDirectoryHandle = mock(
		(dirName: string, opts?: { create?: boolean }) => {
			if (dirName in entries) {
				return Promise.resolve(
					entries[dirName] as FileSystemDirectoryHandle,
				)
			}

			if (opts?.create) {
				const dir = createMockDirectoryHandle(dirName)
				entries[dirName] = dir

				return Promise.resolve(
					dir as unknown as FileSystemDirectoryHandle,
				)
			}

			return Promise.reject(
				new DOMException("Not found", "NotFoundError"),
			)
		},
	)

	const getFileHandle = mock(
		(fileName: string, opts?: { create?: boolean }) => {
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
		},
	)

	const entriesArray = Object.entries(entries).map(([key, value]) => [
		key,
		value,
	]) as [string, FileSystemHandle][]

	const values = mock(function* (): Generator<FileSystemHandle> {
		for (const [, value] of entriesArray) {
			yield value
		}
	})

	return {
		getDirectoryHandle,
		getFileHandle,
		kind: "directory",
		name,
		queryPermission: mock(() =>
			Promise.resolve("granted" as PermissionState),
		),
		removeEntry: mock(() => Promise.resolve()),
		requestPermission: mock(() =>
			Promise.resolve("granted" as PermissionState),
		),
		resolve: mock(() => Promise.resolve<string[] | null>(null)),
		values,
	} as unknown as MockDirHandle
}

const PROJECT_ID = "proj-123"
const RECORDING_ID = "rec-456"

const makeFragment = (
	overrides: Partial<{
		id: string
		filePath: string
		duration: number | null
		createdAt: string
		name: string
		size: number
	}> = {},
) => ({
	createdAt: "2025-01-01T00:00:00Z",
	duration: null as number | null,
	filePath: RECORDING_ID,
	id: "frag-1",
	name: "Test Fragment",
	size: 1024,
	...overrides,
})

beforeEach(() => {
	mock.restore()
})

describe("resolveFragmentMedia", () => {
	test("returns missing when rootDirHandle is null", async () => {
		const { resolveFragmentMedia } = await import("./fragment-media")
		const result = await resolveFragmentMedia(
			makeFragment(),
			PROJECT_ID,
			null,
		)

		expect(result.state).toBe("missing")
		expect(result.webmFile).toBeNull()
		expect(result.frames).toBeNull()
	})

	test("returns missing when recording directory does not exist", async () => {
		const rootDir = createMockDirectoryHandle("root")
		const { resolveFragmentMedia } = await import("./fragment-media")

		const result = await resolveFragmentMedia(
			makeFragment(),
			PROJECT_ID,
			rootDir,
		)

		expect(result.state).toBe("missing")
		expect(result.webmFile).toBeNull()
	})

	test("returns synced when only webm exists", async () => {
		const webm = createMockFileHandle("recording.webm", 50000)
		const recordingDirEntries: Record<string, unknown> = {}
		recordingDirEntries["recording.webm"] = webm
		const recordingDir = createMockDirectoryHandle(
			RECORDING_ID,
			recordingDirEntries,
		)
		const projectDir = createMockDirectoryHandle(PROJECT_ID, {
			[RECORDING_ID]: recordingDir,
		})
		const rootDir = createMockDirectoryHandle("root", {
			[PROJECT_ID]: projectDir,
		})

		const { resolveFragmentMedia } = await import("./fragment-media")
		const result = await resolveFragmentMedia(
			makeFragment({ duration: 10.5 }),
			PROJECT_ID,
			rootDir,
		)

		expect(result.state).toBe("synced")
		expect(result.webmFile).not.toBeNull()
		expect(result.webmFile?.name).toBe("recording.webm")
		expect(result.frames).toBeNull()
		expect(result.duration).toBe(10.5)
	})

	test("returns synced when frames directory exists but is empty", async () => {
		const webm = createMockFileHandle("recording.webm")
		const framesDir = createMockDirectoryHandle("frames", {})
		const recordingDirEntries: Record<string, unknown> = {}
		recordingDirEntries["recording.webm"] = webm
		recordingDirEntries.frames = framesDir
		const recordingDir = createMockDirectoryHandle(
			RECORDING_ID,
			recordingDirEntries,
		)
		const projectDir = createMockDirectoryHandle(PROJECT_ID, {
			[RECORDING_ID]: recordingDir,
		})
		const rootDir = createMockDirectoryHandle("root", {
			[PROJECT_ID]: projectDir,
		})

		const { resolveFragmentMedia } = await import("./fragment-media")
		const result = await resolveFragmentMedia(
			makeFragment(),
			PROJECT_ID,
			rootDir,
		)

		expect(result.state).toBe("synced")
		expect(result.frames).not.toBeNull()
		expect(result.frames?.length).toBe(0)
	})

	test("returns owned when both webm and frames exist", async () => {
		const webm = createMockFileHandle("recording.webm")
		const frame0 = createMockFileHandle("frame_000000.jpg")
		const frame1 = createMockFileHandle("frame_000001.jpg")
		const framesDirEntries: Record<string, unknown> = {}
		framesDirEntries["frame_000000.jpg"] = frame0
		framesDirEntries["frame_000001.jpg"] = frame1
		const framesDir = createMockDirectoryHandle("frames", framesDirEntries)
		const recordingDirEntries: Record<string, unknown> = {}
		recordingDirEntries["recording.webm"] = webm
		recordingDirEntries.frames = framesDir
		const recordingDir = createMockDirectoryHandle(
			RECORDING_ID,
			recordingDirEntries,
		)
		const projectDir = createMockDirectoryHandle(PROJECT_ID, {
			[RECORDING_ID]: recordingDir,
		})
		const rootDir = createMockDirectoryHandle("root", {
			[PROJECT_ID]: projectDir,
		})

		const { resolveFragmentMedia } = await import("./fragment-media")
		const result = await resolveFragmentMedia(
			makeFragment(),
			PROJECT_ID,
			rootDir,
		)

		expect(result.state).toBe("owned")
		expect(result.webmFile).not.toBeNull()
		expect(result.frames).not.toBeNull()
		expect(result.frames?.length).toBe(2)
	})

	test("returns frames sorted by frame index", async () => {
		const frame1 = createMockFileHandle("frame_000001.jpg")
		const frame0 = createMockFileHandle("frame_000000.jpg")
		const frame9 = createMockFileHandle("frame_000009.jpg")
		const webm = createMockFileHandle("recording.webm")
		const framesDirEntries: Record<string, unknown> = {}
		framesDirEntries["frame_000001.jpg"] = frame1
		framesDirEntries["frame_000000.jpg"] = frame0
		framesDirEntries["frame_000009.jpg"] = frame9
		const framesDir = createMockDirectoryHandle("frames", framesDirEntries)
		const recordingDirEntries: Record<string, unknown> = {}
		recordingDirEntries["recording.webm"] = webm
		recordingDirEntries.frames = framesDir
		const recordingDir = createMockDirectoryHandle(
			RECORDING_ID,
			recordingDirEntries,
		)
		const projectDir = createMockDirectoryHandle(PROJECT_ID, {
			[RECORDING_ID]: recordingDir,
		})
		const rootDir = createMockDirectoryHandle("root", {
			[PROJECT_ID]: projectDir,
		})

		const { resolveFragmentMedia } = await import("./fragment-media")
		const result = await resolveFragmentMedia(
			makeFragment(),
			PROJECT_ID,
			rootDir,
		)

		expect(result.frames?.[0]?.index).toBe(0)
		expect(result.frames?.[1]?.index).toBe(1)
		expect(result.frames?.[2]?.index).toBe(9)
	})

	test("ignores non-frame files in frames directory", async () => {
		const webm = createMockFileHandle("recording.webm")
		const framesDirEntries: Record<string, unknown> = {}
		framesDirEntries["recording.webm"] =
			createMockFileHandle("recording.webm")
		framesDirEntries["frame_000000.jpg"] =
			createMockFileHandle("frame_000000.jpg")
		framesDirEntries["thumbs.db"] = createMockFileHandle("thumbs.db")
		const framesDir = createMockDirectoryHandle("frames", framesDirEntries)
		const recordingDirEntries: Record<string, unknown> = {}
		recordingDirEntries["recording.webm"] = webm
		recordingDirEntries.frames = framesDir
		const recordingDir = createMockDirectoryHandle(
			RECORDING_ID,
			recordingDirEntries,
		)
		const projectDir = createMockDirectoryHandle(PROJECT_ID, {
			[RECORDING_ID]: recordingDir,
		})
		const rootDir = createMockDirectoryHandle("root", {
			[PROJECT_ID]: projectDir,
		})

		const { resolveFragmentMedia } = await import("./fragment-media")
		const result = await resolveFragmentMedia(
			makeFragment(),
			PROJECT_ID,
			rootDir,
		)

		expect(result.frames?.length).toBe(1)
		expect(result.frames?.[0]?.index).toBe(0)
	})

	test("uses fragment duration when provided", async () => {
		const webm = createMockFileHandle("recording.webm")
		const recordingDirEntries: Record<string, unknown> = {}
		recordingDirEntries["recording.webm"] = webm
		const recordingDir = createMockDirectoryHandle(
			RECORDING_ID,
			recordingDirEntries,
		)
		const projectDir = createMockDirectoryHandle(PROJECT_ID, {
			[RECORDING_ID]: recordingDir,
		})
		const rootDir = createMockDirectoryHandle("root", {
			[PROJECT_ID]: projectDir,
		})

		const { resolveFragmentMedia } = await import("./fragment-media")
		const result = await resolveFragmentMedia(
			makeFragment({ duration: 30 }),
			PROJECT_ID,
			rootDir,
		)

		expect(result.duration).toBe(30)
	})

	test("handles project directory not found", async () => {
		const rootDir = createMockDirectoryHandle("root", {})
		const { resolveFragmentMedia } = await import("./fragment-media")

		const result = await resolveFragmentMedia(
			makeFragment(),
			PROJECT_ID,
			rootDir,
		)

		expect(result.state).toBe("missing")
	})

	test("handles recording directory not found when project exists", async () => {
		const projectDir = createMockDirectoryHandle(PROJECT_ID, {})
		const rootDir = createMockDirectoryHandle("root", {
			[PROJECT_ID]: projectDir,
		})
		const { resolveFragmentMedia } = await import("./fragment-media")

		const result = await resolveFragmentMedia(
			makeFragment({ filePath: "nonexistent-rec" }),
			PROJECT_ID,
			rootDir,
		)

		expect(result.state).toBe("missing")
	})

	test("handles directory permission errors gracefully", async () => {
		const rootDir = createMockDirectoryHandle("root")
		const getDirMock = rootDir.getDirectoryHandle.bind(rootDir) as Mock<
			(...args: unknown[]) => unknown
		>
		getDirMock.mockRejectedValue(
			new DOMException("Permission denied", "NotAllowedError") as never,
		)

		const { resolveFragmentMedia } = await import("./fragment-media")
		const result = await resolveFragmentMedia(
			makeFragment(),
			PROJECT_ID,
			rootDir,
		)

		expect(result.state).toBe("missing")
	})

	test("handles webm file read errors gracefully", async () => {
		const recordingDir = createMockDirectoryHandle(RECORDING_ID, {})
		const getFileMock = recordingDir.getFileHandle.bind(
			recordingDir,
		) as Mock<(...args: unknown[]) => unknown>
		getFileMock.mockRejectedValue(
			new DOMException("File not found", "NotFoundError") as never,
		)
		const projectDir = createMockDirectoryHandle(PROJECT_ID, {
			[RECORDING_ID]: recordingDir,
		})
		const rootDir = createMockDirectoryHandle("root", {
			[PROJECT_ID]: projectDir,
		})

		const { resolveFragmentMedia } = await import("./fragment-media")
		const result = await resolveFragmentMedia(
			makeFragment(),
			PROJECT_ID,
			rootDir,
		)

		expect(result.state).toBe("missing")
	})
})

describe("resolveFragmentsMedia", () => {
	test("returns a map of fragment id to result for all fragments", async () => {
		const webm1 = createMockFileHandle("recording.webm")
		const recDir1Entries: Record<string, unknown> = {}
		recDir1Entries["recording.webm"] = webm1
		const recDir1 = createMockDirectoryHandle("rec-1", recDir1Entries)
		const projectDirEntries: Record<string, unknown> = {}
		projectDirEntries["rec-1"] = recDir1
		const projectDir = createMockDirectoryHandle(
			PROJECT_ID,
			projectDirEntries,
		)
		const rootDir = createMockDirectoryHandle("root", {
			[PROJECT_ID]: projectDir,
		})

		const { resolveFragmentsMedia } = await import("./fragment-media")
		const fragments = [
			makeFragment({ filePath: "rec-1", id: "frag-owned" }),
			makeFragment({ filePath: "rec-404", id: "frag-missing" }),
		]

		const results = await resolveFragmentsMedia(
			fragments,
			PROJECT_ID,
			rootDir,
		)

		expect(results.size).toBe(2)
		expect(results.get("frag-owned")?.state).toBe("synced")
		expect(results.get("frag-missing")?.state).toBe("missing")
	})

	test("returns empty map for empty fragments array", async () => {
		const rootDir = createMockDirectoryHandle("root")
		const { resolveFragmentsMedia } = await import("./fragment-media")

		const results = await resolveFragmentsMedia([], PROJECT_ID, rootDir)

		expect(results.size).toBe(0)
	})

	test("returns all missing when rootDirHandle is null", async () => {
		const { resolveFragmentsMedia } = await import("./fragment-media")
		const fragments = [
			makeFragment({ id: "frag-1" }),
			makeFragment({ id: "frag-2" }),
		]

		const results = await resolveFragmentsMedia(fragments, PROJECT_ID, null)

		expect(results.size).toBe(2)
		for (const result of results.values()) {
			expect(result.state).toBe("missing")
		}
	})
})
