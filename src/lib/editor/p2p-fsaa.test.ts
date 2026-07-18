import { describe, test, expect, mock, beforeEach } from "bun:test"

type MockFileHandle = FileSystemFileHandle & {
	move: (name: string) => Promise<void>
}

const createMockFileHandle = (
	name: string,
	content: Uint8Array,
): MockFileHandle => {
	const file = new File([content as unknown as BlobPart], name, {
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

const createMockDirHandle = (
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
	)

	const getFileHandle = mock(
		(fileName: string, opts?: { create?: boolean }) => {
			if (fileName in entries) {
				return Promise.resolve(
					entries[fileName] as FileSystemFileHandle,
				)
			}

			if (opts?.create) {
				const handle = createMockFileHandle(fileName, new Uint8Array(0))
				entries[fileName] = handle

				return Promise.resolve(handle)
			}

			return Promise.reject(
				new DOMException("Not found", "NotFoundError"),
			)
		},
	)

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
		values: mock(() => {
			function* empty(): Generator<FileSystemHandle> {
				// empty
			}

			return empty()
		}),
	} as unknown as MockDirHandle
}

beforeEach(() => {
	mock.restore()
})

describe("sendFragmentViaDataChannel", () => {
	test("sends header then binary chunks from fsaa file", async () => {
		const fileContent = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
		const sentMessages: (string | ArrayBuffer)[] = []

		const mockChannel = {
			readyState: "open",
			send: mock((data: string | ArrayBuffer) => {
				sentMessages.push(data)
			}),
		} as unknown as RTCDataChannel

		const webmHandle = createMockFileHandle("recording.webm", fileContent)
		const recordingDirEntries: Record<string, unknown> = {}
		recordingDirEntries["recording.webm"] = webmHandle
		const recordingDir = createMockDirHandle("rec-1", recordingDirEntries)

		const projectDirEntries: Record<string, unknown> = {}
		projectDirEntries["rec-1"] = recordingDir
		const projectDir = createMockDirHandle("proj-123", projectDirEntries)

		const rootDirEntries: Record<string, unknown> = {}
		rootDirEntries["proj-123"] = projectDir
		const rootDirWithContent = createMockDirHandle("root", rootDirEntries)

		const { sendFragmentViaDataChannel } = await import("./p2p-fsaa")

		await sendFragmentViaDataChannel(
			rootDirWithContent,
			"proj-123",
			"rec-1",
			mockChannel,
		)

		expect(sentMessages.length).toBeGreaterThanOrEqual(2)

		const headerMsg = sentMessages[0] as string
		const header = JSON.parse(headerMsg) as {
			fileName: string
			fileSize: number
			projectId: string
			recordingId: string
		}
		expect(header.fileName).toBe("recording.webm")
		expect(header.fileSize).toBe(10)
		expect(header.projectId).toBe("proj-123")
		expect(header.recordingId).toBe("rec-1")

		const binaryParts = sentMessages.slice(1) as ArrayBuffer[]
		const totalBytes = binaryParts.reduce(
			(sum, buf) => sum + buf.byteLength,
			0,
		)
		expect(totalBytes).toBe(10)
	})

	test("does nothing when channel is not open", async () => {
		const sendFn = mock(() => undefined)
		const mockChannel = {
			readyState: "closing",
			send: sendFn,
		} as unknown as RTCDataChannel

		const rootDir = createMockDirHandle("root")

		const { sendFragmentViaDataChannel } = await import("./p2p-fsaa")

		await sendFragmentViaDataChannel(
			rootDir,
			"proj-123",
			"rec-1",
			mockChannel,
		)

		expect(sendFn).not.toHaveBeenCalled()
	})

	test("returns false when recording file is not found", async () => {
		const sendFn = mock(() => undefined)
		const mockChannel = {
			readyState: "open",
			send: sendFn,
		} as unknown as RTCDataChannel

		const rootDirEntries: Record<string, unknown> = {}
		rootDirEntries["proj-123"] = createMockDirHandle("proj-123", {})
		const rootDir = createMockDirHandle("root", rootDirEntries)

		const { sendFragmentViaDataChannel } = await import("./p2p-fsaa")

		const result = await sendFragmentViaDataChannel(
			rootDir,
			"proj-123",
			"nonexistent",
			mockChannel,
		)

		expect(result).toBe(false)
		expect(sendFn).not.toHaveBeenCalled()
	})
})

describe("receiveFragmentViaDataChannel", () => {
	test("saves received chunks to fsaa directory", async () => {
		const projectDir = createMockDirHandle("proj-123", {})
		const recordingDir = createMockDirHandle("rec-1", {})
		const rootDirWithContentEntries: Record<string, unknown> = {}
		rootDirWithContentEntries["proj-123"] = projectDir
		const rootDirWithContent = createMockDirHandle(
			"root",
			rootDirWithContentEntries,
		)

		const mockWritable = {
			close: mock(() => Promise.resolve()),
			write: mock(() => Promise.resolve()),
		}

		projectDir.getDirectoryHandle = mock(
			(_dirName: string, opts?: { create?: boolean }) => {
				expect(opts?.create).toBe(true)

				return Promise.resolve(recordingDir)
			},
		)

		recordingDir.getFileHandle = mock(
			(_fileName: string, opts?: { create?: boolean }) => {
				expect(opts?.create).toBe(true)
				const fileHandle = {
					createWritable: mock(() => Promise.resolve(mockWritable)),
					getFile: mock(() =>
						Promise.resolve(new File([], "recording.webm")),
					),
					isSameEntry: mock(() => Promise.resolve(false)),
					kind: "file",
					move: mock(() => Promise.resolve()),
					name: "recording.webm",
				} as unknown as MockFileHandle

				return Promise.resolve(fileHandle)
			},
		)

		const { receiveFragmentViaDataChannel } = await import("./p2p-fsaa")

		const header = JSON.stringify({
			fileName: "recording.webm",
			fileSize: 5,
			projectId: "proj-123",
			recordingId: "rec-1",
		})

		const chunk = new Uint8Array([10, 20, 30, 40, 50]).buffer

		await receiveFragmentViaDataChannel(rootDirWithContent, header, [chunk])

		expect(mockWritable.write).toHaveBeenCalledWith(
			expect.objectContaining({ byteLength: 5 }),
		)
		expect(mockWritable.close).toHaveBeenCalled()
	})

	test("handles multiple chunks", async () => {
		const projectDir = createMockDirHandle("proj-123", {})
		const recordingDir = createMockDirHandle("rec-1", {})

		const rootDirWithContentEntries: Record<string, unknown> = {}
		rootDirWithContentEntries["proj-123"] = projectDir
		const rootDirWithContent = createMockDirHandle(
			"root",
			rootDirWithContentEntries,
		)

		const writeCalls: ArrayBuffer[] = []
		const mockWritable = {
			close: mock(() => Promise.resolve()),
			write: mock((data: ArrayBuffer) => {
				writeCalls.push(data)

				return Promise.resolve()
			}),
		}

		projectDir.getDirectoryHandle = mock(() =>
			Promise.resolve(recordingDir),
		)
		recordingDir.getFileHandle = mock(() => {
			const fileHandle = {
				createWritable: mock(() => Promise.resolve(mockWritable)),
				getFile: mock(() =>
					Promise.resolve(new File([], "recording.webm")),
				),
				isSameEntry: mock(() => Promise.resolve(false)),
				kind: "file",
				move: mock(() => Promise.resolve()),
				name: "recording.webm",
			} as unknown as MockFileHandle

			return Promise.resolve(fileHandle)
		})

		const { receiveFragmentViaDataChannel } = await import("./p2p-fsaa")

		const header = JSON.stringify({
			fileName: "recording.webm",
			fileSize: 10,
			projectId: "proj-123",
			recordingId: "rec-1",
		})

		const chunk1 = new Uint8Array([1, 2, 3, 4, 5]).buffer
		const chunk2 = new Uint8Array([6, 7, 8, 9, 10]).buffer

		await receiveFragmentViaDataChannel(rootDirWithContent, header, [
			chunk1,
			chunk2,
		])

		expect(writeCalls.length).toBe(2)
		expect(mockWritable.close).toHaveBeenCalled()
	})

	test("handles empty data gracefully", async () => {
		const projectDir = createMockDirHandle("proj-123", {})
		const recordingDir = createMockDirHandle("rec-1", {})

		const rootDirWithContentEntries: Record<string, unknown> = {}
		rootDirWithContentEntries["proj-123"] = projectDir
		const rootDirWithContent = createMockDirHandle(
			"root",
			rootDirWithContentEntries,
		)

		const mockWritable = {
			close: mock(() => Promise.resolve()),
			write: mock(() => Promise.resolve()),
		}

		projectDir.getDirectoryHandle = mock(() =>
			Promise.resolve(recordingDir),
		)
		recordingDir.getFileHandle = mock(() => {
			const fileHandle = {
				createWritable: mock(() => Promise.resolve(mockWritable)),
				getFile: mock(() =>
					Promise.resolve(new File([], "recording.webm")),
				),
				isSameEntry: mock(() => Promise.resolve(false)),
				kind: "file",
				move: mock(() => Promise.resolve()),
				name: "recording.webm",
			} as unknown as MockFileHandle

			return Promise.resolve(fileHandle)
		})

		const { receiveFragmentViaDataChannel } = await import("./p2p-fsaa")

		const header = JSON.stringify({
			fileName: "recording.webm",
			fileSize: 0,
			projectId: "proj-123",
			recordingId: "rec-1",
		})

		await receiveFragmentViaDataChannel(rootDirWithContent, header, [])

		expect(mockWritable.close).toHaveBeenCalled()
	})
})
