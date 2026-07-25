import { readFileSync } from "fs"
import { resolve } from "path"
import type { Page } from "@playwright/test"

const PROJECT_ID = "e2e-test-project"
const RECORDING_DIR = "e2e-recording"
const FIXTURE_PATH = resolve("test/fixtures/solid-red-1s.webm")

export const setupMockFsaa = async (page: Page): Promise<void> => {
	const webmBytes = readFileSync(FIXTURE_PATH)
	const asBase64 = webmBytes.toString("base64")

	await page.addInitScript(
		({ projectId, recordingDir, b64 }) => {
			const binary = atob(b64)
			const bytes = new Uint8Array(binary.length)
			for (let i = 0; i < binary.length; i++) {
				bytes[i] = binary.charCodeAt(i)
			}

			const mockRecordingDir: FileSystemDirectoryHandle = {
				name: recordingDir,
				kind: "directory",
				getDirectoryHandle: async () => {
					throw new DOMException("Not found", "NotFoundError")
				},
				getFileHandle: async (fname: string) => {
					if (fname === "recording.webm") {
						return {
							name: fname,
							kind: "file" as const,
							getFile: async () =>
								new File([bytes], "recording.webm"),
						} as FileSystemFileHandle
					}

					throw new DOMException("Not found", "NotFoundError")
				},
				queryPermission: async () => "granted" as PermissionState,
				requestPermission: async () => "granted" as PermissionState,
				removeEntry: async () => {},
				resolve: async () => null,
				values: async function* () {},
			}

			const mockProjectDir: FileSystemDirectoryHandle = {
				name: projectId,
				kind: "directory",
				getDirectoryHandle: async (name: string) => {
					if (name === recordingDir) return mockRecordingDir
					throw new DOMException("Not found", "NotFoundError")
				},
				getFileHandle: async () => {
					throw new DOMException("Not found", "NotFoundError")
				},
				queryPermission: async () => "granted" as PermissionState,
				requestPermission: async () => "granted" as PermissionState,
				removeEntry: async () => {},
				resolve: async () => null,
				values: async function* () {},
			}

			const mockRoot: FileSystemDirectoryHandle = {
				name: "E2E Test Root",
				kind: "directory",
				getDirectoryHandle: async (name: string) => {
					if (name === projectId) return mockProjectDir
					throw new DOMException("Not found", "NotFoundError")
				},
				getFileHandle: async () => {
					throw new DOMException("Not found", "NotFoundError")
				},
				queryPermission: async () => "granted" as PermissionState,
				requestPermission: async () => "granted" as PermissionState,
				removeEntry: async () => {},
				resolve: async () => null,
				values: async function* () {},
			}

			// Set the mock handle on window so getPersistedDirectoryHandle can pick it up.
			// We can't store POJO mocks in real IndexedDB (functions aren't cloneable),
			// so we use this escape hatch instead.
			;(
				window as unknown as Record<string, unknown>
			).__mockRootDirHandle = mockRoot
		},
		{
			projectId: PROJECT_ID,
			recordingDir: RECORDING_DIR,
			b64: asBase64,
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
