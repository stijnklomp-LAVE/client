export type TEmailConfig = {
	from: string
	host: string
	pass: string
	port: number
	secure: boolean
	user: string
}

let cachedConfig: TEmailConfig | undefined

export const getEmailConfig = (): TEmailConfig => {
	if (cachedConfig) return cachedConfig

	cachedConfig = {
		from: process.env.EMAIL_FROM ?? "noreply@video-editor.local",
		host: process.env.SMTP_HOST ?? "mailpit",
		pass: process.env.SMTP_PASS ?? "",
		port: Number(process.env.SMTP_PORT) || 1025,
		secure: process.env.SMTP_SECURE === "true",
		user: process.env.SMTP_USER ?? "",
	}

	return cachedConfig
}
