import nodemailer from "nodemailer"

import { logger } from "@/lib/logger"

import { getEmailConfig } from "./config"

let transporter: nodemailer.Transporter | null = null

const getTransporter = (): nodemailer.Transporter => {
	if (transporter) return transporter

	const config = getEmailConfig()

	transporter = nodemailer.createTransport({
		auth:
			config.user && config.pass
				? { pass: config.pass, user: config.user }
				: undefined,
		host: config.host,
		port: config.port,
		secure: config.secure,
	})

	return transporter
}

export const sendEmail = async (
	to: string,
	subject: string,
	html: string,
): Promise<void> => {
	const config = getEmailConfig()

	try {
		await getTransporter().sendMail({
			from: config.from,
			html,
			subject,
			to,
		})

		logger.info(`Email sent to ${to}: "${subject}"`)
	} catch (error) {
		logger.error(`Failed to send email to ${to}:`, error)
		logger.warn(`[DEV] Email intended for ${to} — subject: "${subject}"`)

		throw error
	}
}
