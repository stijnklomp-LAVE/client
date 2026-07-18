"use client"

import {
	IconPlayerPlayFilled,
	IconPlayerPauseFilled,
} from "@tabler/icons-react"
import { useCallback, useRef, type KeyboardEvent } from "react"

import styles from "./playback-controls.module.scss"

type PlaybackControlsProps = {
	currentTime: number
	duration: number
	isPlaying: boolean
	playbackSpeed: number
	onPlay: () => void
	onPause: () => void
	onSeek: (time: number) => void
	onSpeedChange: (speed: number) => void
}

const formatTime = (seconds: number): string => {
	if (!Number.isFinite(seconds) || seconds < 0) return "00:00.000"

	const mins = Math.floor(seconds / 60)
	const secs = seconds % 60

	return `${String(mins).padStart(2, "0")}:${secs.toFixed(3).padStart(7, "0")}`
}

const SPEEDS = [0.25, 0.5, 1, 1.5, 2] as const

export const PlaybackControls = ({
	currentTime,
	duration,
	isPlaying,
	playbackSpeed,
	onPlay,
	onPause,
	onSeek,
	onSpeedChange,
}: PlaybackControlsProps): React.JSX.Element => {
	const seekBarRef = useRef<HTMLInputElement>(null)
	const containerRef = useRef<HTMLDivElement>(null)

	const handlePlayPause = useCallback(() => {
		if (isPlaying) {
			onPause()
		} else {
			onPlay()
		}
	}, [isPlaying, onPlay, onPause])

	const handleSeekChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			onSeek(Number.parseFloat(e.target.value))
		},
		[onSeek],
	)

	const handleKeyDown = useCallback(
		(e: KeyboardEvent) => {
			switch (e.key) {
				case " ":
					e.preventDefault()
					handlePlayPause()
					break

				case "ArrowLeft":
					e.preventDefault()
					onSeek(Math.max(0, currentTime - 1))
					break

				case "ArrowRight":
					e.preventDefault()
					onSeek(Math.min(duration, currentTime + 1))
					break

				case "Home":
					e.preventDefault()
					onSeek(0)
					break

				case "End":
					e.preventDefault()
					onSeek(duration)
					break
			}
		},
		[currentTime, duration, handlePlayPause, onSeek],
	)

	const cycleSpeed = useCallback(() => {
		const idx = SPEEDS.indexOf(playbackSpeed as (typeof SPEEDS)[number])
		const nextIdx = (idx + 1) % SPEEDS.length

		onSpeedChange(SPEEDS[nextIdx]!)
	}, [playbackSpeed, onSpeedChange])

	const progress =
		duration > 0 ? ((currentTime / duration) * 100).toFixed(2) : "0"

	const seekBarStyle: Record<string, string> = {}
	seekBarStyle["--progress"] = `${progress}%`

	return (
		<div
			ref={containerRef}
			className={styles.controls}
			onKeyDown={handleKeyDown}
			tabIndex={-1}>
			<div className={styles.mainRow}>
				<button
					type="button"
					className={styles.playButton}
					onClick={handlePlayPause}
					aria-label={isPlaying ? "Pause" : "Play"}
					title={isPlaying ? "Pause (Space)" : "Play (Space)"}>
					{isPlaying ? (
						<IconPlayerPauseFilled size={20} />
					) : (
						<IconPlayerPlayFilled size={20} />
					)}
				</button>

				<div className={styles.seekContainer}>
					<input
						ref={seekBarRef}
						type="range"
						className={styles.seekBar}
						min={0}
						max={duration || 0}
						step={0.001}
						value={currentTime}
						onChange={handleSeekChange}
						aria-label="Seek"
						style={seekBarStyle}
					/>
				</div>

				<span className={styles.timeDisplay}>
					{formatTime(currentTime)} / {formatTime(duration)}
				</span>

				<button
					type="button"
					className={styles.speedButton}
					onClick={cycleSpeed}
					title={`Speed: ${playbackSpeed}x`}>
					{playbackSpeed}x
				</button>
			</div>
		</div>
	)
}

PlaybackControls.displayName = "PlaybackControls"
