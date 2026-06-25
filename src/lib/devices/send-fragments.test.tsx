import "@testing-library/jest-dom"
import { renderHook, act } from "@testing-library/react"

import {
	useSendFragments,
	type Device,
	type DeviceFragmentMap,
	type Project,
} from "@/lib/devices/send-fragments"

const mockProjects: Project[] = [
	{
		createdAt: "2024-01-01",
		description: "Test project 1",
		fragments: [
			{ duration: 10, id: "f1", name: "frag-1.mp4", size: 1000 },
			{ duration: 20, id: "f2", name: "frag-2.mp4", size: 2000 },
		],
		id: "proj-1",
		name: "Project Alpha",
	},
	{
		createdAt: "2024-01-02",
		description: "Test project 2",
		fragments: [
			{ duration: 30, id: "f3", name: "frag-3.mp4", size: 3000 },
			{ duration: 40, id: "f4", name: "frag-4.mp4", size: 4000 },
		],
		id: "proj-2",
		name: "Project Beta",
	},
]

const mockDevices: Device[] = [
	{
		createdAt: "2024-01-01",
		deviceId: "dev-desktop",
		deviceName: "Desktop",
		updatedAt: "2024-01-01",
	},
	{
		createdAt: "2024-01-01",
		deviceId: "dev-phone",
		deviceName: "Phone",
		updatedAt: "2024-01-01",
	},
	{
		createdAt: "2024-01-01",
		deviceId: "dev-tablet",
		deviceName: "Tablet",
		updatedAt: "2024-01-01",
	},
	{
		createdAt: "2024-01-01",
		deviceId: "dev-laptop",
		deviceName: "Laptop",
		updatedAt: "2024-01-01",
	},
]

const now = new Date().toISOString()

const mockDeviceFragments: DeviceFragmentMap = {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	"dev-desktop": [
		{ fragmentId: "f1", updatedAt: now, updaterDeviceId: null },
		{ fragmentId: "f2", updatedAt: now, updaterDeviceId: null },
	],
	// eslint-disable-next-line @typescript-eslint/naming-convention
	"dev-phone": [
		{ fragmentId: "f1", updatedAt: now, updaterDeviceId: null },
		{ fragmentId: "f3", updatedAt: now, updaterDeviceId: null },
	],
	// eslint-disable-next-line @typescript-eslint/naming-convention
	"dev-tablet": [
		{ fragmentId: "f1", updatedAt: now, updaterDeviceId: null },
		{ fragmentId: "f2", updatedAt: now, updaterDeviceId: null },
	],
	// eslint-disable-next-line @typescript-eslint/naming-convention
	"dev-laptop": [{ fragmentId: "f4", updatedAt: now, updaterDeviceId: null }],
}

const setup = (props: {
	projects?: Project[]
	devices?: Device[]
	deviceFragments?: DeviceFragmentMap
	localDeviceId?: string | null
}) => {
	return renderHook(() =>
		useSendFragments({
			projects: props.projects ?? mockProjects,
			devices: props.devices ?? mockDevices,
			deviceFragments: props.deviceFragments ?? mockDeviceFragments,
			localDeviceId: props.localDeviceId ?? "dev-desktop",
		}),
	)
}

describe("useSendFragments", () => {
	it("starts with no selections", () => {
		const { result } = setup({})

		expect(result.current.selectedProjectIds).toEqual([])
		expect(result.current.selectedTargetDeviceIds).toEqual([])
		expect(result.current.selectedSourceDeviceIds).toEqual([])
		expect(result.current.canSend).toBe(false)
	})

	describe("project selection", () => {
		it("selecting a project adds all its fragments to the checked set", () => {
			const { result } = setup({})

			act(() => {
				result.current.toggleProject("proj-1")
			})

			expect(result.current.selectedProjectIds).toEqual(["proj-1"])
			expect(result.current.selectedFragmentIds.has("f1")).toBe(true)
			expect(result.current.selectedFragmentIds.has("f2")).toBe(true)
			expect(result.current.selectedFragmentIds.has("f3")).toBe(false)
		})

		it("selecting multiple projects merges fragments from all", () => {
			const { result } = setup({})

			act(() => {
				result.current.toggleProject("proj-1")
			})
			act(() => {
				result.current.toggleProject("proj-2")
			})

			expect(result.current.selectedProjectIds).toEqual([
				"proj-1",
				"proj-2",
			])
			expect(result.current.selectedFragmentIds.has("f1")).toBe(true)
			expect(result.current.selectedFragmentIds.has("f2")).toBe(true)
			expect(result.current.selectedFragmentIds.has("f3")).toBe(true)
			expect(result.current.selectedFragmentIds.has("f4")).toBe(true)
		})

		it("deselecting a project removes its fragments from the checked set", () => {
			const { result } = setup({})

			act(() => {
				result.current.toggleProject("proj-1")
			})
			act(() => {
				result.current.toggleProject("proj-2")
			})
			act(() => {
				result.current.toggleProject("proj-1")
			})

			expect(result.current.selectedProjectIds).toEqual(["proj-2"])
			expect(result.current.selectedFragmentIds.has("f1")).toBe(false)
			expect(result.current.selectedFragmentIds.has("f2")).toBe(false)
			expect(result.current.selectedFragmentIds.has("f3")).toBe(true)
			expect(result.current.selectedFragmentIds.has("f4")).toBe(true)
		})
	})

	describe("target device filtering", () => {
		it("returns no available targets when no project is selected", () => {
			const { result } = setup({})

			expect(result.current.availableTargetDevices).toEqual([])
		})

		it("shows only devices that have fragments from selected projects", () => {
			const { result } = setup({})

			act(() => {
				result.current.toggleProject("proj-2")
			})

			const targetIds = result.current.availableTargetDevices.map(
				(d) => d.deviceId,
			)

			expect(targetIds).toEqual(
				expect.arrayContaining(["dev-phone", "dev-laptop"]),
			)
			expect(targetIds).not.toContain("dev-desktop")
			expect(targetIds).not.toContain("dev-tablet")
		})

		it("current device appears in available targets", () => {
			const { result } = setup({ localDeviceId: "dev-desktop" })

			act(() => {
				result.current.toggleProject("proj-1")
			})

			const targetIds = result.current.availableTargetDevices.map(
				(d) => d.deviceId,
			)

			expect(targetIds).toContain("dev-desktop")
		})
	})

	describe("greyed-out fragments", () => {
		it("no fragments are greyed out when no targets are selected", () => {
			const { result } = setup({})

			act(() => {
				result.current.toggleProject("proj-1")
			})

			expect(result.current.greyedOutFragmentIds.has("f1")).toBe(false)
			expect(result.current.greyedOutFragmentIds.has("f2")).toBe(false)
		})

		it("fragment is greyed out when it exists on ALL selected targets", () => {
			const { result } = setup({})

			act(() => {
				result.current.toggleProject("proj-1")
			})
			act(() => {
				result.current.toggleTarget("dev-desktop")
			})
			act(() => {
				result.current.toggleTarget("dev-tablet")
			})

			expect(result.current.greyedOutFragmentIds.has("f1")).toBe(true)
			expect(result.current.greyedOutFragmentIds.has("f2")).toBe(true)
		})

		it("fragment NOT greyed out when at least one target lacks it", () => {
			const { result } = setup({})

			act(() => {
				result.current.toggleProject("proj-2")
			})
			act(() => {
				result.current.toggleTarget("dev-phone")
			})
			act(() => {
				result.current.toggleTarget("dev-laptop")
			})

			expect(result.current.greyedOutFragmentIds.has("f3")).toBe(false)
			expect(result.current.greyedOutFragmentIds.has("f4")).toBe(false)
		})

		it("fragment greyed out only when on ALL targets, not just some", () => {
			const { result } = setup({})

			act(() => {
				result.current.toggleProject("proj-1")
			})
			act(() => {
				result.current.toggleTarget("dev-desktop")
			})
			act(() => {
				result.current.toggleTarget("dev-phone")
			})

			expect(result.current.greyedOutFragmentIds.has("f1")).toBe(true)
			expect(result.current.greyedOutFragmentIds.has("f2")).toBe(false)
		})
	})

	describe("source device selection", () => {
		it("current device is excluded from available sources", () => {
			const { result } = setup({ localDeviceId: "dev-desktop" })

			act(() => {
				result.current.toggleProject("proj-1")
			})

			const sourceIds = result.current.availableSourceDevices.map(
				(d) => d.deviceId,
			)

			expect(sourceIds).not.toContain("dev-desktop")
			expect(sourceIds).toContain("dev-tablet")
			expect(sourceIds).toContain("dev-phone")
		})

		it("initSourceDefaults checks all available sources", () => {
			const { result } = setup({ localDeviceId: "dev-desktop" })

			act(() => {
				result.current.toggleProject("proj-1")
			})
			act(() => {
				result.current.toggleTarget("dev-phone")
			})
			act(() => {
				result.current.initSourceDefaults()
			})

			expect(result.current.selectedSourceDeviceIds).toEqual([
				"dev-phone",
				"dev-tablet",
			])
		})
	})

	describe("duplicate detection", () => {
		it("detects duplicate fragments across selected sources", () => {
			const { result } = setup({ localDeviceId: "dev-desktop" })

			act(() => {
				result.current.toggleProject("proj-1")
			})
			act(() => {
				result.current.initSourceDefaults()
			})

			expect(result.current.duplicateFragmentIds.has("f1")).toBe(true)
			expect(result.current.duplicateFragmentIds.has("f2")).toBe(false)
		})

		it("no duplicates when only one source is selected", () => {
			const { result } = setup({ localDeviceId: "dev-desktop" })

			act(() => {
				result.current.toggleProject("proj-1")
			})
			act(() => {
				result.current.toggleSource("dev-tablet")
			})

			expect(result.current.duplicateFragmentIds.size).toBe(0)
			expect(result.current.duplicateFragmentIds.size).toBe(0)
		})
	})

	describe("resolveDuplicate", () => {
		it("unchecks fragment on all other sources and keeps it checked on authoritative", () => {
			const { result } = setup({ localDeviceId: "dev-desktop" })

			act(() => {
				result.current.toggleProject("proj-1")
			})
			act(() => {
				result.current.toggleSource("dev-desktop")
			})
			act(() => {
				result.current.toggleSource("dev-phone")
			})
			act(() => {
				result.current.toggleSource("dev-tablet")
			})

			expect(result.current.resolvedDuplicates.size).toBe(0)

			act(() => {
				result.current.resolveDuplicate("f1", "dev-desktop")
			})

			expect(
				result.current.uncheckedPerSource.get("dev-desktop")?.has("f1"),
			).toBeFalsy()
			expect(
				result.current.uncheckedPerSource.get("dev-phone")?.has("f1"),
			).toBe(true)
			expect(
				result.current.uncheckedPerSource.get("dev-tablet")?.has("f1"),
			).toBe(true)
			expect(result.current.resolvedDuplicates.get("f1")).toBe(
				"dev-desktop",
			)
		})

		it("resolveAllDuplicatesOnDevice resolves all duplicate fragments for a device", () => {
			const { result } = setup({ localDeviceId: "dev-desktop" })

			act(() => {
				result.current.toggleProject("proj-1")
			})
			act(() => {
				result.current.toggleSource("dev-desktop")
			})
			act(() => {
				result.current.toggleSource("dev-phone")
			})
			act(() => {
				result.current.toggleSource("dev-tablet")
			})

			act(() => {
				result.current.resolveAllDuplicatesOnDevice("dev-desktop")
			})

			expect(result.current.resolvedDuplicates.get("f1")).toBe(
				"dev-desktop",
			)
			expect(result.current.resolvedDuplicates.get("f2")).toBe(
				"dev-desktop",
			)
		})
	})

	describe("sourceDevicesWithFragments metadata", () => {
		it("includes per-fragment duplicate and resolution info", () => {
			const { result } = setup({ localDeviceId: "dev-desktop" })

			act(() => {
				result.current.toggleProject("proj-1")
			})
			act(() => {
				result.current.toggleSource("dev-phone")
			})
			act(() => {
				result.current.toggleSource("dev-tablet")
			})

			const device = result.current.sourceDevicesWithFragments.find(
				(d) => d.device.deviceId === "dev-phone",
			)

			expect(device).toBeDefined()
			expect(device!.fragments.length).toBeGreaterThan(0)

			const f1Info = device!.fragments.find((f) => f.fragment.id === "f1")
			expect(f1Info).toBeDefined()
			expect(f1Info!.isDuplicate).toBe(true)
			expect(f1Info!.isResolved).toBe(false)
			expect(f1Info!.updatedAt).toBeTruthy()
		})
	})

	describe("per-source fragment toggling", () => {
		it("allows unchecking a fragment on a specific source", () => {
			const { result } = setup({ localDeviceId: "dev-desktop" })

			act(() => {
				result.current.toggleProject("proj-1")
			})
			act(() => {
				result.current.initSourceDefaults()
			})

			act(() => {
				result.current.toggleFragmentOnSource("dev-tablet", "f1")
			})

			expect(
				result.current.uncheckedPerSource.get("dev-tablet")?.has("f1"),
			).toBe(true)
			expect(
				result.current.uncheckedPerSource.get("dev-tablet")?.has("f2"),
			).toBe(false)
		})

		it("unchecked fragments are excluded from getFragmentsForSource", () => {
			const { result } = setup({ localDeviceId: "dev-desktop" })

			act(() => {
				result.current.toggleProject("proj-1")
			})
			act(() => {
				result.current.initSourceDefaults()
			})

			act(() => {
				result.current.toggleFragmentOnSource("dev-tablet", "f2")
			})

			const tabletFrags =
				result.current.getFragmentsForSource("dev-tablet")
			expect(tabletFrags.map((f) => f.id)).toEqual(["f1"])
		})
	})

	describe("canSend", () => {
		it("false when no projects selected", () => {
			const { result } = setup({})

			act(() => {
				result.current.toggleTarget("dev-phone")
			})
			act(() => {
				result.current.toggleSource("dev-tablet")
			})

			expect(result.current.canSend).toBe(false)
		})

		it("false when no targets selected", () => {
			const { result } = setup({})

			act(() => {
				result.current.toggleProject("proj-1")
			})
			act(() => {
				result.current.toggleSource("dev-tablet")
			})

			expect(result.current.canSend).toBe(false)
		})

		it("false when no sources selected", () => {
			const { result } = setup({})

			act(() => {
				result.current.toggleProject("proj-1")
			})
			act(() => {
				result.current.toggleTarget("dev-phone")
			})

			expect(result.current.canSend).toBe(false)
		})

		it("true when project, target, and source are all selected", () => {
			const { result } = setup({})

			act(() => {
				result.current.toggleProject("proj-1")
			})
			act(() => {
				result.current.toggleTarget("dev-phone")
			})
			act(() => {
				result.current.toggleSource("dev-tablet")
			})

			expect(result.current.canSend).toBe(true)
		})
	})

	describe("buildSendPayload", () => {
		it("returns empty array when canSend is false", () => {
			const { result } = setup({})

			const payload = result.current.buildSendPayload("hello")

			expect(payload).toEqual([])
		})

		it("creates one payload item per (source, target) pair", () => {
			const { result } = setup({ localDeviceId: "dev-desktop" })

			act(() => {
				result.current.toggleProject("proj-1")
			})
			act(() => {
				result.current.toggleTarget("dev-phone")
			})
			act(() => {
				result.current.toggleTarget("dev-tablet")
			})
			act(() => {
				result.current.initSourceDefaults()
			})

			const payload = result.current.buildSendPayload("test message")

			expect(payload.length).toBeGreaterThan(0)

			for (const item of payload) {
				expect(item.sourceDeviceId).toBeTruthy()
				expect(item.targetDeviceId).toBeTruthy()
				expect(item.fragmentIds.length).toBeGreaterThan(0)
				expect(item.fragmentNames).toHaveLength(item.fragmentIds.length)
				expect(item.message).toBe("test message")
			}
		})
	})
})
