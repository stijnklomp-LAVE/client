export type FragmentState = "owned" | "synced" | "missing"

export type FragmentFrame = {
	file: File
	index: number
}

export type FragmentMediaResult = {
	duration: number
	frames: FragmentFrame[] | null
	state: FragmentState
	webmFile: File | null
}

export type FragmentDescriptor = {
	duration: number | null
	filePath: string
	id: string
}

const FRAME_REGEX = /^frame_(\d+)\.(jpg|png)$/

const getRecordingDir = async (
	rootDir: FileSystemDirectoryHandle,
	projectId: string,
	recordingId: string,
): Promise<FileSystemDirectoryHandle | null> => {
	try {
		const projectDir = await rootDir.getDirectoryHandle(projectId)

		return await projectDir.getDirectoryHandle(recordingId)
	} catch {
		return null
	}
}

const getWebmFile = async (
	recordingDir: FileSystemDirectoryHandle,
): Promise<File | null> => {
	try {
		const handle = await recordingDir.getFileHandle("recording.webm")

		return await handle.getFile()
	} catch {
		return null
	}
}

const getFrames = async (
	recordingDir: FileSystemDirectoryHandle,
): Promise<FragmentFrame[] | null> => {
	try {
		const framesDir = await recordingDir.getDirectoryHandle("frames")
		const frames: FragmentFrame[] = []

		for await (const handle of framesDir.values()) {
			if (handle.kind !== "file") continue

			const match = FRAME_REGEX.exec(handle.name)

			if (!match) continue

			const file = await handle.getFile()
			const frameIndex = Number.parseInt(match[1] ?? "0", 10)
			frames.push({ file, index: frameIndex })
		}

		frames.sort((a, b) => a.index - b.index)

		return frames
	} catch {
		return null
	}
}

export const resolveFragmentMedia = async (
	fragment: FragmentDescriptor,
	projectId: string,
	rootDirHandle: FileSystemDirectoryHandle | null,
): Promise<FragmentMediaResult> => {
	if (!rootDirHandle) {
		return {
			duration: fragment.duration ?? 0,
			frames: null,
			state: "missing",
			webmFile: null,
		}
	}

	const recordingDir = await getRecordingDir(
		rootDirHandle,
		projectId,
		fragment.filePath,
	)

	if (!recordingDir) {
		return {
			duration: fragment.duration ?? 0,
			frames: null,
			state: "missing",
			webmFile: null,
		}
	}

	const webmFile = await getWebmFile(recordingDir)

	if (!webmFile) {
		return {
			duration: fragment.duration ?? 0,
			frames: null,
			state: "missing",
			webmFile: null,
		}
	}

	const frames = await getFrames(recordingDir)

	const state: FragmentState =
		frames && frames.length > 0 ? "owned" : "synced"

	return {
		duration: fragment.duration ?? 0,
		frames,
		state,
		webmFile,
	}
}

export const resolveFragmentsMedia = async (
	fragments: FragmentDescriptor[],
	projectId: string,
	rootDirHandle: FileSystemDirectoryHandle | null,
): Promise<Map<string, FragmentMediaResult>> => {
	const results = new Map<string, FragmentMediaResult>()

	for (const fragment of fragments) {
		const result = await resolveFragmentMedia(
			fragment,
			projectId,
			rootDirHandle,
		)
		results.set(fragment.id, result)
	}

	return results
}
