import { NextRequest, NextResponse } from "next/server"

const MOCK_FRAGMENTS: Record<string, { name: string; size: number }> = {
	// eslint-disable-next-line @typescript-eslint/naming-convention
	frag_closing_004: { name: "closing.mp4", size: 1_200_000 },
	// eslint-disable-next-line @typescript-eslint/naming-convention
	frag_intro_001: { name: "intro.mp4", size: 2_345_000 },
	// eslint-disable-next-line @typescript-eslint/naming-convention
	frag_scene1_002: { name: "scene-01.mp4", size: 5_123_000 },
	// eslint-disable-next-line @typescript-eslint/naming-convention
	frag_scene2_003: { name: "scene-02.mp4", size: 3_789_000 },
}

const generateContent = (fragmentId: string, size: number): Uint8Array => {
	const content = new Uint8Array(size)
	for (let i = 0; i < size; i++) {
		content[i] = (i + fragmentId.charCodeAt(i % fragmentId.length)) & 0xff
	}

	return content
}

export const GET = (request: NextRequest) => {
	const fragmentId = request.nextUrl.searchParams.get("fragmentId")

	if (!fragmentId || !MOCK_FRAGMENTS[fragmentId]) {
		return NextResponse.json({ error: "Unknown fragment" }, { status: 404 })
	}

	const { name, size } = MOCK_FRAGMENTS[fragmentId]
	const content = generateContent(fragmentId, size)

	return new NextResponse(content as BodyInit, {
		headers: {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			"Content-Disposition": `attachment; filename="${name}"`,
			// eslint-disable-next-line @typescript-eslint/naming-convention
			"Content-Length": size.toString(),
			// eslint-disable-next-line @typescript-eslint/naming-convention
			"Content-Type": "application/octet-stream",
		},
	})
}
