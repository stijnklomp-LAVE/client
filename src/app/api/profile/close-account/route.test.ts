import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test"

const mockAuth = mock()
const mockUserUpdate = mock()

await mock.module("@/auth", () => ({
	auth: mockAuth,
}))

await mock.module("@/lib/db/prisma", () => ({
	prismaClient: {
		user: {
			update: mockUserUpdate,
		},
	},
}))

const { POST } = await import("./route")

const mockRequest = (body: Record<string, unknown>): Request =>
	new Request("http://localhost:3000/api/profile/close-account", {
		body: JSON.stringify(body),
		headers: { ["Content-Type"]: "application/json" },
		method: "POST",
	})

const mockSession = {
	user: { email: "test@test.com", id: "user-1" },
}

describe("POST /api/profile/close-account", () => {
	beforeEach(() => {
		mockAuth.mockResolvedValue(mockSession)
	})

	afterEach(() => {
		mock.clearAllMocks()
	})

	test("returns 401 when not authenticated", async () => {
		mockAuth.mockResolvedValue(null)

		const response = await POST(mockRequest({ email: "test@test.com" }))

		const body = (await response.json()) as { error: string }

		expect(response.status).toBe(401)
		expect(body.error).toBe("Unauthorized")
	})

	test("returns 400 when email is missing from body", async () => {
		const response = await POST(mockRequest({}))

		const body = (await response.json()) as { error: string }

		expect(response.status).toBe(400)
		expect(body.error).toBe("Email is required")
	})

	test("returns 400 when email does not match session user email", async () => {
		const response = await POST(mockRequest({ email: "wrong@test.com" }))

		const body = (await response.json()) as { error: string }

		expect(response.status).toBe(400)
		expect(body.error).toBe("Email does not match your account")
	})

	test("returns 200 and sets deletion dates on success", async () => {
		mockUserUpdate.mockResolvedValue({
			deletionScheduledAt: new Date(
				Date.now() + 30 * 24 * 60 * 60 * 1000,
			),
			id: "user-1",
			markedForDeletionAt: new Date(),
		})

		const response = await POST(mockRequest({ email: "test@test.com" }))

		const body = (await response.json()) as { message: string }

		expect(response.status).toBe(200)
		expect(body.message).toContain("Your account has been closed")
		expect(mockUserUpdate).toHaveBeenCalledWith({
			data: {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				deletionScheduledAt: expect.any(Date),
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				markedForDeletionAt: expect.any(Date),
			},
			where: { id: "user-1" },
		})
	})

	test("returns 500 when database operation fails", async () => {
		mockUserUpdate.mockRejectedValue(new Error("DB write failed"))

		const response = await POST(mockRequest({ email: "test@test.com" }))

		const body = (await response.json()) as { error: string }

		expect(response.status).toBe(500)
		expect(body.error).toBe("Internal server error")
	})
})
