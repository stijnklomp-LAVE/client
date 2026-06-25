const ICE_SERVERS = [
	{ urls: "stun:stun.l.google.com:19302" },
	{ urls: "stun:stun1.l.google.com:19302" },
]

export type FileProgress = {
	fileName: string
	bytesReceived: number
	bytesTotal: number
	status: "pending" | "fetching" | "transferring" | "done" | "error"
}

export const pollForPendingOffer = async (
	deviceId: string,
	abortSignal: AbortSignal,
): Promise<{
	sessionId: string
	sourceDeviceId: string
	offer: string
} | null> => {
	while (!abortSignal.aborted) {
		const res = await fetch(
			`/api/signaling/pending?deviceId=${encodeURIComponent(deviceId)}`,
		)

		if (res.ok) {
			const data = (await res.json()) as {
				sessions: {
					sessionId: string
					sourceDeviceId: string
					offer: string
				}[]
			}

			if (data.sessions.length > 0) {
				const session = data.sessions[0]

				if (session) {
					return {
						offer: session.offer,
						sessionId: session.sessionId,
						sourceDeviceId: session.sourceDeviceId,
					}
				}
			}
		}

		await new Promise((r) => setTimeout(r, 2000))
	}

	return null
}

export const waitForAnswer = async (
	sessionId: string,
	abortSignal: AbortSignal,
): Promise<string | null> => {
	while (!abortSignal.aborted) {
		const res = await fetch(`/api/signaling/${sessionId}/answer`)

		if (res.ok) {
			const data = (await res.json()) as { answer: string }

			if (data.answer) {
				return data.answer
			}
		}

		await new Promise((r) => setTimeout(r, 1500))
	}

	return null
}

const waitForIceGathering = (pc: RTCPeerConnection): Promise<void> => {
	if (pc.iceGatheringState === "complete") return Promise.resolve()

	return new Promise((resolve) => {
		pc.onicegatheringstatechange = () => {
			if (pc.iceGatheringState === "complete") resolve()
		}
	})
}

export const createOfferAndSubmit = async (
	sourceDeviceId: string,
	targetDeviceId: string,
): Promise<{
	sessionId: string
	pc: RTCPeerConnection
	channel: RTCDataChannel
}> => {
	const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
	const channel = pc.createDataChannel("fileTransfer")

	const offer = await pc.createOffer()
	await pc.setLocalDescription(offer)
	await waitForIceGathering(pc)

	const offerSdpValue = pc.localDescription?.sdp

	if (!offerSdpValue) throw new Error("No local SDP")

	const res = await fetch("/api/signaling/offer", {
		body: JSON.stringify({
			sdp: offerSdpValue,
			sourceDeviceId,
			targetDeviceId,
		}),
		// eslint-disable-next-line @typescript-eslint/naming-convention
		headers: { "Content-Type": "application/json" },
		method: "POST",
	})

	if (!res.ok) {
		pc.close()
		throw new Error("Failed to submit offer")
	}

	const data = (await res.json()) as { sessionId: string }

	return { channel, pc, sessionId: data.sessionId }
}

export const createAnswerAndSubmit = async (
	sessionId: string,
	offerSdp: string,
): Promise<{ pc: RTCPeerConnection }> => {
	const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })

	await pc.setRemoteDescription({ sdp: offerSdp, type: "offer" })

	const answer = await pc.createAnswer()
	await pc.setLocalDescription(answer)
	await waitForIceGathering(pc)

	const answerSdp = pc.localDescription?.sdp

	if (!answerSdp) throw new Error("No local SDP")

	const res = await fetch(`/api/signaling/${sessionId}/answer`, {
		body: JSON.stringify({ sdp: answerSdp }),
		// eslint-disable-next-line @typescript-eslint/naming-convention
		headers: { "Content-Type": "application/json" },
		method: "PUT",
	})

	if (!res.ok) {
		pc.close()
		throw new Error("Failed to submit answer")
	}

	return { pc }
}

export const submitIceCandidate = async (
	sessionId: string,
	fromDeviceId: string,
	candidate: RTCIceCandidateInit,
): Promise<void> => {
	if (!candidate.candidate) return

	await fetch(`/api/signaling/${sessionId}/ice`, {
		body: JSON.stringify({
			candidate: candidate.candidate,
			fromDeviceId,
			sdpMLineIndex: candidate.sdpMLineIndex,
			sdpMid: candidate.sdpMid,
		}),
		// eslint-disable-next-line @typescript-eslint/naming-convention
		headers: { "Content-Type": "application/json" },
		method: "POST",
	})
}

export const startIceCandidateExchange = (
	sessionId: string,
	deviceId: string,
	remoteDeviceId: string,
	pc: RTCPeerConnection,
	abortSignal: AbortSignal,
): void => {
	pc.onicecandidate = (event) => {
		if (event.candidate && !abortSignal.aborted) {
			void submitIceCandidate(
				sessionId,
				deviceId,
				event.candidate.toJSON(),
			)
		}
	}

	void (async () => {
		while (!abortSignal.aborted) {
			const res = await fetch(
				`/api/signaling/${sessionId}/ice?fromDeviceId=${encodeURIComponent(remoteDeviceId)}`,
			)

			if (res.ok) {
				const data = (await res.json()) as {
					candidates: {
						candidate: string
						sdpMLineIndex?: number
						sdpMid?: string
					}[]
				}

				for (const c of data.candidates) {
					if (c.candidate) {
						try {
							await pc.addIceCandidate(c)
						} catch {
							// Candidate may no longer be relevant
						}
					}
				}
			}

			await new Promise((r) => setTimeout(r, 2000))
		}
	})()
}
