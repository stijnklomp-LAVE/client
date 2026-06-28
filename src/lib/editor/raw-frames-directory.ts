const DIRECTORY_HANDLE_KEY = "editor.rawFramesDirectory"

export const pickRawFramesDirectory = async (
	projectId: string,
): Promise<FileSystemDirectoryHandle | null> => {
	try {
		const handle: FileSystemDirectoryHandle | null =
			await showDirectoryPicker({
				id: `raw-frames-${projectId}`,
				mode: "readwrite",
			})

		return handle
	} catch {
		return null
	}
}

export const saveFrameToDirectory = async (
	dirHandle: FileSystemDirectoryHandle,
	frameIndex: number,
	blob: Blob,
	format: "jpeg" | "png" = "jpeg",
): Promise<string> => {
	const ext = format === "jpeg" ? "jpg" : "png"
	const name = `frame_${String(frameIndex).padStart(6, "0")}.${ext}`
	const fileHandle = await dirHandle.getFileHandle(name, { create: true })
	const writable = await fileHandle.createWritable()
	await writable.write(blob)
	await writable.close()

	return name
}

export const getStoredDirectoryName = (): string | null => {
	try {
		return localStorage.getItem(DIRECTORY_HANDLE_KEY)
	} catch {
		return null
	}
}

export const setStoredDirectoryName = (name: string | null): void => {
	try {
		if (name) {
			localStorage.setItem(DIRECTORY_HANDLE_KEY, name)
		} else {
			localStorage.removeItem(DIRECTORY_HANDLE_KEY)
		}
	} catch {
		// localStorage unavailable
	}
}
