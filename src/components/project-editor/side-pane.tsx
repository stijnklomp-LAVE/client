"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
	Divider,
	Drawer,
	NativeSelect,
	NumberInput,
	Select,
	Slider,
} from "@mantine/core"
import { useMediaQuery } from "@mantine/hooks"
import { useTranslations } from "next-intl"

import { useEditorContext, type TabId } from "./editor-context"
import {
	isFileSystemAccessSupported,
	pickRawFramesDirectory,
} from "@/lib/editor/raw-frames-directory"
import styles from "./side-pane.module.scss"

const TAB_IDS: TabId[] = ["settings", "timeline", "styling"]

const RecordingSettings = (): React.JSX.Element => {
	const translations = useTranslations("editor")
	const {
		rawFramesDirectoryName,
		setRawFramesDirectory,
		recordingConfig,
		updateRecordingConfig,
		projectId,
		wiggleDirectoryKey,
	} = useEditorContext()
	const [directoryError, setDirectoryError] = useState<string | null>(null)
	const [wiggling, setWiggling] = useState(false)
	const wiggleTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

	useEffect(() => {
		if (wiggleDirectoryKey === 0) return
		clearTimeout(wiggleTimer.current)
		wiggleTimer.current = setTimeout(() => {
			setWiggling(true)
			setTimeout(() => setWiggling(false), 500)
		})
		return () => clearTimeout(wiggleTimer.current)
	}, [wiggleDirectoryKey])

	const handleChooseDirectory = useCallback(async () => {
		setDirectoryError(null)

		if (!isFileSystemAccessSupported()) {
			setDirectoryError(
				translations("recording.directoryBrowserUnsupported"),
			)
			return
		}

		try {
			const handle = await pickRawFramesDirectory(projectId)
			if (handle) {
				setRawFramesDirectory(handle)
			}
		} catch (err) {
			setDirectoryError(
				err instanceof Error
					? err.message
					: translations("recording.directoryError"),
			)
		}
	}, [projectId, setRawFramesDirectory, translations])

	const handleRemoveDirectory = useCallback(() => {
		setRawFramesDirectory(null)
		setDirectoryError(null)
	}, [setRawFramesDirectory])

	return (
		<div className={styles.section}>
			<div className={wiggling ? styles.directoryWiggle : undefined}>
				<p className={styles.settingLabel}>
					{translations("recording.directory")}
				</p>
				{rawFramesDirectoryName ? (
					<div className={styles.directoryInfo}>
						<span className={styles.directoryName}>
							{rawFramesDirectoryName}
						</span>
						<button
							className={styles.removeButton}
							onClick={handleRemoveDirectory}
							type="button">
							{translations("recording.remove")}
						</button>
					</div>
				) : (
					<button
						className={styles.chooseButton}
						onClick={handleChooseDirectory}
						type="button">
						{translations("recording.chooseDirectory")}
					</button>
				)}
				{directoryError && (
					<p className={styles.directoryError}>{directoryError}</p>
				)}
			</div>

			<p className={styles.settingLabel}>
				{translations("recording.fps")}
			</p>
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

			<p className={styles.settingLabel}>
				{translations("recording.format")}
			</p>
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
						{translations("recording.quality")}
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
	const translations = useTranslations("editor")
	const {
		selectedCameraId,
		setSelectedCameraId,
		availableCameras,
		cameraError,
	} = useEditorContext()

	return (
		<div className={styles.section}>
			<p className={styles.settingLabel}>
				{translations("camera.selectCamera")}
			</p>
			<NativeSelect
				value={selectedCameraId}
				onChange={(e) => setSelectedCameraId(e.currentTarget.value)}
				data={[
					{ label: translations("camera.none"), value: "" },
					...availableCameras.map((camera) => ({
						label:
							camera.label ||
							`Camera ${camera.deviceId.slice(0, 8)}`,
						value: camera.deviceId,
					})),
				]}
				size="xs"
				error={cameraError ?? undefined}
			/>
		</div>
	)
}

CameraSettings.displayName = "CameraSettings"

const SidePaneContent = (): React.JSX.Element => {
	const translations = useTranslations("editor")
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
							{translations(`tabs.${id}`)}
						</button>
					)
				})}
			</div>

			<div className={styles.tabContent}>
				{activeTab === "settings" ? (
					<>
						<RecordingSettings />
						{mode === "capture" && (
							<>
								<Divider my="xs" />
								<CameraSettings />
							</>
						)}
					</>
				) : (
					<p className={styles.placeholderText}>
						{translations("contentPlaceholder", {
							tab: translations(`tabs.${activeTab}`),
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
