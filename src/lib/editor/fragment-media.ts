export type FragmentDescriptor = {
	duration: number | null
	filePath: string
	id: string
}

export type FragmentMediaResult = {
	duration: number
	webmFile: File | null
}

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

export const resolveFragmentMedia = async (
	fragment: FragmentDescriptor,
	projectId: string,
	rootDirHandle: FileSystemDirectoryHandle | null,
): Promise<FragmentMediaResult> => {
	if (!rootDirHandle) {
		return { duration: fragment.duration ?? 0, webmFile: null }
	}

	const recordingDir = await getRecordingDir(
		rootDirHandle,
		projectId,
		fragment.filePath,
	)

	if (!recordingDir) {
		return { duration: fragment.duration ?? 0, webmFile: null }
	}

	const webmFile = await getWebmFile(recordingDir)

	return { duration: fragment.duration ?? 0, webmFile }
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
