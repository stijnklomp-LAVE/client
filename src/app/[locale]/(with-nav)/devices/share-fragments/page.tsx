"use client"

import { SendTab } from "@/components/devices/send-tab"
import { useDevicesContext } from "@/lib/devices/devices-context"

export default function ShareFragmentsPage(): React.JSX.Element {
	const {
		deviceFragments,
		devices,
		localDeviceId,
		projects,
		handleSendComplete,
	} = useDevicesContext()

	return (
		<SendTab
			deviceFragments={deviceFragments}
			devices={devices}
			localDeviceId={localDeviceId}
			onSendComplete={handleSendComplete}
			projects={projects}
		/>
	)
}
