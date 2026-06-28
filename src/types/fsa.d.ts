interface FileSystemWritableFileStream extends WritableStream {
	write(data: Blob | Uint8Array | string): Promise<void>
	seek(position: number): Promise<void>
	truncate(size: number): Promise<void>
}

interface FileSystemFileHandle {
	createWritable(options?: {
		keepExistingData?: boolean
	}): Promise<FileSystemWritableFileStream>
	getFile(): Promise<File>
}

interface FileSystemDirectoryHandle {
	name: string
	getFileHandle(
		name: string,
		options?: { create?: boolean },
	): Promise<FileSystemFileHandle>
	getDirectoryHandle(
		name: string,
		options?: { create?: boolean },
	): Promise<FileSystemDirectoryHandle>
	removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>
	values(): AsyncIterableIterator<
		FileSystemFileHandle | FileSystemDirectoryHandle
	>
}

declare function showDirectoryPicker(options?: {
	id?: string
	mode?: "read" | "readwrite"
}): Promise<FileSystemDirectoryHandle>
