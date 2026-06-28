import "@testing-library/jest-dom"
import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "bun:test"
import type { ReactNode } from "react"

import { EditorContext, type EditorMode } from "./editor-context"
import { SidePane } from "./side-pane"

vi.mock("next-intl", () => ({
	useTranslations: () => (key: string) => key,
}))

vi.mock("@mantine/core", () => ({
	// eslint-disable-next-line @typescript-eslint/naming-convention
	Drawer: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock("@mantine/hooks", () => ({
	useMediaQuery: () => true,
}))

const mockSetSelectedCameraId = vi.fn()

const mockCameras = [
	{
		deviceId: "cam-1",
		groupId: "group-1",
		kind: "videoinput",
		label: "Camera One",
		toJSON: () => ({}),
	},
	{
		deviceId: "cam-2",
		groupId: "group-1",
		kind: "videoinput",
		label: "Camera Two",
		toJSON: () => ({}),
	},
] as MediaDeviceInfo[]

const mockAddLayer = vi.fn()
const mockAddSegment = vi.fn()

const defaultContextValue = {
	mode: "capture" as EditorMode,
	selectedCameraId: "",
	setSelectedCameraId: mockSetSelectedCameraId,
	availableCameras: mockCameras,
	setAvailableCameras: vi.fn(),
	cameraError: null as string | null,
	setCameraError: vi.fn(),
	sidePaneOpen: true,
	toggleSidePane: vi.fn(),
	closeSidePane: vi.fn(),
	activeTab: "settings" as const,
	setActiveTab: vi.fn(),
	timelineExpanded: false,
	toggleTimeline: vi.fn(),
	setMode: vi.fn(),
	layers: [],
	setLayers: vi.fn(),
	fragments: [],
	projectId: "test-project",
	addLayer: mockAddLayer,
	addSegment: mockAddSegment,
}

const renderWithContext = (
	overrides: Partial<typeof defaultContextValue> = {},
) =>
	render(
		<EditorContext.Provider
			value={{ ...defaultContextValue, ...overrides }}>
			<SidePane />
		</EditorContext.Provider>,
	)

afterEach(() => {
	cleanup()
	vi.clearAllMocks()
})

describe("SidePane camera list", () => {
	it("shows a None option alongside camera options", () => {
		renderWithContext()

		expect(screen.getByText("camera.none")).toBeInTheDocument()
		expect(screen.getByText("Camera One")).toBeInTheDocument()
		expect(screen.getByText("Camera Two")).toBeInTheDocument()
	})

	it("selects None when the None button is clicked", async () => {
		const user = userEvent.setup()
		renderWithContext()

		await user.click(screen.getByText("camera.none"))

		expect(mockSetSelectedCameraId).toHaveBeenCalledWith("")
	})

	it("selects a camera when its button is clicked", async () => {
		const user = userEvent.setup()
		renderWithContext()

		await user.click(screen.getByText("Camera Two"))

		expect(mockSetSelectedCameraId).toHaveBeenCalledWith("cam-2")
	})

	it("marks None as selected when no camera is chosen", () => {
		renderWithContext()

		const noneButton = screen.getByText("camera.none").closest("button")
		expect(noneButton).toHaveAttribute("data-selected")
	})

	it("marks the active camera as selected", () => {
		renderWithContext({ selectedCameraId: "cam-1" })

		const cameraButton = screen.getByText("Camera One").closest("button")
		const noneButton = screen.getByText("camera.none").closest("button")
		expect(cameraButton).toHaveAttribute("data-selected")
		expect(noneButton).not.toHaveAttribute("data-selected")
	})

	it("does not show camera settings when no cameras are available", () => {
		renderWithContext({ availableCameras: [] })

		expect(screen.queryByText("camera.none")).not.toBeInTheDocument()
		expect(
			screen.queryByText("camera.selectCamera"),
		).not.toBeInTheDocument()
	})
})
