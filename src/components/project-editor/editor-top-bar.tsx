"use client"

import { useCallback } from "react"
import {
	IconArrowLeft,
	IconCamera,
	IconEdit,
	IconLayoutSidebarRightCollapse,
	IconLayoutSidebarRightExpand,
	IconPlayerSkipBack,
	IconPlayerSkipForward,
} from "@tabler/icons-react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"

import { useEditorContext } from "./editor-context"
import styles from "./editor-top-bar.module.scss"

export const EditorTopBar = ({
	projectName,
}: {
	projectName?: string
}): React.JSX.Element => {
	const translations = useTranslations("editor")
	const router = useRouter()
	const { mode, setMode, sidePaneOpen, toggleSidePane } = useEditorContext()

	const handleBack = useCallback(() => {
		router.back()
	}, [router])

	return (
		<div className={styles.bar}>
			<div className={styles.left}>
				<button
					className={styles.iconButton}
					onClick={handleBack}
					type="button"
					aria-label={translations("goBack")}>
					<IconArrowLeft size={18} />
				</button>

				<div className={styles.separator} />

				<button
					className={styles.iconButton}
					onClick={() =>
						setMode(mode === "capture" ? "editing" : "capture")
					}
					type="button"
					aria-label={
						mode === "capture"
							? translations("modeEditing")
							: translations("modeCapture")
					}
					data-active={mode === "capture"}>
					{mode === "capture" ? (
						<IconEdit size={18} />
					) : (
						<IconCamera size={18} />
					)}
				</button>

				<button
					className={styles.iconButton}
					type="button"
					aria-label={translations("undo")}
					disabled>
					<IconPlayerSkipBack size={16} />
				</button>

				<button
					className={styles.iconButton}
					type="button"
					aria-label={translations("redo")}
					disabled>
					<IconPlayerSkipForward size={16} />
				</button>
			</div>

			<div className={styles.center}>
				<span className={styles.projectName}>
					{projectName ?? translations("untitledProject")}
				</span>
			</div>

			<div className={styles.right}>
				<div className={styles.saveIndicator} />
				<div className={styles.separator} />
				<button
					className={styles.iconButton}
					onClick={toggleSidePane}
					type="button"
					aria-label={
						sidePaneOpen
							? translations("closeSidePane")
							: translations("openSidePane")
					}>
					{sidePaneOpen ? (
						<IconLayoutSidebarRightCollapse size={18} />
					) : (
						<IconLayoutSidebarRightExpand size={18} />
					)}
				</button>
			</div>
		</div>
	)
}

EditorTopBar.displayName = "EditorTopBar"
