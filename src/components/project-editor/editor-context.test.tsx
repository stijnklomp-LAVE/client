import { vi } from "bun:test"

const mocks = {
	getPersistedDirectoryHandle: vi.fn<
		() => Promise<FileSystemDirectoryHandle | null>
	>(() => Promise.resolve(null)),
	getStoredDirectoryName: vi.fn(() => null),
	setStoredDirectoryName: vi.fn(),
}

vi.mock("next-intl", () => ({
	useTranslations: () => (key: string) => key,
}))

vi.mock("@/lib/editor/compositor", () => ({
	computeDuration: () => 0,
}))

vi.mock("@/lib/editor/use-recording", () => ({
	useRecording: () => ({
		config: { codec: "vp9" as const, fps: 30, quality: 80 },
		elapsedMs: 0,
		error: null,
		isRecording: false,
		pauseRecording: vi.fn(),
		recordingDurationSec: 5.432,
		resumeRecording: vi.fn(),
		startRecording: vi.fn(() => Promise.resolve()),
		stopRecording: vi.fn(() =>
			Promise.resolve({ recordingId: "rec-123", size: 1024 }),
		),
		updateConfig: vi.fn(),
	}),
}))

vi.mock("@/lib/editor/raw-frames-directory", () => ({
	getPersistedDirectoryHandle: () => mocks.getPersistedDirectoryHandle(),
	getStoredDirectoryName: () => mocks.getStoredDirectoryName(),
	setStoredDirectoryName: (name: string | null) =>
		mocks.setStoredDirectoryName(name),
}))

import "@testing-library/jest-dom"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { MantineProvider } from "@mantine/core"
import { afterEach, describe, expect, it, beforeEach } from "bun:test"

import { EditorProvider, useEditorContext } from "./editor-context"

const TestConsumer = (): React.JSX.Element => {
	const ctx = useEditorContext()
	return (
		<div>
			<span data-testid="mode">{ctx.mode}</span>
		</div>
	)
}

const renderProvider = (initialFragments = []) =>
	render(
		<MantineProvider>
			<EditorProvider
				initialLayers={[]}
				initialFragments={initialFragments}
				projectId="test-project">
				<TestConsumer />
			</EditorProvider>
		</MantineProvider>,
	)

beforeEach(() => {
	mocks.getPersistedDirectoryHandle.mockReset()
	mocks.getStoredDirectoryName.mockReset()
	mocks.setStoredDirectoryName.mockReset()
	mocks.getPersistedDirectoryHandle.mockImplementation(() =>
		Promise.resolve(null),
	)
	mocks.getStoredDirectoryName.mockImplementation(() => null)
})

afterEach(() => {
	cleanup()
})

describe("EditorProvider", () => {
	describe("initial state", () => {
		it("starts in editing mode by default", () => {
			renderProvider()
			expect(screen.getByTestId("mode").textContent).toBe("editing")
		})
	})

	describe("directory handle restoration", () => {
		it("calls getPersistedDirectoryHandle on mount", async () => {
			renderProvider()
			await waitFor(() => {
				expect(mocks.getPersistedDirectoryHandle).toHaveBeenCalled()
			})
		})

		it("persists directory name via setStoredDirectoryName when handle restored", async () => {
			mocks.getPersistedDirectoryHandle.mockImplementation(() =>
				Promise.resolve({
					name: "my-videos",
					queryPermission: () =>
						Promise.resolve("granted" as PermissionState),
					requestPermission: () =>
						Promise.resolve("granted" as PermissionState),
				} as unknown as FileSystemDirectoryHandle),
			)

			renderProvider()

			await waitFor(() => {
				expect(mocks.setStoredDirectoryName).toHaveBeenCalledWith(
					"my-videos",
				)
			})
		})

		it("reads stored directory name when handle is null and fragments exist", async () => {
			renderProvider([
				{
					createdAt: new Date().toISOString(),
					duration: 5.0,
					filePath: "rec-1",
					id: "frag-1",
					name: "test",
					size: 100,
				} as never,
			])

			await waitFor(() => {
				expect(mocks.getStoredDirectoryName).toHaveBeenCalled()
			})
		})
	})
})
