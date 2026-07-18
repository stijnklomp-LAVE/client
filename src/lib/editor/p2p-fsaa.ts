export type TransferHeader = {
	fileName: string
	fileSize: number
	projectId: string
	recordingId: string
}

const getRecordingDir = async (
	rootDir: FileSystemDirectoryHandle,
	projectId: string,
	recordingId: string,
	create = false,
): Promise<FileSystemDirectoryHandle | null> => {
	try {
		const projectDir = await rootDir.getDirectoryHandle(projectId, {
			create,
		})

		return await projectDir.getDirectoryHandle(recordingId, { create })
	} catch {
		return null
	}
}

const CHUNK_SIZE = 16 * 1024 // 16KB

export const sendFragmentViaDataChannel = async (
	rootDir: FileSystemDirectoryHandle,
	projectId: string,
	recordingId: string,
	channel: RTCDataChannel,
): Promise<boolean> => {
	if (channel.readyState !== "open") return false

	const recordingDir = await getRecordingDir(rootDir, projectId, recordingId)

	if (!recordingDir) return false

	let fileHandle: FileSystemFileHandle

	try {
		fileHandle = await recordingDir.getFileHandle("recording.webm")
	} catch {
		return false
	}

	const file = await fileHandle.getFile()

	const header: TransferHeader = {
		fileName: "recording.webm",
		fileSize: file.size,
		projectId,
		recordingId,
	}

	channel.send(JSON.stringify(header))

	const buffer = await file.arrayBuffer()
	let offset = 0

	while (offset < buffer.byteLength) {
		const end = Math.min(offset + CHUNK_SIZE, buffer.byteLength)
		const chunk = buffer.slice(offset, end)
		channel.send(chunk)
		offset = end
	}

	return true
}

export const receiveFragmentViaDataChannel = async (
	rootDir: FileSystemDirectoryHandle,
	headerJson: string,
	chunks: ArrayBuffer[],
): Promise<void> => {
	const header: TransferHeader = JSON.parse(headerJson) as TransferHeader

	const recordingDir = await getRecordingDir(
		rootDir,
		header.projectId,
		header.recordingId,
		true,
	)

	if (!recordingDir) {
		throw new Error(
			`Failed to create directory ${header.projectId}/${header.recordingId}`,
		)
	}

	const fileHandle = await recordingDir.getFileHandle("recording.webm", {
		create: true,
	})

	const writable = await fileHandle.createWritable()

	for (const chunk of chunks) {
		await writable.write(chunk)
	}

	await writable.close()
}
