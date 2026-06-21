const getBaseUrl = () => {
	const url = process.env.FRAGMENT_COMPOSER_URL

	if (!url) {
		throw new Error(
			"FRAGMENT_COMPOSER_URL environment variable is not defined",
		)
	}

	return url
}

export async function proxyToFragmentComposer(
	path: string,
	options: {
		body?: unknown
		headers?: Record<string, string>
		method?: string
		token: string
	},
): Promise<Response> {
	const { body, headers, method, token } = options

	return fetch(`${getBaseUrl()}${path}`, {
		body: body ? JSON.stringify(body) : undefined,
		headers: {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			Authorization: `Bearer ${token}`,
			// eslint-disable-next-line @typescript-eslint/naming-convention
			...(body ? { "Content-Type": "application/json" } : {}),
			...headers,
		},
		method: method ?? "GET",
	})
}
