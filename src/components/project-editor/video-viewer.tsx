"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { IconPlayerRecord, IconVideo } from "@tabler/icons-react"
import { useTranslations } from "next-intl"

import { useEditorContext } from "./editor-context"
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
		startRecording,
		rawFramesDirectoryHandle,
		notifyNoDirectory,
	} = useEditorContext()
	const videoRef = useRef<HTMLVideoElement>(null)
	const streamRef = useRef<MediaStream | null>(null)
	const [showLayerPicker, setShowLayerPicker] = useState(false)

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

	const handleStartRecording = useCallback(
		async (layerId: string) => {
			await startRecording(layerId, streamRef.current ?? undefined)
		},
		[startRecording],
	)

	const handleRecordClick = useCallback(() => {
		if (!rawFramesDirectoryHandle) {
			notifyNoDirectory()
			return
		}

		if (pendingRecordingLayerId) {
			handleStartRecording(pendingRecordingLayerId)
			clearPendingRecordingLayerId()
		} else {
			setShowLayerPicker((prev) => !prev)
		}
	}, [
		rawFramesDirectoryHandle,
		pendingRecordingLayerId,
		handleStartRecording,
		clearPendingRecordingLayerId,
		notifyNoDirectory,
	])

	const handleLayerSelect = useCallback(
		(layerId: string) => {
			setShowLayerPicker(false)
			handleStartRecording(layerId)
		},
		[handleStartRecording],
	)

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
							<button
								className={styles.recordButton}
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
							{showLayerPicker && layers.length > 0 && (
								<div className={styles.layerPicker}>
									{layers.map((layer) => (
										<button
											key={layer.id}
											className={styles.layerOption}
											onClick={() =>
												handleLayerSelect(layer.id)
											}
											type="button">
											{layer.name}
										</button>
									))}
								</div>
							)}
						</div>
					)}
				</div>
			</div>
		)
	}

	return (
		<div className={styles.wrapper}>
			<div className={styles.viewport}>
				<div className={styles.placeholder}>
					<IconVideo size={48} stroke={1} />
					<span>{translations("videoPreview")}</span>
				</div>
			</div>
		</div>
	)
}

VideoViewer.displayName = "VideoViewer"
