"use client"

import { useCallback } from "react"
import { Drawer, NumberInput, Select, Slider } from "@mantine/core"
import { useMediaQuery } from "@mantine/hooks"
import { useTranslations } from "next-intl"

import { useEditorContext, type TabId } from "./editor-context"
import { pickRawFramesDirectory } from "@/lib/editor/raw-frames-directory"
import styles from "./side-pane.module.scss"

const TAB_IDS: TabId[] = ["settings", "timeline", "styling"]

const RecordingSettings = (): React.JSX.Element => {
	const t = useTranslations("editor")
	const {
		rawFramesDirectoryName,
		setRawFramesDirectory,
		recordingConfig,
		updateRecordingConfig,
		projectId,
	} = useEditorContext()

	const handleChooseDirectory = useCallback(async () => {
		const handle = await pickRawFramesDirectory(projectId)
		if (handle) {
			setRawFramesDirectory(handle)
		}
	}, [projectId, setRawFramesDirectory])

	const handleRemoveDirectory = useCallback(() => {
		setRawFramesDirectory(null)
	}, [setRawFramesDirectory])

	return (
		<div className={styles.section}>
			<p className={styles.settingLabel}>{t("recording.directory")}</p>
			{rawFramesDirectoryName ? (
				<div className={styles.directoryInfo}>
					<span className={styles.directoryName}>
						{rawFramesDirectoryName}
					</span>
					<button
						className={styles.removeButton}
						onClick={handleRemoveDirectory}
						type="button">
						{t("recording.remove")}
					</button>
				</div>
			) : (
				<button
					className={styles.chooseButton}
					onClick={handleChooseDirectory}
					type="button">
					{t("recording.chooseDirectory")}
				</button>
			)}

			<p className={styles.settingLabel}>{t("recording.fps")}</p>
			<NumberInput
				value={recordingConfig.fps}
				onChange={(value) =>
					updateRecordingConfig({
						fps: typeof value === "string" ? Number(value) : value,
					})
				}
				min={0.1}
				max={30}
				step={0.5}
				decimalScale={1}
				size="xs"
			/>

			<p className={styles.settingLabel}>{t("recording.format")}</p>
			<Select
				data={[
					{ label: "JPEG", value: "jpeg" },
					{ label: "PNG", value: "png" },
				]}
				value={recordingConfig.format}
				onChange={(value) => {
					if (value === "jpeg" || value === "png") {
						updateRecordingConfig({ format: value })
					}
				}}
				size="xs"
			/>

			{recordingConfig.format === "jpeg" && (
				<>
					<p className={styles.settingLabel}>
						{t("recording.quality")}
					</p>
					<Slider
						value={recordingConfig.jpegQuality}
						onChange={(value) =>
							updateRecordingConfig({ jpegQuality: value })
						}
						min={1}
						max={100}
						label={(v) => `${v}%`}
						size="xs"
					/>
				</>
			)}
		</div>
	)
}

RecordingSettings.displayName = "RecordingSettings"

const CameraSettings = (): React.JSX.Element => {
	const t = useTranslations("editor")
	const {
		selectedCameraId,
		setSelectedCameraId,
		availableCameras,
		cameraError,
	} = useEditorContext()

	if (availableCameras.length === 0) {
		return (
			<div className={styles.section}>
				<p className={styles.placeholderText}>
					{cameraError ?? t("camera.noCamera")}
				</p>
			</div>
		)
	}

	return (
		<div className={styles.section}>
			<p className={styles.settingLabel}>{t("camera.selectCamera")}</p>
			<div className={styles.cameraList}>
				<button
					className={styles.cameraOption}
					data-selected={selectedCameraId === "" ? true : undefined}
					onClick={() => setSelectedCameraId("")}
					type="button">
					{t("camera.none")}
				</button>
				{availableCameras.map((camera) => (
					<button
						key={camera.deviceId}
						className={styles.cameraOption}
						data-selected={
							selectedCameraId === camera.deviceId || undefined
						}
						onClick={() => setSelectedCameraId(camera.deviceId)}
						type="button">
						{camera.label ||
							`Camera ${camera.deviceId.slice(0, 8)}`}
					</button>
				))}
			</div>
		</div>
	)
}

CameraSettings.displayName = "CameraSettings"

const SidePaneContent = (): React.JSX.Element => {
	const t = useTranslations("editor")
	const { mode, activeTab, setActiveTab } = useEditorContext()

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
				{activeTab === "settings" ? (
					mode === "capture" ? (
						<CameraSettings />
					) : (
						<RecordingSettings />
					)
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
