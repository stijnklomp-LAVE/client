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

const mockSession = {
	user: { email: "test@test.com", id: "user-1" },
}

describe("POST /api/profile/restore-account", () => {
	beforeEach(() => {
		mockAuth.mockResolvedValue(mockSession)
	})

	afterEach(() => {
		mock.clearAllMocks()
	})

	test("returns 401 when not authenticated", async () => {
		mockAuth.mockResolvedValue(null)

		const response = await POST()

		const body = (await response.json()) as { error: string }

		expect(response.status).toBe(401)
		expect(body.error).toBe("Unauthorized")
	})

	test("returns 200 and clears deletion dates on success", async () => {
		mockUserUpdate.mockResolvedValue({
			deletionScheduledAt: null,
			id: "user-1",
			markedForDeletionAt: null,
		})

		const response = await POST()

		const body = (await response.json()) as { message: string }

		expect(response.status).toBe(200)
		expect(body.message).toBe("Account restored successfully")
		expect(mockUserUpdate).toHaveBeenCalledWith({
			data: {
				deletionScheduledAt: null,
				markedForDeletionAt: null,
			},
			where: { id: "user-1" },
		})
	})

	test("returns 500 when database operation fails", async () => {
		mockUserUpdate.mockRejectedValue(new Error("DB write failed"))

		const response = await POST()

		const body = (await response.json()) as { error: string }

		expect(response.status).toBe(500)
		expect(body.error).toBe("Internal server error")
	})
})
