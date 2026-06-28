"use client"

import { useEffect, useRef } from "react"
import { IconVideo } from "@tabler/icons-react"
import { useTranslations } from "next-intl"

import { useEditorContext } from "./editor-context"
import styles from "./video-viewer.module.scss"

export const VideoViewer = (): React.JSX.Element => {
	const t = useTranslations("editor")
	const {
		mode,
		selectedCameraId,
		setAvailableCameras,
		cameraError,
		setCameraError,
	} = useEditorContext()
	const videoRef = useRef<HTMLVideoElement>(null)
	const streamRef = useRef<MediaStream | null>(null)

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

	if (mode === "capture") {
		const hasActiveCamera = Boolean(selectedCameraId) && !cameraError
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
								{cameraError ?? t("camera.selectCamera")}
							</span>
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
					<span>{t("videoPreview")}</span>
				</div>
			</div>
		</div>
	)
}

VideoViewer.displayName = "VideoViewer"
