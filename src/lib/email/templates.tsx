import { render } from "@react-email/components"

import { PasswordResetEmail } from "@/emails/password-reset-email"
import { VerificationEmail } from "@/emails/verification-email"

export const renderVerificationEmail = async (
	userEmail: string,
	verificationUrl: string,
): Promise<string> =>
	render(
		<VerificationEmail
			userEmail={userEmail}
			verificationUrl={verificationUrl}
		/>,
	)

export const renderPasswordResetEmail = async (
	userEmail: string,
	resetUrl: string,
): Promise<string> =>
	render(<PasswordResetEmail userEmail={userEmail} resetUrl={resetUrl} />)
