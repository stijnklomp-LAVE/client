import { describe, expect, test } from "bun:test"
import { render } from "@react-email/components"

import { PasswordResetEmail } from "./password-reset-email"

describe("PasswordResetEmail", () => {
	const userEmail = "user@example.com"
	const resetUrl = "https://example.com/en/reset-password?token=abc-123"

	test("renders reset link in the email body", async () => {
		const html = await render(
			<PasswordResetEmail userEmail={userEmail} resetUrl={resetUrl} />,
		)

		expect(html).toContain(resetUrl)
	})

	test("includes the user email in the footer", async () => {
		const html = await render(
			<PasswordResetEmail userEmail={userEmail} resetUrl={resetUrl} />,
		)

		expect(html).toContain(userEmail)
	})

	test("renders the heading", async () => {
		const html = await render(
			<PasswordResetEmail userEmail={userEmail} resetUrl={resetUrl} />,
		)

		expect(html).toContain("Reset your password")
	})

	test("mentions the 1 hour expiry", async () => {
		const html = await render(
			<PasswordResetEmail userEmail={userEmail} resetUrl={resetUrl} />,
		)

		expect(html).toContain("1 hour")
	})

	test("has a clickable button with the reset URL", async () => {
		const html = await render(
			<PasswordResetEmail userEmail={userEmail} resetUrl={resetUrl} />,
		)

		expect(html).toContain(
			'href="https://example.com/en/reset-password?token=abc-123"',
		)
	})

	test("uses the correct preview text", async () => {
		const html = await render(
			<PasswordResetEmail userEmail={userEmail} resetUrl={resetUrl} />,
		)

		expect(html).toContain("Reset your Video Editor password")
	})
})
