import { describe, test, expect, mock, beforeEach, afterEach } from "bun:test"

const mockUserCreate = mock()
const mockUserFindUnique = mock()
const mockVerificationTokenCreate = mock()

await mock.module("@/lib/db/prisma", () => ({
	prismaClient: {
		user: {
			create: mockUserCreate,
			findUnique: mockUserFindUnique,
		},
		verificationToken: {
			create: mockVerificationTokenCreate,
		},
	},
}))

const mockHash = mock()

await mock.module("bcryptjs", () => ({
	default: { hash: mockHash },
}))

const { POST } = await import("./route")

const mockRequest = (body: Record<string, unknown>): Request =>
	new Request("http://localhost:3000/api/register", {
		body: JSON.stringify(body),
		headers: { ["Content-Type"]: "application/json" },
		method: "POST",
	})

describe("POST /api/register", () => {
	beforeEach(() => {
		mockHash.mockResolvedValue("$2a$12$hashedpassword")
	})

	afterEach(() => {
		mock.clearAllMocks()
	})

	test("returns 400 when email is missing", async () => {
		const response = await POST(mockRequest({ password: "password123" }))

		const body = (await response.json()) as { error: string }

		expect(response.status).toBe(400)
		expect(body.error).toBe("Email and password are required")
	})

	test("returns 400 when password is missing", async () => {
		const response = await POST(mockRequest({ email: "test@test.com" }))

		const body = (await response.json()) as { error: string }

		expect(response.status).toBe(400)
		expect(body.error).toBe("Email and password are required")
	})

	test("returns 400 when password is shorter than 8 characters", async () => {
		const response = await POST(
			mockRequest({ email: "test@test.com", password: "123" }),
		)

		const body = (await response.json()) as { error: string }

		expect(response.status).toBe(400)
		expect(body.error).toBe("Password must be at least 8 characters")
	})

	test("returns 409 when email already exists", async () => {
		mockUserFindUnique.mockResolvedValue({
			email: "test@test.com",
			id: "existing-id",
		})

		const response = await POST(
			mockRequest({ email: "test@test.com", password: "password123" }),
		)

		const body = (await response.json()) as { error: string }

		expect(response.status).toBe(409)
		expect(body.error).toBe("An account with this email already exists")
	})

	test("returns 201 and creates user and verification token on success", async () => {
		mockUserFindUnique.mockResolvedValue(null)
		mockUserCreate.mockResolvedValue({
			email: "test@test.com",
			id: "new-user-id",
		})
		mockVerificationTokenCreate.mockResolvedValue({
			expires: new Date(),
			identifier: "test@test.com",
			token: "uuid-token",
		})

		const response = await POST(
			mockRequest({
				email: "test@test.com",
				name: "Test User",
				password: "password123",
			}),
		)

		const body = (await response.json()) as {
			message: string
			verifyUrl: string
		}

		expect(response.status).toBe(201)
		expect(body.message).toContain("Account created")
		expect(body.verifyUrl).toContain("/api/verify-email?token=")
		expect(mockHash).toHaveBeenCalledWith("password123", 12)
		expect(mockUserCreate).toHaveBeenCalledWith({
			data: {
				email: "test@test.com",
				emailVerified: null,
				name: "Test User",
				password: "$2a$12$hashedpassword",
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
	})

	test("returns 201 with null name when name is not provided", async () => {
		mockUserFindUnique.mockResolvedValue(null)
		mockUserCreate.mockResolvedValue({
			email: "test@test.com",
			id: "new-user-id",
		})
		mockVerificationTokenCreate.mockResolvedValue({
			expires: new Date(),
			identifier: "test@test.com",
			token: "uuid-token",
		})

		const response = await POST(
			mockRequest({ email: "test@test.com", password: "password123" }),
		)

		expect(response.status).toBe(201)
		expect(mockUserCreate).toHaveBeenCalledWith({
			data: {
				email: "test@test.com",
				emailVerified: null,
				name: null,
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				password: expect.any(String),
			},
		})
	})

	test("returns 500 when database operation fails", async () => {
		mockUserFindUnique.mockRejectedValue(new Error("DB connection failed"))

		const response = await POST(
			mockRequest({ email: "test@test.com", password: "password123" }),
		)

		const body = (await response.json()) as { error: string }

		expect(response.status).toBe(500)
		expect(body.error).toBe("Internal server error")
	})
})
