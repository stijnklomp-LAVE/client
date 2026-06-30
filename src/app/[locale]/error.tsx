"use client"

import { useEffect } from "react"

import { logger } from "@/lib/logger"

const Error = ({
	error,
	reset,
}: {
	error: Error & { digest?: string }
	reset: () => void
}) => {
	useEffect(() => {
		logger.error(error)
	}, [error])

	return (
		<div
			style={{
				display: "flex",
				flexDirection: "column",
				alignItems: "center",
				justifyContent: "center",
				minHeight: "100vh",
				gap: "16px",
				padding: "24px",
				color: "var(--text-primary)",
				background: "var(--bg-primary)",
			}}>
			<h2 style={{ fontSize: "24px", fontWeight: 600 }}>
				Something went wrong
			</h2>
			<p style={{ color: "var(--text-secondary)" }}>
				{error.message ?? "An unexpected error occurred"}
			</p>
			<button
				type="button"
				onClick={reset}
				style={{
					padding: "8px 16px",
					borderRadius: "8px",
					border: "1px solid var(--border-primary)",
					background: "var(--bg-secondary)",
					color: "var(--text-primary)",
					cursor: "pointer",
				}}>
				Try again
			</button>
		</div>
	)
}

export default Error
