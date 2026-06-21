"use client"

import { useEffect, useRef, useState } from "react"

import {
	type FileProgress,
	createAnswerAndSubmit,
	createOfferAndSubmit,
	startIceCandidateExchange,
	pollForPendingOffer,
	waitForAnswer,
} from "@/lib/webrtc-signaling"

type TransferRequestBase = {
	id: string
	direction: "SEND" | "RECEIVE"
	status: "PENDING" | "ACTIVE" | "COMPLETED" | "DELETED" | "EXPIRED"
	sourceDeviceIds: string[]
	targetDeviceIds: string[]
	fragmentIds: string[]
	fragmentNames: string[]
	projectName: string | null
}

export type ActiveTransfer = {
	requestId: string
	direction: "SEND" | "RECEIVE"
	peerState: RTCPeerConnectionState
	iceState: RTCIceConnectionState
	channelState: RTCDataChannelState | null
	progress: FileProgress[]
	error: string | null
}

type Props = {
	deviceId: string | null
	requests: TransferRequestBase[]
}

const MOCK_FILES: { name: string; size: number }[] = [
	{ name: "frame-001.png", size: 2_345_000 },
	{ name: "frame-002.png", size: 1_890_000 },
]

function downloadBlob(blob: Blob, fileName: string): void {
	const url = URL.createObjectURL(blob)
	const a = document.createElement("a")
	a.href = url
	a.download = fileName
	a.style.display = "none"
	document.body.append(a)
	a.click()
	a.remove()
	URL.revokeObjectURL(url)
}

export function useP2PTransfer({ deviceId, requests }: Props): {
	activeTransfers: Map<string, ActiveTransfer>
	cancelTransfer: (requestId: string) => void
} {
	const [activeTransfers, setActiveTransfers] = useState<
		Map<string, ActiveTransfer>
	>(new Map())
	const processedRef = useRef<Set<string>>(new Set())
	const abortRef = useRef<Map<string, AbortController>>(new Map())
	const locallyCancelledRef = useRef<Set<string>>(new Set())

	const cancelTransfer = (requestId: string) => {
		locallyCancelledRef.current.add(requestId)
		removeTransfer(requestId)
	}

	const updateTransfer = (
		requestId: string,
		partial: Partial<ActiveTransfer>,
	) => {
		setActiveTransfers((prev) => {
			const next = new Map(prev)
			const existing = next.get(requestId)

			next.set(requestId, {
				...(existing ?? {
					channelState: null,
					direction: "SEND",
					error: null,
					iceState: "new",
					peerState: "new",
					progress: [],
					requestId,
				}),
				...partial,
			})

			return next
		})
	}

	const clearFromUI = (requestId: string) => {
		setActiveTransfers((prev) => {
			const next = new Map(prev)
			next.delete(requestId)

			return next
		})
	}

	const removeTransfer = (requestId: string) => {
		clearFromUI(requestId)
		processedRef.current.delete(requestId)
		abortRef.current.get(requestId)?.abort()
		abortRef.current.delete(requestId)
	}

	// Cleanup timers for completed transfers
	const cleanupTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(
		new Map(),
	)

	/* eslint-disable react-hooks/exhaustive-deps */
	useEffect(() => {
		for (const [reqId, transfer] of activeTransfers) {
			if (cleanupTimers.current.has(reqId)) continue

			const isDone =
				transfer.progress.length > 0 &&
				transfer.progress.every((f) => f.status === "done")
			const isError = transfer.error !== null
			const isDisconnected = transfer.peerState === "disconnected"

			if (isDone || isError || isDisconnected) {
				const timer = setTimeout(() => {
					clearFromUI(reqId)
					cleanupTimers.current.delete(reqId)
				}, 3000)
				cleanupTimers.current.set(reqId, timer)
			}
		}

		return () => {
			const timers = cleanupTimers.current
			for (const [, timer] of timers) {
				clearTimeout(timer)
			}

			timers.clear()
		}
	}, [activeTransfers])
	/* eslint-enable react-hooks/exhaustive-deps */

	useEffect(() => {
		if (!deviceId) return

		for (const req of requests) {
			if (req.status !== "ACTIVE") continue

			if (processedRef.current.has(req.id)) continue

			if (locallyCancelledRef.current.has(req.id)) continue

			processedRef.current.add(req.id)

			const abort = new AbortController()
			abortRef.current.set(req.id, abort)

			queueMicrotask(() => {
				const isSender = req.sourceDeviceIds.includes(deviceId)
				const isReceiver = req.targetDeviceIds.includes(deviceId)

				if (isSender) {
					const firstTarget = req.targetDeviceIds[0]

					if (!firstTarget) return

					updateTransfer(req.id, {
						direction: req.direction,
						progress: MOCK_FILES.map((f) => ({
							bytesReceived: 0,
							bytesTotal: f.size,
							fileName: f.name,
							status: "pending",
						})),
					})

					void startSendFlow(
						deviceId,
						firstTarget,
						abort.signal,
						updateTransfer,
						req.id,
					)
				}

				if (isReceiver) {
					void startReceiveFlow(
						deviceId,
						abort.signal,
						updateTransfer,
						req.id,
					)
				}
			})
		}

		// Detect remote cancellation
		for (const [rId, abort] of abortRef.current) {
			const req = requests.find((r) => r.id === rId)

			if (
				req?.status === "DELETED" &&
				!locallyCancelledRef.current.has(rId)
			) {
				abort.abort()
				abortRef.current.delete(rId)
				updateTransfer(rId, {
					error: "The other device cancelled this transfer",
					peerState: "disconnected",
				})
			}
		}
	}, [deviceId, requests])

	return { activeTransfers, cancelTransfer }
}

async function startSendFlow(
	deviceId: string,
	targetDeviceId: string,
	abortSignal: AbortSignal,
	updateTransfer: (id: string, partial: Partial<ActiveTransfer>) => void,
	requestId: string,
): Promise<void> {
	const iceAbort = new AbortController()

	try {
		updateTransfer(requestId, { peerState: "connecting" })

		const { sessionId, pc, channel } = await createOfferAndSubmit(
			deviceId,
			targetDeviceId,
		)

		startIceCandidateExchange(
			sessionId,
			deviceId,
			targetDeviceId,
			pc,
			iceAbort.signal,
		)

		updateTransfer(requestId, { peerState: "connected" })

		channel.onopen = () => {
			updateTransfer(requestId, { channelState: "open" })
			sendFiles(channel, updateTransfer, requestId)
			channel.close()
		}

		channel.onclose = () => {
			updateTransfer(requestId, { channelState: "closed" })
			iceAbort.abort()
			pc.close()
		}

		channel.onerror = () => {
			updateTransfer(requestId, {
				channelState: "closed",
				error: "Data channel error",
			})
			iceAbort.abort()
			pc.close()
		}

		pc.oniceconnectionstatechange = () => {
			updateTransfer(requestId, { iceState: pc.iceConnectionState })
		}

		pc.onconnectionstatechange = () => {
			updateTransfer(requestId, { peerState: pc.connectionState })
		}

		updateTransfer(requestId, { iceState: pc.iceConnectionState })

		if (abortSignal.aborted) {
			iceAbort.abort()
			pc.close()

			return
		}

		const answerSdp = await waitForAnswer(sessionId, abortSignal)

		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (!answerSdp || abortSignal.aborted) {
			iceAbort.abort()
			pc.close()

			return
		}

		await pc.setRemoteDescription({ sdp: answerSdp, type: "answer" })
	} catch (err) {
		iceAbort.abort()
		updateTransfer(requestId, {
			error: err instanceof Error ? err.message : "Connection failed",
		})
	}
}

async function startReceiveFlow(
	deviceId: string,
	abortSignal: AbortSignal,
	updateTransfer: (id: string, partial: Partial<ActiveTransfer>) => void,
	requestId: string,
): Promise<void> {
	const iceAbort = new AbortController()

	try {
		const pending = await pollForPendingOffer(deviceId, abortSignal)

		if (!pending || abortSignal.aborted) return

		updateTransfer(requestId, { peerState: "connecting" })

		const { pc } = await createAnswerAndSubmit(
			pending.sessionId,
			pending.offer,
		)

		startIceCandidateExchange(
			pending.sessionId,
			deviceId,
			pending.sourceDeviceId,
			pc,
			iceAbort.signal,
		)

		updateTransfer(requestId, { peerState: "connected" })

		const dataChannel = await new Promise<RTCDataChannel | null>(
			(resolve) => {
				pc.ondatachannel = (event) => {
					resolve(event.channel)
				}

				setTimeout(() => {
					resolve(null)
				}, 10000)
			},
		)

		// eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
		if (!dataChannel || abortSignal.aborted) {
			iceAbort.abort()
			pc.close()

			return
		}

		updateTransfer(requestId, { channelState: "open" })
		receiveFiles(dataChannel, updateTransfer, requestId)

		pc.oniceconnectionstatechange = () => {
			updateTransfer(requestId, { iceState: pc.iceConnectionState })
		}

		pc.onconnectionstatechange = () => {
			updateTransfer(requestId, { peerState: pc.connectionState })
		}

		dataChannel.onclose = () => {
			updateTransfer(requestId, { channelState: "closed" })
			iceAbort.abort()
			pc.close()
		}

		dataChannel.onerror = () => {
			updateTransfer(requestId, {
				channelState: "closed",
				error: "Data channel error",
			})
			iceAbort.abort()
			pc.close()
		}
	} catch (err) {
		iceAbort.abort()
		updateTransfer(requestId, {
			error: err instanceof Error ? err.message : "Connection failed",
		})
	}
}

function sendFiles(
	channel: RTCDataChannel,
	updateTransfer: (id: string, partial: Partial<ActiveTransfer>) => void,
	requestId: string,
): void {
	try {
		for (const file of MOCK_FILES) {
			updateTransfer(requestId, {
				progress: [
					{
						bytesReceived: 0,
						bytesTotal: file.size,
						fileName: file.name,
						status: "transferring",
					},
				],
			})

			channel.send(
				JSON.stringify({ fileName: file.name, fileSize: file.size }),
			)

			const chunkSize = 16_384
			const totalChunks = Math.ceil(file.size / chunkSize)

			for (let chunk = 0; chunk < totalChunks; chunk++) {
				const offset = chunk * chunkSize
				const size = Math.min(chunkSize, file.size - offset)
				channel.send(new Uint8Array(size).buffer)

				updateTransfer(requestId, {
					progress: [
						{
							bytesReceived: (chunk + 1) * chunkSize,
							bytesTotal: file.size,
							fileName: file.name,
							status:
								chunk === totalChunks - 1
									? "done"
									: "transferring",
						},
					],
				})
			}
		}
	} catch (err) {
		updateTransfer(requestId, {
			error: err instanceof Error ? err.message : "Send failed",
		})
	}
}

function receiveFiles(
	channel: RTCDataChannel,
	updateTransfer: (id: string, partial: Partial<ActiveTransfer>) => void,
	requestId: string,
): void {
	let buffer = ""
	let currentFile: {
		fileName: string
		fileSize: number
		received: number
	} | null = null
	const chunks: ArrayBuffer[] = []

	channel.onmessage = (event) => {
		if (typeof event.data === "string") {
			buffer += event.data

			try {
				const header = JSON.parse(buffer) as {
					fileName: string
					fileSize: number
				}
				currentFile = {
					fileName: header.fileName,
					fileSize: header.fileSize,
					received: 0,
				}
				buffer = ""
				chunks.length = 0

				updateTransfer(requestId, {
					progress: [
						{
							bytesReceived: 0,
							bytesTotal: header.fileSize,
							fileName: header.fileName,
							status: "transferring",
						},
					],
				})
			} catch {
				// Incomplete header
			}
		} else if (event.data instanceof ArrayBuffer) {
			if (currentFile) {
				currentFile.received += event.data.byteLength
				chunks.push(event.data)
				const remaining = currentFile.fileSize - currentFile.received

				if (remaining <= 0) {
					downloadBlob(
						new Blob(chunks, { type: "application/octet-stream" }),
						currentFile.fileName,
					)

					updateTransfer(requestId, {
						progress: [
							{
								bytesReceived: currentFile.fileSize,
								bytesTotal: currentFile.fileSize,
								fileName: currentFile.fileName,
								status: "done",
							},
						],
					})
					currentFile = null
					chunks.length = 0
				} else {
					updateTransfer(requestId, {
						progress: [
							{
								bytesReceived: currentFile.received,
								bytesTotal: currentFile.fileSize,
								fileName: currentFile.fileName,
								status: "transferring",
							},
						],
					})
				}
			}
		}
	}
}
