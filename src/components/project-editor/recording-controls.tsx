"use client"

import {
	IconPlayerStop,
	IconPlayerPause,
	IconPlayerPlay,
} from "@tabler/icons-react"
import { useTranslations } from "next-intl"

import { useEditorContext } from "./editor-context"
import styles from "./recording-controls.module.scss"

export const RecordingControls = (): React.JSX.Element | null => {
	const translations = useTranslations("editor")
	const {
		isRecording,
		recordingElapsedMs,
		recordingFrameCount,
		stopRecording,
		pauseRecording,
		resumeRecording,
		isPaused,
	} = useEditorContext()

	if (!isRecording) return null

	const formatTime = (ms: number): string => {
		const totalSeconds = Math.floor(ms / 1000)
		const minutes = Math.floor(totalSeconds / 60)
		const seconds = totalSeconds % 60
		return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
	}

	return (
		<div className={styles.overlay}>
			<div className={styles.bar}>
				<div className={styles.indicator}>
					<span className={styles.dot} />
					<span className={styles.label}>
						{translations("recording.recording")}
					</span>
					<span className={styles.timer}>
						{formatTime(recordingElapsedMs)}
					</span>
					<span className={styles.frameCount}>
						{translations("recording.framesCaptured", {
							count: recordingFrameCount,
						})}
					</span>
				</div>
				<div className={styles.actions}>
					<button
						className={styles.iconButton}
						onClick={isPaused ? resumeRecording : pauseRecording}
						type="button"
						aria-label={
							isPaused
								? translations("recording.resume")
								: translations("recording.pause")
						}>
						{isPaused ? (
							<IconPlayerPlay size={18} />
						) : (
							<IconPlayerPause size={18} />
						)}
					</button>
					<button
						className={styles.stopButton}
						onClick={stopRecording}
						type="button"
						aria-label={translations("recording.stop")}>
						<IconPlayerStop size={18} />
					</button>
				</div>
			</div>
		</div>
	)
}

RecordingControls.displayName = "RecordingControls"
