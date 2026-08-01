import { describe, test, expect, mock, beforeEach } from "bun:test"

const createMockWritable = () => {
	const write = mock(() => Promise.resolve())
	const close = mock(() => Promise.resolve())

	return { close, write }
}

type MockFileHandle = FileSystemFileHandle & {
	move: (name: string) => Promise<void>
}
type MockDirHandle = FileSystemDirectoryHandle & {
	queryPermission: (opts: { mode: "readwrite" }) => Promise<PermissionState>
	requestPermission: (opts: { mode: "readwrite" }) => Promise<PermissionState>
}

const createMockFileHandle = (name: string): MockFileHandle => {
	const file = new File([""], name, { type: "application/octet-stream" })
	const writable = createMockWritable()

	return {
		createWritable: mock(() => Promise.resolve(writable)),
		getFile: mock(() => Promise.resolve(file)),
		isSameEntry: mock(() => Promise.resolve(false)),
		kind: "file",
		move: mock((newName: string) => {
			Object.defineProperty(file, "name", { value: newName })
		}) as unknown as (name: string) => Promise<void>,
		name,
	} as unknown as MockFileHandle
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

	const queryPermission = mock(() =>
		Promise.resolve("granted" as PermissionState),
	)
	const removeEntry = mock(() => Promise.resolve())
	const requestPermission = mock(() =>
		Promise.resolve("granted" as PermissionState),
	)
	const resolve = mock(() => Promise.resolve<string[] | null>(null))
	const values = mock(function* (): Generator<never> {
		// no-op generator for FileSystemDirectoryHandle.values()
	})

	return {
		getDirectoryHandle,
		getFileHandle,
		kind: "directory",
		name,
		queryPermission,
		removeEntry,
		requestPermission,
		resolve,
		values,
	} as unknown as MockDirHandle
}

const mockDbStore: Record<string, unknown> = {}

const createMockRequest = () => {
	let upgradeHandler: ((evt: Event) => void) | null = null

	const req: Record<string, unknown> = {
		result: {
			createObjectStore: mock(() => ({})),
			transaction: mock((_name: string, _mode: string) => {
				const tx: Record<string, unknown> = {
					objectStore: mock(() => {
						const store = {
							get: mock((key: string) => {
								const getReq: Record<string, unknown> = {}
								Object.defineProperties(getReq, {
									configurable: { value: true },
									onerror: {
										configurable: true,
										set(
											_fn: ((evt: Event) => void) | null,
										) {
											/* error intentionally ignored */
										},
									},
									onsuccess: {
										configurable: true,
										set(fn: ((evt: Event) => void) | null) {
											getReq.result =
												mockDbStore[key] ?? null
											fn?.(new Event("success"))
										},
									},
								})
								getReq.error = null

								return getReq
							}),
							put: mock((value: unknown, key: string) => {
								mockDbStore[key] = value
							}),
						}

						return store
					}),
				}
				Object.defineProperties(tx, {
					configurable: { value: true },
					oncomplete: {
						configurable: true,
						set(fn: ((evt: Event) => void) | null) {
							fn?.(new Event("complete"))
						},
					},
				})

				return tx
			}),
		},
	}

	Object.defineProperties(req, {
		configurable: { value: true },
		onerror: {
			configurable: true,
			set(_fn: ((evt: Event) => void) | null) {
				/* error intentionally ignored */
			},
		},
		onsuccess: {
			configurable: true,
			set(fn: ((evt: Event) => void) | null) {
				upgradeHandler?.(new Event("upgradeneeded"))
				fn?.(new Event("success"))
			},
		},
		onupgradeneeded: {
			configurable: true,
			set(fn: ((evt: Event) => void) | null) {
				upgradeHandler = fn
			},
		},
	})

	return req as unknown as IDBOpenDBRequest
}

beforeEach(() => {
	const keys = Object.keys(mockDbStore)
	for (const key of keys) {
		mockDbStore[key] = undefined
	}

	;(globalThis as Record<string, unknown>).indexedDB = {
		open: mock(() => createMockRequest()),
	}
	;(globalThis as Record<string, unknown>).showDirectoryPicker = undefined
})

describe("isFileSystemAccessSupported", () => {
	test("returns true when showDirectoryPicker exists", async () => {
		;(globalThis as Record<string, unknown>).showDirectoryPicker = mock()
		const { isFileSystemAccessSupported } =
			await import("./raw-frames-directory")
		expect(isFileSystemAccessSupported()).toBe(true)
	})

	test("returns false when showDirectoryPicker is undefined", async () => {
		const { isFileSystemAccessSupported } =
			await import("./raw-frames-directory")
		expect(isFileSystemAccessSupported()).toBe(false)
	})
})

describe("pickRawFramesDirectory", () => {
	test("returns handle when user picks a directory", async () => {
		const mockHandle = createMockDirectoryHandle("chosen-dir")
		;(globalThis as Record<string, unknown>).showDirectoryPicker = mock(
			() => Promise.resolve(mockHandle),
		)
		const { pickRawFramesDirectory } =
			await import("./raw-frames-directory")
		const result = await pickRawFramesDirectory()
		expect(result).toBe(mockHandle)
	})

	test("returns null when user cancels the picker", async () => {
		const abortError = new DOMException(
			"The user aborted a request",
			"AbortError",
		)
		;(globalThis as Record<string, unknown>).showDirectoryPicker = mock(
			() => Promise.reject(abortError),
		)
		const { pickRawFramesDirectory } =
			await import("./raw-frames-directory")
		const result = await pickRawFramesDirectory()
		expect(result).toBeNull()
	})

	test("throws when picker fails with non-abort error", async () => {
		;(globalThis as Record<string, unknown>).showDirectoryPicker = mock(
			() => Promise.reject(new Error("Permission denied")),
		)
		const { pickRawFramesDirectory } =
			await import("./raw-frames-directory")
		expect(pickRawFramesDirectory()).rejects.toThrow("Permission denied")
	})

	test("returns null when File System Access API not supported", async () => {
		const { pickRawFramesDirectory } =
			await import("./raw-frames-directory")
		const result = await pickRawFramesDirectory()
		expect(result).toBeNull()
	})
})

describe("createWebmStream", () => {
	test("creates directory hierarchy and returns a writable stream", async () => {
		const rootDir = createMockDirectoryHandle("root")
		const { createWebmStream } = await import("./raw-frames-directory")

		const writable = await createWebmStream(rootDir, "proj-123", "rec-456")

		expect(
			(
				rootDir.getDirectoryHandle as unknown as {
					mock: { calls: unknown[][] }
				}
			).mock.calls[0],
		).toEqual(["proj-123", { create: true }])
		expect(typeof writable.write).toBe("function")
		expect(typeof writable.close).toBe("function")
	})
})

describe("getWebmSize", () => {
	test("returns file size from the recording.webm file", async () => {
		const fileHandle = createMockFileHandle("recording.webm")
		fileHandle.getFile = mock(() =>
			Promise.resolve(new File([new Uint8Array(1024)], "recording.webm")),
		)
		const recordingDir = createMockDirectoryHandle("recording456")
		recordingDir.getFileHandle = mock(() => Promise.resolve(fileHandle))
		const projectDir = createMockDirectoryHandle("project123", {
			recording456: recordingDir,
		})
		const rootDir = createMockDirectoryHandle("root", {
			project123: projectDir,
		})

		const { getWebmSize } = await import("./raw-frames-directory")
		const size = await getWebmSize(rootDir, "project123", "recording456")

		expect(size).toBe(1024)
	})
})

describe("getStoredDirectoryName and setStoredDirectoryName", () => {
	test("returns null when nothing is stored", async () => {
		const { getStoredDirectoryName } =
			await import("./raw-frames-directory")
		expect(getStoredDirectoryName()).toBeNull()
	})

	test("stores and retrieves directory name", async () => {
		const { setStoredDirectoryName, getStoredDirectoryName } =
			await import("./raw-frames-directory")
		setStoredDirectoryName("my-videos")
		expect(getStoredDirectoryName()).toBe("my-videos")
	})

	test("removes stored name when set to null", async () => {
		const { setStoredDirectoryName, getStoredDirectoryName } =
			await import("./raw-frames-directory")
		setStoredDirectoryName("my-videos")
		setStoredDirectoryName(null)
		expect(getStoredDirectoryName()).toBeNull()
	})
})

describe("persistDirectoryHandle and getPersistedDirectoryHandle", () => {
	test("persists and retrieves a directory handle", async () => {
		const { persistDirectoryHandle, getPersistedDirectoryHandle } =
			await import("./raw-frames-directory")
		const handle = createMockDirectoryHandle("test-dir")
		handle.queryPermission = mock(() =>
			Promise.resolve("granted" as PermissionState),
		)

		await persistDirectoryHandle(handle)
		const retrieved = await getPersistedDirectoryHandle()

		expect(retrieved).toBe(handle)
	})

	test("returns null when permission is denied", async () => {
		const { persistDirectoryHandle, getPersistedDirectoryHandle } =
			await import("./raw-frames-directory")
		const handle = createMockDirectoryHandle("test-dir")
		handle.queryPermission = mock(() =>
			Promise.resolve("denied" as PermissionState),
		)
		handle.requestPermission = mock(() =>
			Promise.resolve("denied" as PermissionState),
		)

		await persistDirectoryHandle(handle)
		const retrieved = await getPersistedDirectoryHandle()
		expect(retrieved).toBeNull()
	})

	test("requests permission when query returns prompt", async () => {
		const { persistDirectoryHandle, getPersistedDirectoryHandle } =
			await import("./raw-frames-directory")
		const handle = createMockDirectoryHandle("test-dir")
		handle.queryPermission = mock(() =>
			Promise.resolve("prompt" as PermissionState),
		)
		const requestPermission = mock(() =>
			Promise.resolve("granted" as PermissionState),
		)
		handle.requestPermission = requestPermission

		await persistDirectoryHandle(handle)
		const retrieved = await getPersistedDirectoryHandle()
		expect(retrieved).toBe(handle)
		expect(requestPermission).toHaveBeenCalledWith({
			mode: "readwrite",
		})
	})

	test("returns null when no handle is persisted", async () => {
		const { getPersistedDirectoryHandle } =
			await import("./raw-frames-directory")
		const retrieved = await getPersistedDirectoryHandle()
		expect(retrieved).toBeNull()
	})
})
