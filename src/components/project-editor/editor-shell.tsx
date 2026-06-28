"use client"

import { EditorProvider, type ProjectFragment } from "./editor-context"
import { EditorTopBar } from "./editor-top-bar"
import { VideoViewer } from "./video-viewer"
import { RecordingControls } from "./recording-controls"
import { SidePane } from "./side-pane"
import { TimelinePanel } from "./timeline-panel"
import type { TimelineLayer } from "@/lib/editor/types"
import styles from "./editor-shell.module.scss"

export const EditorShell = ({
	initialLayers,
	projectId,
	projectName,
	fragments,
}: {
	initialLayers: TimelineLayer[]
	projectId: string
	projectName?: string
	fragments: ProjectFragment[]
}): React.JSX.Element => {
	return (
		<EditorProvider
			initialLayers={initialLayers}
			initialFragments={fragments}
			projectId={projectId}>
			<div className={styles.shell}>
				<div className={styles.topbarArea}>
					<EditorTopBar projectName={projectName} />
				</div>

				<div className={styles.mainArea}>
					<VideoViewer />
					<RecordingControls />
				</div>

				<div className={styles.sidebarArea}>
					<SidePane />
				</div>

				<div className={styles.timelineArea}>
					<TimelinePanel />
				</div>
			</div>
		</EditorProvider>
	)
}

EditorShell.displayName = "EditorShell"
