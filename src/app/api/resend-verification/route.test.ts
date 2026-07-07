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
	new Request("http://localhost:3000/api/resend-verification", {
		body: JSON.stringify(body),
		headers: { ["Content-Type"]: "application/json" },
		method: "POST",
	})

describe("POST /api/resend-verification", () => {
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

	test("returns 404 when no user found with that email", async () => {
		mockUserFindUnique.mockResolvedValue(null)

		const response = await POST(mockRequest({ email: "unknown@test.com" }))

		const body = (await response.json()) as { error: string }

		expect(response.status).toBe(404)
		expect(body.error).toBe("No account found with this email")
	})

	test("returns 400 when account is already verified", async () => {
		mockUserFindUnique.mockResolvedValue({
			emailVerified: new Date(),
		})

		const response = await POST(mockRequest({ email: "verified@test.com" }))

		const body = (await response.json()) as { error: string }

		expect(response.status).toBe(400)
		expect(body.error).toBe("This account is already verified")
	})

	test("returns 200 and sends verification email on success", async () => {
		mockUserFindUnique.mockResolvedValue({
			emailVerified: null,
		})
		mockVerificationTokenCreate.mockResolvedValue({
			expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
			identifier: "test@test.com",
			token: "new-uuid-token",
		})

		const response = await POST(mockRequest({ email: "test@test.com" }))

		const body = (await response.json()) as {
			message: string
			verifyUrl: string
		}

		expect(response.status).toBe(200)
		expect(body.message).toBe("Verification email resent")
		expect(body.verifyUrl).toContain("/api/verify-email?token=")
		expect(mockVerificationTokenDeleteMany).toHaveBeenCalledWith({
			where: { identifier: "test@test.com" },
		})

		expect(mockSendEmail).toHaveBeenCalledWith(
			"test@test.com",
			"Verify your email address",
			expect.stringContaining("Verify your email address"),
		)
	})

	test("returns 200 and falls back to console when email sending fails", async () => {
		mockUserFindUnique.mockResolvedValue({
			emailVerified: null,
		})
		mockVerificationTokenCreate.mockResolvedValue({
			expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
			identifier: "test@test.com",
			token: "new-uuid-token",
		})
		mockSendEmail.mockRejectedValue(new Error("SMTP timeout"))

		const response = await POST(mockRequest({ email: "test@test.com" }))

		const body = (await response.json()) as {
			message: string
			verifyUrl: string
		}

		expect(response.status).toBe(200)
		expect(body.message).toBe("Verification email resent")
		expect(body.verifyUrl).toContain("/api/verify-email?token=")
	})

	test("returns 500 when token creation fails", async () => {
		mockUserFindUnique.mockResolvedValue({
			emailVerified: null,
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
