"use client"

import { useCallback, useMemo, useState } from "react"

export type Device = {
	createdAt: string
	deviceId: string
	deviceName: string
	updatedAt: string
}

export type Fragment = {
	duration: number
	id: string
	name: string
	size: number
}

export type Project = {
	createdAt: string
	description: string
	fragments: Fragment[]
	id: string
	name: string
}

export type DeviceFragmentEntry = {
	fragmentId: string
	updatedAt: string
	updaterDeviceId: string | null
}

export type DeviceFragmentMap = Record<string, DeviceFragmentEntry[]>

export const getDeviceFragmentIds = (
	map: DeviceFragmentMap,
	deviceId: string,
): string[] => (map[deviceId] ?? []).map((e) => e.fragmentId)

type UseSendFragmentsProps = {
	projects: Project[]
	devices: Device[]
	deviceFragments: DeviceFragmentMap
	localDeviceId: string | null
}

export type SendPayloadItem = {
	fragmentIds: string[]
	fragmentNames: string[]
	message: string
	projectIds: string[]
	projectNames: string[]
	sourceDeviceId: string
	targetDeviceId: string
}

export type SourceFragmentInfo = {
	fragment: Fragment
	isDuplicate: boolean
	isResolved: boolean
	isAuthoritative: boolean
	updatedAt: string
	updaterDeviceId: string | null
}

export type SourceDeviceWithFragments = {
	device: Device
	fragments: SourceFragmentInfo[]
	isDuplicate: boolean
	unresolvedDuplicateCount: number
}

export const useSendFragments = ({
	projects,
	devices,
	deviceFragments,
	localDeviceId,
}: UseSendFragmentsProps) => {
	const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([])
	const [selectedTargetDeviceIds, setSelectedTargetDeviceIds] = useState<
		string[]
	>([])
	const [selectedSourceDeviceIds, setSelectedSourceDeviceIds] = useState<
		string[]
	>([])
	const [uncheckedPerSource, setUncheckedPerSource] = useState<
		Map<string, Set<string>>
	>(new Map())
	const [resolvedDuplicates, setResolvedDuplicates] = useState<
		Map<string, string>
	>(new Map())

	const allFragmentsFromSelectedProjects = useMemo(
		() =>
			projects
				.filter((p) => selectedProjectIds.includes(p.id))
				.flatMap((p) => p.fragments),
		[projects, selectedProjectIds],
	)

	const selectedFragmentIds = useMemo(
		() => new Set(allFragmentsFromSelectedProjects.map((f) => f.id)),
		[allFragmentsFromSelectedProjects],
	)

	const fragmentProjectMap = useMemo(() => {
		const map = new Map<string, Project>()
		for (const project of projects) {
			for (const fragment of project.fragments) {
				map.set(fragment.id, project)
			}
		}

		return map
	}, [projects])

	const devicesWithProjectFragments = useMemo(() => {
		if (selectedProjectIds.length === 0) return devices

		const projectFragmentIds = new Set(
			selectedProjectIds.length > 0
				? allFragmentsFromSelectedProjects.map((f) => f.id)
				: [],
		)

		return devices.filter((device) =>
			getDeviceFragmentIds(deviceFragments, device.deviceId).some((fid) =>
				projectFragmentIds.has(fid),
			),
		)
	}, [
		devices,
		deviceFragments,
		selectedProjectIds,
		allFragmentsFromSelectedProjects,
	])

	const availableTargetDevices = useMemo(
		() =>
			selectedProjectIds.length > 0 ? devicesWithProjectFragments : [],
		[selectedProjectIds.length, devicesWithProjectFragments],
	)

	const availableSourceDevices = useMemo(
		() =>
			selectedProjectIds.length > 0
				? devicesWithProjectFragments.filter(
						(d) => d.deviceId !== localDeviceId,
					)
				: [],
		[selectedProjectIds.length, devicesWithProjectFragments, localDeviceId],
	)

	const greyedOutFragmentIds = useMemo(() => {
		if (selectedTargetDeviceIds.length === 0) return new Set<string>()

		const targetFragmentsPerDevice = selectedTargetDeviceIds.map(
			(deviceId) =>
				new Set(getDeviceFragmentIds(deviceFragments, deviceId)),
		)

		return new Set(
			allFragmentsFromSelectedProjects
				.filter((fragment) =>
					targetFragmentsPerDevice.every((targetFragments) =>
						targetFragments.has(fragment.id),
					),
				)
				.map((f) => f.id),
		)
	}, [
		selectedTargetDeviceIds,
		deviceFragments,
		allFragmentsFromSelectedProjects,
	])

	const duplicateFragmentIds = useMemo(() => {
		if (selectedSourceDeviceIds.length < 2) return new Set<string>()

		const fragmentCount = new Map<string, number>()

		for (const deviceId of selectedSourceDeviceIds) {
			const deviceFragIds = getDeviceFragmentIds(
				deviceFragments,
				deviceId,
			)
			for (const fid of deviceFragIds) {
				if (selectedFragmentIds.has(fid)) {
					fragmentCount.set(fid, (fragmentCount.get(fid) ?? 0) + 1)
				}
			}
		}

		return new Set(
			Array.from(fragmentCount.entries())
				.filter(([, count]) => count > 1)
				.map(([fid]) => fid),
		)
	}, [selectedSourceDeviceIds, deviceFragments, selectedFragmentIds])

	const getFragmentsForSource = useCallback(
		(deviceId: string) => {
			const deviceFragIds = new Set(
				getDeviceFragmentIds(deviceFragments, deviceId),
			)
			const unchecked = uncheckedPerSource.get(deviceId) ?? new Set()

			return allFragmentsFromSelectedProjects.filter(
				(f) =>
					deviceFragIds.has(f.id) &&
					!greyedOutFragmentIds.has(f.id) &&
					!unchecked.has(f.id),
			)
		},
		[
			deviceFragments,
			uncheckedPerSource,
			allFragmentsFromSelectedProjects,
			greyedOutFragmentIds,
		],
	)

	const sourceDevicesWithFragments = useMemo(
		() =>
			availableSourceDevices.map((device): SourceDeviceWithFragments => {
				const deviceEntries = deviceFragments[device.deviceId] ?? []
				const deviceEntryMap = new Map(
					deviceEntries.map((e) => [e.fragmentId, e]),
				)
				const deviceFragIds = new Set(
					getDeviceFragmentIds(deviceFragments, device.deviceId),
				)
				const fragments = allFragmentsFromSelectedProjects.filter((f) =>
					deviceFragIds.has(f.id),
				)

				const fragmentInfos: SourceFragmentInfo[] = fragments.map(
					(fragment) => {
						const entry = deviceEntryMap.get(fragment.id)
						const isDup = duplicateFragmentIds.has(fragment.id)
						const authoritative = resolvedDuplicates.get(
							fragment.id,
						)

						return {
							fragment,
							isAuthoritative: authoritative === device.deviceId,
							isDuplicate: isDup,
							isResolved: isDup && authoritative !== undefined,
							updatedAt: entry?.updatedAt ?? "",
							updaterDeviceId: entry?.updaterDeviceId ?? null,
						}
					},
				)

				const isDuplicate = fragmentInfos.some((f) => f.isDuplicate)
				const unresolvedDuplicateCount = fragmentInfos.filter(
					(f) => f.isDuplicate && !f.isResolved,
				).length

				return {
					device,
					fragments: fragmentInfos,
					isDuplicate,
					unresolvedDuplicateCount,
				}
			}),
		[
			availableSourceDevices,
			deviceFragments,
			allFragmentsFromSelectedProjects,
			duplicateFragmentIds,
			resolvedDuplicates,
		],
	)

	const toggleProject = useCallback((projectId: string) => {
		setSelectedProjectIds((prev) => {
			if (prev.includes(projectId)) {
				return prev.filter((id) => id !== projectId)
			}

			return [...prev, projectId]
		})
		setSelectedTargetDeviceIds([])
		setSelectedSourceDeviceIds([])
		setUncheckedPerSource(new Map())
		setResolvedDuplicates(new Map())
	}, [])

	const toggleTarget = useCallback((deviceId: string) => {
		setSelectedTargetDeviceIds((prev) => {
			if (prev.includes(deviceId)) {
				return prev.filter((id) => id !== deviceId)
			}

			return [...prev, deviceId]
		})
	}, [])

	const toggleSource = useCallback(
		(deviceId: string) => {
			setSelectedSourceDeviceIds((prev) => {
				if (prev.includes(deviceId)) {
					return prev.filter((id) => id !== deviceId)
				}

				return [...prev, deviceId]
			})

			setUncheckedPerSource((prev) => {
				const next = new Map(prev)
				const isAdding = !selectedSourceDeviceIds.includes(deviceId)

				if (isAdding) {
					next.delete(deviceId)
				} else {
					const deviceFragIds = new Set(
						getDeviceFragmentIds(deviceFragments, deviceId),
					)
					const relevantFragmentIds = allFragmentsFromSelectedProjects
						.filter((f) => deviceFragIds.has(f.id))
						.map((f) => f.id)
					next.set(deviceId, new Set(relevantFragmentIds))
				}

				return next
			})
		},
		[
			selectedSourceDeviceIds,
			deviceFragments,
			allFragmentsFromSelectedProjects,
		],
	)

	const initSourceDefaults = useCallback(() => {
		if (selectedSourceDeviceIds.length === 0) {
			setSelectedSourceDeviceIds(
				availableSourceDevices.map((d) => d.deviceId),
			)
		}
	}, [selectedSourceDeviceIds.length, availableSourceDevices])

	const toggleFragmentOnSource = useCallback(
		(deviceId: string, fragmentId: string) => {
			setUncheckedPerSource((prev) => {
				const next = new Map(prev)
				const current = new Set(next.get(deviceId) ?? [])

				if (current.has(fragmentId)) {
					current.delete(fragmentId)
				} else {
					current.add(fragmentId)
				}

				if (current.size === 0) {
					next.delete(deviceId)
				} else {
					next.set(deviceId, current)
				}

				return next
			})
		},
		[],
	)

	const resolveDuplicate = useCallback(
		(fragmentId: string, authoritativeDeviceId: string) => {
			setResolvedDuplicates((prev) => {
				const next = new Map(prev)
				next.set(fragmentId, authoritativeDeviceId)

				return next
			})

			setUncheckedPerSource((prev) => {
				const next = new Map(prev)

				for (const deviceId of selectedSourceDeviceIds) {
					if (deviceId === authoritativeDeviceId) {
						const current = new Set(next.get(deviceId) ?? [])
						current.delete(fragmentId)

						if (current.size === 0) {
							next.delete(deviceId)
						} else {
							next.set(deviceId, current)
						}
					} else {
						const current = new Set(next.get(deviceId) ?? [])
						current.add(fragmentId)
						next.set(deviceId, current)
					}
				}

				return next
			})
		},
		[selectedSourceDeviceIds],
	)

	const resolveAllDuplicatesOnDevice = useCallback(
		(deviceId: string) => {
			const deviceFragIds = new Set(
				getDeviceFragmentIds(deviceFragments, deviceId),
			)
			const deviceFragmentIds = allFragmentsFromSelectedProjects
				.filter((f) => deviceFragIds.has(f.id))
				.map((f) => f.id)

			for (const fragmentId of deviceFragmentIds) {
				if (duplicateFragmentIds.has(fragmentId)) {
					resolveDuplicate(fragmentId, deviceId)
				}
			}
		},
		[
			deviceFragments,
			allFragmentsFromSelectedProjects,
			duplicateFragmentIds,
			resolveDuplicate,
		],
	)

	const canSend = useMemo(
		() =>
			selectedProjectIds.length > 0 &&
			selectedTargetDeviceIds.length > 0 &&
			selectedSourceDeviceIds.length > 0,
		[
			selectedProjectIds.length,
			selectedTargetDeviceIds.length,
			selectedSourceDeviceIds.length,
		],
	)

	const buildSendPayload = useCallback(
		(message: string): SendPayloadItem[] => {
			if (!canSend) return []

			const payload: SendPayloadItem[] = []

			for (const sourceId of selectedSourceDeviceIds) {
				const fragments = getFragmentsForSource(sourceId)

				if (fragments.length === 0) continue

				const projectIds = Array.from(
					new Set(
						fragments
							.map((f) => fragmentProjectMap.get(f.id)?.id)
							.filter(Boolean) as string[],
					),
				)
				const projectNames = Array.from(
					new Set(
						fragments
							.map((f) => fragmentProjectMap.get(f.id)?.name)
							.filter(Boolean) as string[],
					),
				)

				for (const targetId of selectedTargetDeviceIds) {
					payload.push({
						fragmentIds: fragments.map((f) => f.id),
						fragmentNames: fragments.map((f) => f.name),
						message,
						projectIds,
						projectNames,
						sourceDeviceId: sourceId,
						targetDeviceId: targetId,
					})
				}
			}

			return payload
		},
		[
			canSend,
			selectedSourceDeviceIds,
			selectedTargetDeviceIds,
			getFragmentsForSource,
			fragmentProjectMap,
		],
	)

	return {
		allFragmentsFromSelectedProjects,
		availableSourceDevices,
		availableTargetDevices,
		buildSendPayload,
		canSend,
		duplicateFragmentIds,
		getFragmentsForSource,
		greyedOutFragmentIds,
		initSourceDefaults,
		resolveAllDuplicatesOnDevice,
		resolveDuplicate,
		resolvedDuplicates,
		selectedFragmentIds,
		selectedProjectIds,
		selectedSourceDeviceIds,
		selectedTargetDeviceIds,
		sourceDevicesWithFragments,
		toggleFragmentOnSource,
		toggleProject,
		toggleSource,
		toggleTarget,
		uncheckedPerSource,
	}
}
