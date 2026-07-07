import {
	Body,
	Button,
	Container,
	Head,
	Heading,
	Hr,
	Html,
	Link,
	Preview,
	Section,
	Text,
} from "@react-email/components"

type TVerificationEmailProps = {
	userEmail: string
	verificationUrl: string
}

export const VerificationEmail = ({
	userEmail,
	verificationUrl,
}: TVerificationEmailProps) => {
	const previewText = `Verify your email address for Video Editor`

	return (
		<Html>
			<Head />
			<Preview>{previewText}</Preview>
			<Body style={main}>
				<Container style={container}>
					<Heading style={h1}>Verify your email address</Heading>
					<Text style={text}>
						Thanks for creating an account! Click the button below
						to verify your email address and start using Video
						Editor.
					</Text>
					<Section style={buttonContainer}>
						<Button style={button} href={verificationUrl}>
							Verify email address
						</Button>
					</Section>
					<Text style={text}>
						Or copy and paste this link into your browser:
					</Text>
					<Link style={link} href={verificationUrl}>
						{verificationUrl}
					</Link>
					<Hr style={hr} />
					<Text style={footer}>
						This link expires in 7 days. If you didn&apos;t create
						this account, you can safely ignore this email.
					</Text>
					<Text style={footer}>
						Sent to {userEmail} — Video Editor
					</Text>
				</Container>
			</Body>
		</Html>
	)
}

export default VerificationEmail

const main = {
	backgroundColor: "#f6f9fc",
	fontFamily:
		'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
	padding: "40px 0",
}

const container = {
	backgroundColor: "#ffffff",
	border: "1px solid #e6e6e6",
	borderRadius: "8px",
	margin: "0 auto",
	maxWidth: "560px",
	padding: "40px 20px",
}

const h1 = {
	color: "#1a1a1a",
	fontSize: "24px",
	fontWeight: "600",
	lineHeight: "1.3",
	margin: "0 0 20px",
	textAlign: "center" as const,
}

const text = {
	color: "#525f7f",
	fontSize: "16px",
	lineHeight: "1.5",
	margin: "0 0 16px",
}

const buttonContainer = {
	textAlign: "center" as const,
	margin: "32px 0",
}

const button = {
	backgroundColor: "#228be6",
	borderRadius: "6px",
	color: "#ffffff",
	fontSize: "16px",
	fontWeight: "600",
	padding: "12px 24px",
	textDecoration: "none",
}

const link = {
	color: "#228be6",
	fontSize: "14px",
	wordBreak: "break-all" as const,
}

const hr = {
	border: "none",
	borderTop: "1px solid #e6e6e6",
	margin: "32px 0",
}

const footer = {
	color: "#8898aa",
	fontSize: "12px",
	lineHeight: "1.4",
	margin: "0",
}
