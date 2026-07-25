import { describe, test, expect, mock } from "bun:test"

class MockCanvas {
	width: number
	height: number
	pixels: Uint8ClampedArray

	constructor(w: number, h: number) {
		this.width = w
		this.height = h
		this.pixels = new Uint8ClampedArray(w * h * 4)
	}

	getContext(_type: "2d") {
		const self = this

		return {
			clearRect: (_x: number, _y: number, w: number, h: number) => {
				self.pixels.fill(0)
			},
			drawImage: (
				_image: unknown,
				_sx: number,
				_sy: number,
				_sw: number,
				_sh: number,
				dx: number,
				dy: number,
				dw: number,
				dh: number,
			) => {
				for (let y = 0; y < dh; y++) {
					for (let x = 0; x < dw; x++) {
						const idx =
							(Math.floor(dy + y) * self.width +
								Math.floor(dx + x)) *
							4

						if (idx >= 0 && idx + 3 < self.pixels.length) {
							self.pixels[idx] = 128
							self.pixels[idx + 1] = 200
							self.pixels[idx + 2] = 50
							self.pixels[idx + 3] = 255
						}
					}
				}
			},
			fillStyle: "",
			get fillStyle(): string {
				return ""
			},
			set fillStyle(v: string) {
				void v
			},
			fillRect: (x: number, y: number, w: number, h: number) => {
				for (let py = 0; py < h; py++) {
					for (let px = 0; px < w; px++) {
						const idx =
							(Math.floor(y + py) * self.width +
								Math.floor(x + px)) *
							4

						if (idx >= 0 && idx + 3 < self.pixels.length) {
							self.pixels[idx] = 200
							self.pixels[idx + 1] = 50
							self.pixels[idx + 2] = 100
							self.pixels[idx + 3] = 255
						}
					}
				}
			},
			fillText: () => {},
			textAlign: "center",
			font: "",
		}
	}

	getImageData(_x: number, _y: number, w: number, h: number): ImageData {
		const data = new Uint8ClampedArray(this.pixels)

		return { data, width: w, height: h, colorSpace: "srgb" }
	}
}

function allPixelsBlack(canvas: MockCanvas): boolean {
	return canvas.pixels.every((val: number) => val === 0)
}

import {
	composeFrame,
	defaultMissingFragment,
	type FrameProvider,
	type GenericLayer,
} from "./compositor"

const makeSegment = (fragmentId: string, inPoint = 0, outPoint = 10) => ({
	fragmentId,
	id: `seg-${fragmentId}`,
	inPoint,
	order: 0,
	outPoint,
})

const makeLayer = (
	segments: ReturnType<typeof makeSegment>[],
	zIndex = 0,
): GenericLayer => ({
	segments,
	zIndex,
})

describe("composeFrame canvas pixel output", () => {
	test("draws non-black pixels when frame is available", async () => {
		const canvas = new MockCanvas(200, 100)
		const ctx = canvas.getContext("2d")

		const layers = [makeLayer([makeSegment("frag-1", 0, 10)], 0)]

		const frameProvider: FrameProvider = {
			getFrame: mock(() =>
				Promise.resolve({
					canvas: {
						width: 100,
						height: 100,
					} as unknown as OffscreenCanvas,
					duration: 1 / 30,
					timestamp: 0,
				}),
			),
		}

		await composeFrame(ctx, 200, 100, layers, 0, frameProvider, mock())

		const imageData = canvas.getImageData(0, 0, 200, 100)
		const hasNonBlackPixels = imageData.data.some(
			(val: number) => val !== 0,
		)
		expect(hasNonBlackPixels).toBe(true)
	})

	test("draws non-black pixels for placeholder when frame missing", async () => {
		const canvas = new MockCanvas(200, 100)
		const ctx = canvas.getContext("2d")

		const layers = [makeLayer([makeSegment("frag-1", 0, 10)], 0)]

		const frameProvider: FrameProvider = {
			getFrame: mock(() => Promise.resolve(null)),
		}

		await composeFrame(
			ctx,
			200,
			100,
			layers,
			0,
			frameProvider,
			defaultMissingFragment,
		)

		const imageData = canvas.getImageData(0, 0, 200, 100)
		const hasNonBlackPixels = imageData.data.some(
			(val: number) => val !== 0,
		)
		expect(hasNonBlackPixels).toBe(true)
	})

	test("draws non-black pixels for idle indicator when no segments active", async () => {
		const canvas = new MockCanvas(200, 100)
		const ctx = canvas.getContext("2d")

		const layers = [makeLayer([makeSegment("frag-1", 0, 5)], 0)]

		const frameProvider: FrameProvider = {
			getFrame: mock(() => Promise.resolve(null)),
		}

		await composeFrame(
			ctx,
			200,
			100,
			layers,
			10,
			frameProvider,
			defaultMissingFragment,
		)

		const imageData = canvas.getImageData(0, 0, 200, 100)
		const hasNonBlackPixels = imageData.data.some(
			(val: number) => val !== 0,
		)
		expect(hasNonBlackPixels).toBe(true)
	})

	test("empty layers leaves canvas transparent (known edge case: no layers means no render loop)", async () => {
		const canvas = new MockCanvas(100, 50)
		const ctx = canvas.getContext("2d")
		canvas.pixels.fill(0)

		await composeFrame(
			ctx,
			100,
			50,
			[],
			0,
			{
				getFrame: mock(() => Promise.resolve(null)),
			},
			defaultMissingFragment,
		)

		expect(allPixelsBlack(canvas)).toBe(true)
	})

	test("layer with no segments draws idle indicator", async () => {
		const canvas = new MockCanvas(100, 50)
		const ctx = canvas.getContext("2d")
		canvas.pixels.fill(0)

		await composeFrame(
			ctx,
			100,
			50,
			[makeLayer([], 0)],
			0,
			{
				getFrame: mock(() => Promise.resolve(null)),
			},
			defaultMissingFragment,
		)

		expect(allPixelsBlack(canvas)).toBe(false)
	})

	test("zero-duration segment draws idle indicator", async () => {
		const canvas = new MockCanvas(100, 50)
		const ctx = canvas.getContext("2d")
		canvas.pixels.fill(0)

		await composeFrame(
			ctx,
			100,
			50,
			[makeLayer([makeSegment("frag-1", 5, 5)], 0)],
			0,
			{
				getFrame: mock(() => Promise.resolve(null)),
			},
			defaultMissingFragment,
		)

		expect(allPixelsBlack(canvas)).toBe(false)
	})

	test("time past segment end draws idle indicator", async () => {
		const canvas = new MockCanvas(100, 50)
		const ctx = canvas.getContext("2d")
		canvas.pixels.fill(0)

		await composeFrame(
			ctx,
			100,
			50,
			[makeLayer([makeSegment("frag-1", 0, 10)], 0)],
			15,
			{
				getFrame: mock(() => Promise.resolve(null)),
			},
			defaultMissingFragment,
		)

		expect(allPixelsBlack(canvas)).toBe(false)
	})

	test("canvas is NEVER fully black even when drawImage throws", async () => {
		const canvas = new MockCanvas(100, 50)
		const ctx = canvas.getContext("2d")

		const originalDrawImage = ctx.drawImage
		let callCount = 0

		ctx.drawImage = (
			_image: unknown,
			_sx: number,
			_sy: number,
			_sw: number,
			_sh: number,
			dx: number,
			dy: number,
			dw: number,
			dh: number,
		) => {
			callCount++

			if (callCount === 1) {
				throw new Error("GPU draw error")
			}

			originalDrawImage(_image, _sx, _sy, _sw, _sh, dx, dy, dw, dh)
		}

		const layers = [makeLayer([makeSegment("frag-1", 0, 10)], 0)]

		const frameProvider: FrameProvider = {
			getFrame: mock(() =>
				Promise.resolve({
					canvas: {
						width: 100,
						height: 100,
					} as unknown as OffscreenCanvas,
					duration: 1 / 30,
					timestamp: 0,
				}),
			),
		}

		await composeFrame(
			ctx,
			100,
			50,
			layers,
			0,
			frameProvider,
			defaultMissingFragment,
		)

		const hasNonBlackPixels = !allPixelsBlack(canvas)
		expect(hasNonBlackPixels).toBe(true)
	})
})
