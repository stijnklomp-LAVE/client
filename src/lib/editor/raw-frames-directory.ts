const DB_NAME = "editor-storage"
const DB_VERSION = 1
const STORE_NAME = "handles"
const HANDLE_KEY = "rootDirectoryHandle"

const openDb = (): Promise<IDBDatabase> =>
	new Promise((resolve, reject) => {
		const req = indexedDB.open(DB_NAME, DB_VERSION)
		req.onupgradeneeded = () => {
			req.result.createObjectStore(STORE_NAME)
		}

		req.onsuccess = () => {
			resolve(req.result)
		}

		req.onerror = () => {
			reject(new Error(req.error?.message ?? "IndexedDB error"))
		}
	})

export const persistDirectoryHandle = async (
	handle: FileSystemDirectoryHandle,
): Promise<void> => {
	const db = await openDb()

	return new Promise((resolve, reject) => {
		const tx = db.transaction(STORE_NAME, "readwrite")
		tx.objectStore(STORE_NAME).put(handle, HANDLE_KEY)
		tx.oncomplete = () => {
			resolve()
		}

		tx.onerror = () => {
			reject(new Error(tx.error?.message ?? "Transaction error"))
		}
	})
}

export const getPersistedDirectoryHandle =
	async (): Promise<FileSystemDirectoryHandle | null> => {
		// E2E test escape hatch — mock handle injected via addInitScript
		if (
			typeof window !== "undefined" &&
			(window as unknown as Record<string, unknown>).__mockRootDirHandle
		) {
			return (window as unknown as Record<string, unknown>)
				.__mockRootDirHandle as FileSystemDirectoryHandle
		}

		try {
			const db = await openDb()
			const handle = await new Promise<FileSystemDirectoryHandle | null>(
				(resolve, reject) => {
					const tx = db.transaction(STORE_NAME, "readonly")
					const req = tx.objectStore(STORE_NAME).get(HANDLE_KEY)
					req.onsuccess = () => {
						resolve(req.result as FileSystemDirectoryHandle | null)
					}

					req.onerror = () => {
						reject(
							new Error(req.error?.message ?? "IndexedDB error"),
						)
					}
				},
			)

			if (handle == null) return null

			try {
				const fsHandle = handle as FileSystemDirectoryHandle & {
					queryPermission: (opts: {
						mode: "readwrite"
					}) => Promise<PermissionState>
					requestPermission: (opts: {
						mode: "readwrite"
					}) => Promise<PermissionState>
				}
				const permission = await fsHandle.queryPermission({
					mode: "readwrite",
				})

				if (permission === "granted") return handle

				const granted = await fsHandle.requestPermission({
					mode: "readwrite",
				})

				return granted === "granted" ? handle : null
			} catch {
				return null
			}
		} catch {
			return null
		}
	}

export const isFileSystemAccessSupported = (): boolean =>
	typeof globalThis.showDirectoryPicker === "function"

export const pickRawFramesDirectory =
	async (): Promise<FileSystemDirectoryHandle | null> => {
		if (!isFileSystemAccessSupported()) return null

		try {
			const handle = await showDirectoryPicker({ mode: "readwrite" })
			await persistDirectoryHandle(handle)

			return handle
		} catch (err) {
			if (err instanceof DOMException && err.name === "AbortError") {
				return null
			}

			throw err
		}
	}

const getDir = async (
	parent: FileSystemDirectoryHandle,
	name: string,
): Promise<FileSystemDirectoryHandle> =>
	parent.getDirectoryHandle(name, { create: true })

const MAX_RETRIES = 3
const RETRY_DELAYS = [100, 500, 1_000]

const retry = async <T>(fn: () => Promise<T>, attempt = 0): Promise<T> => {
	try {
		return await fn()
	} catch (err) {
		if (attempt < MAX_RETRIES - 1) {
			await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]))

			return retry(fn, attempt + 1)
		}

		throw err
	}
}

export const saveFrame = async (
	rootDir: FileSystemDirectoryHandle,
	projectId: string,
	recordingId: string,
	frameIndex: number,
	blob: Blob,
	format: "jpeg" | "png" = "jpeg",
): Promise<string> => {
	const ext = format === "jpeg" ? "jpg" : "png"
	const padded = String(frameIndex).padStart(6, "0")
	const fileName = `frame_${padded}.${ext}`
	const tmpName = `frame_${padded}.tmp`

	return retry(async () => {
		const projectDir = await getDir(rootDir, projectId)
		const recordingDir = await getDir(projectDir, recordingId)
		const framesDir = await getDir(recordingDir, "frames")

		const tmpHandle = await framesDir.getFileHandle(tmpName, {
			create: true,
		})
		const writable = await tmpHandle.createWritable()
		await writable.write(blob)
		await writable.close()
		await (
			tmpHandle as FileSystemFileHandle & {
				move: (name: string) => Promise<void>
			}
		).move(fileName)

		return fileName
	})
}

export const createWebmStream = async (
	rootDir: FileSystemDirectoryHandle,
	projectId: string,
	recordingId: string,
): Promise<FileSystemWritableFileStream> => {
	const projectDir = await getDir(rootDir, projectId)
	const recordingDir = await getDir(projectDir, recordingId)
	const fileHandle = await recordingDir.getFileHandle("recording.webm", {
		create: true,
	})

	return fileHandle.createWritable()
}

export const getWebmSize = async (
	rootDir: FileSystemDirectoryHandle,
	projectId: string,
	recordingId: string,
): Promise<number> => {
	const projectDir = await getDir(rootDir, projectId)
	const recordingDir = await getDir(projectDir, recordingId)
	const fileHandle = await recordingDir.getFileHandle("recording.webm")
	const file = await fileHandle.getFile()

	return file.size
}

export const getStoredDirectoryName = (): string | null => {
	try {
		return localStorage.getItem("editor.rawFramesDirectory")
	} catch {
		return null
	}
}

export const setStoredDirectoryName = (name: string | null): void => {
	try {
		if (name) {
			localStorage.setItem("editor.rawFramesDirectory", name)
		} else {
			localStorage.removeItem("editor.rawFramesDirectory")
		}
	} catch {
		/* localStorage unavailable */
	}
}
