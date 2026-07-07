import { describe, expect, test } from "bun:test"
import { render } from "@react-email/components"

import { VerificationEmail } from "./verification-email"

describe("VerificationEmail", () => {
	const userEmail = "user@example.com"
	const verificationUrl = "https://example.com/api/verify-email?token=abc-123"

	test("renders verification link in the email body", async () => {
		const html = await render(
			<VerificationEmail
				userEmail={userEmail}
				verificationUrl={verificationUrl}
			/>,
		)

		expect(html).toContain(verificationUrl)
	})

	test("includes the user email in the footer", async () => {
		const html = await render(
			<VerificationEmail
				userEmail={userEmail}
				verificationUrl={verificationUrl}
			/>,
		)

		expect(html).toContain(userEmail)
	})

	test("renders the heading", async () => {
		const html = await render(
			<VerificationEmail
				userEmail={userEmail}
				verificationUrl={verificationUrl}
			/>,
		)

		expect(html).toContain("Verify your email address")
	})

	test("mentions the 7 day expiry", async () => {
		const html = await render(
			<VerificationEmail
				userEmail={userEmail}
				verificationUrl={verificationUrl}
			/>,
		)

		expect(html).toContain("7 days")
	})

	test("has a clickable button with the verification URL", async () => {
		const html = await render(
			<VerificationEmail
				userEmail={userEmail}
				verificationUrl={verificationUrl}
			/>,
		)

		expect(html).toContain(
			'href="https://example.com/api/verify-email?token=abc-123"',
		)
	})

	test("uses the correct preview text", async () => {
		const html = await render(
			<VerificationEmail
				userEmail={userEmail}
				verificationUrl={verificationUrl}
			/>,
		)

		expect(html).toContain("Verify your email address for Video Editor")
	})
})
