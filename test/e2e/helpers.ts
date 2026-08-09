import { readFileSync } from "fs"
import { resolve } from "path"
import type { Page } from "@playwright/test"

const PROJECT_ID = "e2e-test-project"
const RECORDING_DIR = "e2e-recording"
const FIXTURE_PATH = resolve("test/fixtures/solid-red-1s.webm")

type MockDirSpec = {
	dirs: Map<string, MockDirSpec>
	files: Map<string, Uint8Array>
	name: string
}

const createMockFileHandle = (
	name: string,
	bytes: Uint8Array,
): FileSystemFileHandle =>
	({
		getFile: () => Promise.resolve(new File([bytes], name)),
		kind: "file",
		name,
		queryPermission: () => Promise.resolve("granted" as PermissionState),
		requestPermission: () => Promise.resolve("granted" as PermissionState),
	}) as unknown as FileSystemFileHandle

const createMockDirectoryHandle = (
	spec: MockDirSpec,
): FileSystemDirectoryHandle => {
	const dirHandles = new Map<string, FileSystemDirectoryHandle>()

	for (const [name, child] of spec.dirs) {
		dirHandles.set(name, createMockDirectoryHandle(child))
	}

	const fileHandles = new Map<string, FileSystemFileHandle>()

	for (const [name, bytes] of spec.files) {
		fileHandles.set(name, createMockFileHandle(name, bytes))
	}

	return {
		getDirectoryHandle: (name: string) => {
			const handle = dirHandles.get(name)

			if (!handle) {
				return Promise.reject(
					new DOMException("Not found", "NotFoundError"),
				)
			}

			return Promise.resolve(handle)
		},
		getFileHandle: (name: string) => {
			const handle = fileHandles.get(name)

			if (!handle) {
				return Promise.reject(
					new DOMException("Not found", "NotFoundError"),
				)
			}

			return Promise.resolve(handle)
		},
		kind: "directory",
		name: spec.name,
		queryPermission: () => Promise.resolve("granted" as PermissionState),
		requestPermission: () => Promise.resolve("granted" as PermissionState),
	} as unknown as FileSystemDirectoryHandle
}

export const setupMockFsaa = async (page: Page): Promise<void> => {
	const webmBytes = readFileSync(FIXTURE_PATH)
	const asBase64 = webmBytes.toString("base64")

	await page.addInitScript(
		({ b64, projectId, recordingDir }) => {
			const binary = atob(b64)
			const bytes = new Uint8Array(binary.length)
			for (let i = 0; i < binary.length; i++) {
				bytes[i] = binary.charCodeAt(i)
			}

			const rootSpec: MockDirSpec = {
				dirs: new Map([
					[
						projectId,
						{
							dirs: new Map([
								[
									recordingDir,
									{
										dirs: new Map(),
										files: new Map([
											["recording.webm", bytes],
										]),
										name: recordingDir,
									},
								],
							]),
							files: new Map(),
							name: projectId,
						},
					],
				]),
				files: new Map(),
				name: "E2E Test Root",
			}

			// Set the mock handle on window so getPersistedDirectoryHandle can pick it up.
			// We can't store POJO mocks in real IndexedDB (functions aren't cloneable),
			// so we use this escape hatch instead.
			;(
				window as unknown as Record<string, unknown>
			).__mockRootDirHandle = createMockDirectoryHandle(rootSpec)
		},
		{
			b64: asBase64,
			projectId: PROJECT_ID,
			recordingDir: RECORDING_DIR,
		},
	)
}

export const loginAs = async (
	page: Page,
	email = "e2e-test@example.com",
	password = "e2e-test-password-123",
): Promise<void> => {
	await page.goto("/en/login", { waitUntil: "networkidle" })

	// Already logged in — redirect away from /login
	if (!page.url().includes("/login")) return

	await page.waitForSelector("form", { timeout: 10000 })

	await page.getByLabel(/email/i).fill(email)
	await page.locator('input[type="password"]').fill(password)
	await page.getByRole("button", { name: /sign in/i }).click()

	await page.waitForFunction(() => !window.location.href.includes("/login"), {
		timeout: 15000,
	})
}
