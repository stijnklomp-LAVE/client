import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test"

const mockUserFindUnique = mock()
const mockVerificationTokenDeleteMany = mock()
const mockVerificationTokenCreate = mock()

const mockSendEmail = mock()

await mock.module("@/lib/db/prisma", () => ({
	prismaClient: {
		user: {
			findUnique: mockUserFindUnique,
		},
		verificationToken: {
			create: mockVerificationTokenCreate,
			deleteMany: mockVerificationTokenDeleteMany,
		},
	},
}))

await mock.module("@/lib/email/send", () => ({
	sendEmail: mockSendEmail,
}))

const { POST } = await import("./route")

const mockRequest = (body: Record<string, unknown>): Request =>
	new Request("http://localhost:3000/api/forgot-password", {
		body: JSON.stringify(body),
		headers: { ["Content-Type"]: "application/json" },
		method: "POST",
	})

describe("POST /api/forgot-password", () => {
	beforeEach(() => {
		mockSendEmail.mockResolvedValue(undefined)
	})

	afterEach(() => {
		mock.clearAllMocks()
	})

	test("returns 400 when email is missing", async () => {
		const response = await POST(mockRequest({}))

		const body = (await response.json()) as { error: string }

		expect(response.status).toBe(400)
		expect(body.error).toBe("Email is required")
	})

	test("returns 200 even when email is not found (no email enumeration)", async () => {
		mockUserFindUnique.mockResolvedValue(null)

		const response = await POST(mockRequest({ email: "unknown@test.com" }))

		const body = (await response.json()) as { message: string }

		expect(response.status).toBe(200)
		expect(body.message).toContain("If an account with that email exists")
		expect(mockVerificationTokenCreate).not.toHaveBeenCalled()
		expect(mockSendEmail).not.toHaveBeenCalled()
	})

	test("creates a reset token and sends password reset email", async () => {
		mockUserFindUnique.mockResolvedValue({
			email: "test@test.com",
			id: "user-id",
		})
		mockVerificationTokenCreate.mockResolvedValue({
			expires: new Date(Date.now() + 1000 * 60 * 60),
			identifier: "test@test.com",
			token: "reset-token-uuid",
		})

		const response = await POST(mockRequest({ email: "test@test.com" }))

		const body = (await response.json()) as { message: string }

		expect(response.status).toBe(200)
		expect(body.message).toContain("If an account with that email exists")

		expect(mockVerificationTokenDeleteMany).toHaveBeenCalledWith({
			where: {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				expires: { lt: expect.any(Date) },
				identifier: "test@test.com",
			},
		})
		expect(mockVerificationTokenCreate).toHaveBeenCalledWith({
			data: {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				expires: expect.any(Date),
				identifier: "test@test.com",
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				token: expect.any(String),
			},
		})

		expect(mockSendEmail).toHaveBeenCalledWith(
			"test@test.com",
			"Reset your password",
			expect.stringContaining("Reset your password"),
		)
	})

	test("returns 200 even when email sending fails", async () => {
		mockUserFindUnique.mockResolvedValue({
			email: "test@test.com",
			id: "user-id",
		})
		mockVerificationTokenCreate.mockResolvedValue({
			expires: new Date(Date.now() + 1000 * 60 * 60),
			identifier: "test@test.com",
			token: "reset-token-uuid",
		})
		mockSendEmail.mockRejectedValue(new Error("SMTP unavailable"))

		const response = await POST(mockRequest({ email: "test@test.com" }))

		const body = (await response.json()) as { message: string }

		expect(response.status).toBe(200)
		expect(body.message).toContain("If an account with that email exists")
	})

	test("returns 500 when token creation fails", async () => {
		mockUserFindUnique.mockResolvedValue({
			email: "test@test.com",
			id: "user-id",
		})
		mockVerificationTokenCreate.mockRejectedValue(
			new Error("Database error"),
		)

		const response = await POST(mockRequest({ email: "test@test.com" }))

		const body = (await response.json()) as { error: string }

		expect(response.status).toBe(500)
		expect(body.error).toBe("Internal server error")
	})
})
