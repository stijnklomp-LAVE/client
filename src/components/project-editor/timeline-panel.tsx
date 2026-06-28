"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { IconChevronDown, IconChevronUp, IconPlus } from "@tabler/icons-react"
import { Modal } from "@mantine/core"
import { useTranslations } from "next-intl"

import { useEditorContext } from "./editor-context"
import styles from "./timeline-panel.module.scss"

const TIMELINE_HEIGHT_KEY = "editor.timelineHeight"
const MIN_HEIGHT = 80
const DEFAULT_HEIGHT = 200

export const TimelinePanel = (): React.JSX.Element => {
	const t = useTranslations("editor")
	const {
		timelineExpanded,
		toggleTimeline,
		layers,
		addLayer,
		addSegment,
		fragments,
	} = useEditorContext()
	const [pickerLayerId, setPickerLayerId] = useState<string | null>(null)

	const getInitialHeight = (): number => {
		try {
			const saved = localStorage.getItem(TIMELINE_HEIGHT_KEY)
			if (saved) {
				const h = Number.parseInt(saved, 10)
				if (!Number.isNaN(h) && h >= MIN_HEIGHT) return h
			}
		} catch {
			// localStorage unavailable
		}
		return DEFAULT_HEIGHT
	}

	const initialHeight = getInitialHeight()
	const heightRef = useRef(initialHeight)
	const [timelineHeight, setTimelineHeight] = useState(initialHeight)
	const [isDragging, setIsDragging] = useState(false)

	const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
		e.preventDefault()
		setIsDragging(true)

		const handleMouseMove = (moveEvent: MouseEvent) => {
			const newHeight = Math.max(
				MIN_HEIGHT,
				window.innerHeight - moveEvent.clientY,
			)
			setTimelineHeight(newHeight)
			heightRef.current = newHeight
		}

		const handleMouseUp = () => {
			setIsDragging(false)
			try {
				localStorage.setItem(
					TIMELINE_HEIGHT_KEY,
					heightRef.current.toString(),
				)
			} catch {
				// localStorage unavailable
			}
			window.removeEventListener("mousemove", handleMouseMove)
			window.removeEventListener("mouseup", handleMouseUp)
		}

		window.addEventListener("mousemove", handleMouseMove)
		window.addEventListener("mouseup", handleMouseUp)
	}, [])

	useEffect(() => {
		return () => {
			if (!isDragging) return
			try {
				localStorage.setItem(
					TIMELINE_HEIGHT_KEY,
					heightRef.current.toString(),
				)
			} catch {
				// localStorage unavailable
			}
		}
	}, [isDragging])

	return (
		<div
			className={styles.panel}
			data-expanded={timelineExpanded}
			data-dragging={isDragging}
			style={timelineExpanded ? { height: timelineHeight } : undefined}>
			{timelineExpanded && (
				<div
					className={styles.resizeHandle}
					onMouseDown={handleResizeMouseDown}
				/>
			)}
			<button
				className={styles.handle}
				onClick={toggleTimeline}
				type="button"
				aria-label={
					timelineExpanded
						? t("timeline.collapse")
						: t("timeline.expand")
				}>
				{timelineExpanded ? (
					<IconChevronDown size={14} />
				) : (
					<IconChevronUp size={14} />
				)}
				<span>{t("timeline.title")}</span>
			</button>

			{timelineExpanded && (
				<div className={styles.content}>
					{layers.length === 0 ? (
						<div className={styles.emptyState}>
							<span className={styles.emptyText}>
								No timeline layers yet
							</span>
							<button
								className={styles.addLayerButton}
								onClick={addLayer}
								type="button">
								<IconPlus size={14} />
								Add layer
							</button>
						</div>
					) : (
						<div className={styles.layers}>
							{layers.map((layer) => (
								<div key={layer.id} className={styles.track}>
									<div className={styles.trackLabel}>
										{layer.name}
									</div>
									<div className={styles.trackContent}>
										{layer.segments.map((seg) => (
											<div
												key={seg.id}
												className={styles.segment}
												style={{
													width: `${Math.max(
														(seg.outPoint -
															seg.inPoint) *
															3,
														60,
													)}px`,
												}}>
												<span
													className={styles.segName}>
													{seg.name}
												</span>
											</div>
										))}
										<button
											className={styles.addSegmentButton}
											onClick={() =>
												setPickerLayerId(layer.id)
											}
											type="button">
											<IconPlus size={12} />
											Fragment
										</button>
									</div>
								</div>
							))}
							<button
								className={styles.addLayerButton}
								onClick={addLayer}
								type="button">
								<IconPlus size={14} />
								Add layer
							</button>
						</div>
					)}
				</div>
			)}

			<Modal
				opened={pickerLayerId !== null}
				onClose={() => setPickerLayerId(null)}
				title="Select a fragment"
				size="sm"
				centered>
				<div className={styles.fragmentPicker}>
					{fragments.length === 0 ? (
						<p className={styles.pickerEmpty}>
							No fragments available. Capture or upload a fragment
							first.
						</p>
					) : (
						fragments.map((f) => (
							<button
								key={f.id}
								className={styles.pickerItem}
								onClick={async () => {
									if (!pickerLayerId) return
									await addSegment(pickerLayerId, f.id)
									setPickerLayerId(null)
								}}
								type="button">
								<span className={styles.pickerName}>
									{f.name}
								</span>
								<span className={styles.pickerMeta}>
									{Math.round(f.duration ?? 0)}s
								</span>
							</button>
						))
					)}
				</div>
			</Modal>
		</div>
	)
}

TimelinePanel.displayName = "TimelinePanel"
