"use client"

import { Menu } from "@mantine/core"
import {
	IconCheck,
	IconChevronDown,
	IconPlayerRecord,
	IconPlus,
	IconVideo,
} from "@tabler/icons-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { useTranslations } from "next-intl"

import { useEditorContext } from "./editor-context"
import { useCompositor } from "@/lib/editor/use-compositor"
import { PlaybackControls } from "./playback-controls"
import styles from "./video-viewer.module.scss"

export const VideoViewer = (): React.JSX.Element => {
	const translations = useTranslations("editor")
	const {
		mode,
		selectedCameraId,
		setAvailableCameras,
		cameraError,
		setCameraError,
		isRecording,
		pendingRecordingLayerId,
		clearPendingRecordingLayerId,
		layers,
		addLayer,
		startRecording,
		setRecordingLayerId,
		rawFramesDirectoryHandle,
		notifyNoDirectory,
		fragments,
		projectId,
		currentTime,
		isPlaying,
		duration,
		play,
		pause,
		seek,
		playbackSpeed,
		setPlaybackSpeed,
		onTimeUpdate,
		onPlaybackEnd,
		seekImplRef,
	} = useEditorContext()
	const videoRef = useRef<HTMLVideoElement>(null)
	const streamRef = useRef<MediaStream | null>(null)
	const [selectedLayerId, setSelectedLayerId] = useState<string | null>(() =>
		layers.length > 0 ? layers[0]!.id : "__new__",
	)
	const [dropdownOpened, setDropdownOpened] = useState(false)

	const { canvasRef: compositorCanvasRef, seek: compositorSeek } =
		useCompositor({
			layers,
			fragments,
			projectId,
			rootDirHandle: rawFramesDirectoryHandle,
			isPlaying,
			playbackSpeed,
			duration,
			onTimeUpdate,
			onPlaybackEnd,
		})

	useEffect(() => {
		seekImplRef.current = compositorSeek
	}, [compositorSeek, seekImplRef])

	useEffect(() => {
		if (mode !== "capture") {
			return
		}

		setCameraError(null)

		let cancelled = false

		const enumerate = async () => {
			const devices = await navigator.mediaDevices.enumerateDevices()
			if (cancelled) return
			const cameras = devices.filter(
				(device) => device.kind === "videoinput",
			)
			setAvailableCameras(cameras)
		}

		const startCamera = async () => {
			try {
				const stream = await navigator.mediaDevices.getUserMedia({
					video: {
						deviceId: { exact: selectedCameraId },
					},
					audio: false,
				})

				if (cancelled) {
					stream.getTracks().forEach((track) => track.stop())
					return
				}

				streamRef.current = stream
				if (videoRef.current) {
					videoRef.current.srcObject = stream
				}
			} catch (error) {
				setCameraError(
					error instanceof DOMException
						? error.message
						: "camera.noCamera",
				)
			}
		}

		if (selectedCameraId) {
			startCamera()
		}

		enumerate()

		const handleDeviceChange = async () => {
			const devices = await navigator.mediaDevices.enumerateDevices()
			const cameras = devices.filter(
				(device) => device.kind === "videoinput",
			)
			setAvailableCameras(cameras)
			if (cameras.length > 0) {
				setCameraError(null)
			}
		}

		navigator.mediaDevices.addEventListener(
			"devicechange",
			handleDeviceChange,
		)

		return () => {
			cancelled = true
			if (streamRef.current) {
				streamRef.current.getTracks().forEach((track) => track.stop())
				streamRef.current = null
			}
			setCameraError(null)
			navigator.mediaDevices.removeEventListener(
				"devicechange",
				handleDeviceChange,
			)
		}
	}, [mode, selectedCameraId, setAvailableCameras, setCameraError])

	const handleRecordClick = useCallback(async () => {
		if (!rawFramesDirectoryHandle) {
			notifyNoDirectory()
			return
		}

		if (pendingRecordingLayerId) {
			await startRecording(
				pendingRecordingLayerId,
				streamRef.current ?? undefined,
			)
			clearPendingRecordingLayerId()
			return
		}

		const targetLayerId =
			selectedLayerId === "__new__"
				? null
				: (selectedLayerId ?? layers[0]?.id)

		if (targetLayerId) {
			await startRecording(targetLayerId, streamRef.current ?? undefined)
		} else {
			await startRecording(null, streamRef.current ?? undefined)

			addLayer().then((layer) => {
				if (layer) {
					setRecordingLayerId(layer.id)
				}
			})
		}
	}, [
		rawFramesDirectoryHandle,
		pendingRecordingLayerId,
		selectedLayerId,
		layers,
		clearPendingRecordingLayerId,
		notifyNoDirectory,
		startRecording,
		addLayer,
		setRecordingLayerId,
	])

	if (mode === "capture") {
		const hasActiveCamera = Boolean(selectedCameraId) && !cameraError
		const showRecordButton = hasActiveCamera && !isRecording

		return (
			<div className={styles.wrapper}>
				<div className={styles.viewport}>
					{hasActiveCamera ? (
						<video
							ref={videoRef}
							autoPlay
							muted
							playsInline
							className={styles.cameraFeed}
						/>
					) : (
						<div className={styles.placeholder}>
							<IconVideo size={48} stroke={1} />
							<span>
								{cameraError ??
									translations("camera.selectCamera")}
							</span>
						</div>
					)}
					{showRecordButton && (
						<div className={styles.recordOverlay}>
							<div className={styles.recordButtonContainer}>
								<button
									className={styles.recordButtonMain}
									onClick={handleRecordClick}
									type="button">
									<IconPlayerRecord size={20} />
									<span>
										{pendingRecordingLayerId
											? translations("recording.start")
											: translations(
													"recording.startWithLayer",
												)}
									</span>
								</button>
								{pendingRecordingLayerId ? null : (
									<Menu
										opened={dropdownOpened}
										onChange={setDropdownOpened}
										position="top-end"
										withinPortal={false}
										offset={4}>
										<Menu.Target>
											<button
												className={
													styles.recordButtonDropdown
												}
												type="button"
												aria-label="Select layer">
												<IconChevronDown size={16} />
											</button>
										</Menu.Target>
										<Menu.Dropdown>
											<Menu.Label>
												{translations(
													"recording.recordTo",
												)}
											</Menu.Label>
											{layers.map((layer) => (
												<Menu.Item
													key={layer.id}
													leftSection={
														selectedLayerId ===
														layer.id ? (
															<IconCheck
																size={16}
															/>
														) : undefined
													}
													onClick={() => {
														setSelectedLayerId(
															layer.id,
														)
														setDropdownOpened(false)
													}}>
													{layer.name}
												</Menu.Item>
											))}
											<Menu.Divider />
											<Menu.Item
												leftSection={
													selectedLayerId ===
													"__new__" ? (
														<IconCheck size={16} />
													) : (
														<IconPlus size={16} />
													)
												}
												onClick={() => {
													setSelectedLayerId(
														"__new__",
													)
													setDropdownOpened(false)
												}}>
												{translations(
													"recording.recordNew",
												)}
											</Menu.Item>
										</Menu.Dropdown>
									</Menu>
								)}
							</div>
						</div>
					)}
				</div>
			</div>
		)
	}

	const hasTimelineContent = layers.some((l) => l.segments.length > 0)

	return (
		<div className={styles.wrapper}>
			<div className={styles.viewport}>
				{hasTimelineContent ? (
					<>
						<canvas
							ref={compositorCanvasRef}
							className={styles.compositorCanvas}
						/>
						<PlaybackControls
							currentTime={currentTime}
							duration={duration}
							isPlaying={isPlaying}
							playbackSpeed={playbackSpeed}
							onPlay={play}
							onPause={pause}
							onSeek={seek}
							onSpeedChange={setPlaybackSpeed}
						/>
					</>
				) : (
					<div className={styles.placeholder}>
						<IconVideo size={48} stroke={1} />
						<span>{translations("videoPreview")}</span>
					</div>
				)}
			</div>
		</div>
	)
}

VideoViewer.displayName = "VideoViewer"
