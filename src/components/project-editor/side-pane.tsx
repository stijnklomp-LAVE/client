"use client"

import { Drawer } from "@mantine/core"
import { useMediaQuery } from "@mantine/hooks"
import { useTranslations } from "next-intl"

import { useEditorContext, type TabId } from "./editor-context"
import styles from "./side-pane.module.scss"

const TAB_IDS: TabId[] = ["settings", "timeline", "styling"]

const SidePaneContent = (): React.JSX.Element => {
	const t = useTranslations("editor")
	const {
		mode,
		activeTab,
		setActiveTab,
		selectedCameraId,
		setSelectedCameraId,
		availableCameras,
		cameraError,
	} = useEditorContext()

	return (
		<div className={styles.sidePaneInner}>
			<div className={styles.tabBar}>
				{TAB_IDS.map((id) => {
					const isDisabled = mode === "capture" && id === "styling"
					return (
						<button
							key={id}
							className={styles.tab}
							data-active={activeTab === id}
							data-disabled={isDisabled || undefined}
							onClick={() => {
								if (!isDisabled) setActiveTab(id)
							}}
							disabled={isDisabled}
							type="button">
							{t(`tabs.${id}`)}
						</button>
					)
				})}
			</div>

			<div className={styles.tabContent}>
				{mode === "capture" && activeTab === "settings" ? (
					<div className={styles.cameraSettings}>
						{availableCameras.length === 0 ? (
							<p className={styles.placeholderText}>
								{cameraError ?? t("camera.noCamera")}
							</p>
						) : (
							<>
								<p className={styles.settingLabel}>
									{t("camera.selectCamera")}
								</p>
								<div className={styles.cameraList}>
									<button
										className={styles.cameraOption}
										data-selected={
											selectedCameraId === ""
												? true
												: undefined
										}
										onClick={() => setSelectedCameraId("")}
										type="button">
										{t("camera.none")}
									</button>
									{availableCameras.map((camera) => (
										<button
											key={camera.deviceId}
											className={styles.cameraOption}
											data-selected={
												selectedCameraId ===
													camera.deviceId || undefined
											}
											onClick={() =>
												setSelectedCameraId(
													camera.deviceId,
												)
											}
											type="button">
											{camera.label ||
												`Camera ${camera.deviceId.slice(0, 8)}`}
										</button>
									))}
								</div>
							</>
						)}
					</div>
				) : (
					<p className={styles.placeholderText}>
						{t("contentPlaceholder", {
							tab: t(`tabs.${activeTab}`),
						})}
					</p>
				)}
			</div>
		</div>
	)
}

SidePaneContent.displayName = "SidePaneContent"

export const SidePane = (): React.JSX.Element => {
	const { sidePaneOpen, closeSidePane } = useEditorContext()
	const isDesktop = useMediaQuery("(min-width: 48em)", true)

	if (isDesktop) {
		return (
			<div className={styles.sidePaneDesktop} data-open={sidePaneOpen}>
				{sidePaneOpen && <SidePaneContent />}
			</div>
		)
	}

	return (
		<Drawer
			opened={sidePaneOpen}
			onClose={closeSidePane}
			position="right"
			size={300}
			withCloseButton={false}
			padding={0}>
			<SidePaneContent />
		</Drawer>
	)
}

SidePane.displayName = "SidePane"
