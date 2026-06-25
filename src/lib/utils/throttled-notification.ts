import { notifications, type NotificationData } from "@mantine/notifications"

const shownKeys = new Map<string, number>()
const DEFAULT_COOLDOWN_MS = 30_000

export const showThrottledNotification = (
	data: NotificationData & { throttleKey?: string },
): void => {
	const key =
		data.throttleKey ??
		(typeof data.message === "string" ? data.message : "default")
	const lastShown = shownKeys.get(key) ?? 0
	const cooldown = DEFAULT_COOLDOWN_MS

	if (Date.now() - lastShown < cooldown) return

	shownKeys.set(key, Date.now())
	notifications.show(data)
}
