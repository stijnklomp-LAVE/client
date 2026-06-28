import { describe, test, expect, afterEach } from "bun:test"
import { PactV4, MatchersV3 } from "@pact-foundation/pact"

import { proxyToFragmentComposer } from "@/lib/api/fragment-composer"

const { eachLike, like, string } = MatchersV3

const provider = new PactV4({
	consumer: "video-editor-client",
	dir: `${process.cwd()}/pacts`,
	provider: "fragment-composer",
})

describe("Pact consumer: video-editor-client -> fragment-composer", () => {
	afterEach(() => {
		provider.setup()
	})

	test("GET /v1/devices returns a list of devices", async () => {
		await provider
			.addInteraction()
			.uponReceiving("a request for all devices")
			.withRequest("GET", "/v1/devices", (builder) => {
				builder.headers({
					// eslint-disable-next-line @typescript-eslint/naming-convention
					Authorization: like("Bearer some-test-token"),
				})
			})
			.willRespondWith(200, (builder) => {
				builder.jsonBody({
					devices: eachLike({
						createdAt: string("2024-01-01T00:00:00Z"),
						deviceId: string("device-123"),
						deviceName: string("Test Camera"),
						updatedAt: string("2024-01-01T00:00:00Z"),
					}),
				})
			})
			.executeTest(async (mockServer) => {
				process.env.FRAGMENT_COMPOSER_URL = mockServer.url

				const res = await proxyToFragmentComposer("/v1/devices", {
					token: "some-test-token",
				})

				expect(res.status).toBe(200)

				const body = (await res.json()) as { devices: unknown[] }
				expect(body).toHaveProperty("devices")
				expect(Array.isArray(body.devices)).toBe(true)
			})
	})

	test("POST /v1/devices creates a new device", async () => {
		await provider
			.addInteraction()
			.uponReceiving("a request to create a device")
			.withRequest("POST", "/v1/devices", (builder) => {
				builder.headers({
					// eslint-disable-next-line @typescript-eslint/naming-convention
					Authorization: like("Bearer some-test-token"),
					// eslint-disable-next-line @typescript-eslint/naming-convention
					"Content-Type": like("application/json"),
				})
				builder.jsonBody({
					deviceName: like("New Camera"),
				})
			})
			.willRespondWith(201, (builder) => {
				builder.jsonBody({
					device: {
						createdAt: string("2024-01-01T00:00:00Z"),
						deviceId: string("device-456"),
						deviceName: string("New Camera"),
						updatedAt: string("2024-01-01T00:00:00Z"),
					},
					message: like("Device created successfully"),
				})
			})
			.executeTest(async (mockServer) => {
				process.env.FRAGMENT_COMPOSER_URL = mockServer.url

				const res = await proxyToFragmentComposer("/v1/devices", {
					body: { deviceName: "New Camera" },
					method: "POST",
					token: "some-test-token",
				})

				expect(res.status).toBe(201)

				const body = (await res.json()) as {
					device: Record<string, unknown>
					message: string
				}
				expect(body).toHaveProperty("device")
				expect(body).toHaveProperty("message")
			})
	})
})
