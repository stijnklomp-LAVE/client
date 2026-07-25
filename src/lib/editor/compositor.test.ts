import { describe, test, expect } from "bun:test"
import {
	getActiveSegment,
	computeDuration,
	computeSeekTime,
	type GenericLayer,
} from "./compositor"

describe("compositor", () => {
	describe("getActiveSegment", () => {
		const layer: GenericLayer = {
			segments: [
				{ fragmentId: "frag-1", inPoint: 0, order: 0, outPoint: 5 },
				{ fragmentId: "frag-2", inPoint: 0, order: 1, outPoint: 3 },
			],
			zIndex: 0,
		}

		test("returns first segment at time 0", () => {
			const result = getActiveSegment(layer, 0)
			expect(result).not.toBeNull()

			if (result == null) return
			expect(result.segment.fragmentId).toBe("frag-1")
			expect(result.timelineOffset).toBe(0)
		})

		test("returns first segment at time 2.5", () => {
			const result = getActiveSegment(layer, 2.5)
			expect(result).not.toBeNull()

			if (result == null) return
			expect(result.segment.fragmentId).toBe("frag-1")
		})

		test("returns second segment at time 5", () => {
			const result = getActiveSegment(layer, 5)
			expect(result).not.toBeNull()

			if (result == null) return
			expect(result.segment.fragmentId).toBe("frag-2")
			expect(result.timelineOffset).toBe(5)
		})

		test("returns null after all segments", () => {
			expect(getActiveSegment(layer, 8)).toBeNull()
		})

		test("returns null for negative time", () => {
			expect(getActiveSegment(layer, -1)).toBeNull()
		})

		test("skips segments with zero duration", () => {
			const layerWithZero: GenericLayer = {
				segments: [
					{ fragmentId: "frag-1", inPoint: 0, order: 0, outPoint: 0 },
					{ fragmentId: "frag-2", inPoint: 0, order: 1, outPoint: 5 },
				],
				zIndex: 0,
			}
			const result = getActiveSegment(layerWithZero, 0)
			expect(result).not.toBeNull()

			if (result == null) return
			expect(result.segment.fragmentId).toBe("frag-2")
		})

		test("sorts segments by order", () => {
			const unordered: GenericLayer = {
				segments: [
					{ fragmentId: "frag-2", inPoint: 0, order: 1, outPoint: 3 },
					{ fragmentId: "frag-1", inPoint: 0, order: 0, outPoint: 5 },
				],
				zIndex: 0,
			}
			const result = getActiveSegment(unordered, 0)
			expect(result).not.toBeNull()

			if (result == null) return
			expect(result.segment.fragmentId).toBe("frag-1")
		})

		test("returns null for empty layer", () => {
			const empty: GenericLayer = { segments: [], zIndex: 0 }
			expect(getActiveSegment(empty, 0)).toBeNull()
		})
	})

	describe("computeSeekTime", () => {
		test("computes seek time with zero inPoint", () => {
			const segment = {
				fragmentId: "frag-1",
				inPoint: 0,
				order: 0,
				outPoint: 5,
			}
			expect(computeSeekTime(segment, 2.5, 0)).toBe(2.5)
		})

		test("computes seek time with non-zero inPoint", () => {
			const segment = {
				fragmentId: "frag-1",
				inPoint: 2,
				order: 0,
				outPoint: 7,
			}
			expect(computeSeekTime(segment, 3, 1)).toBe(4)
		})

		test("computes seek time with timeline offset", () => {
			const segment = {
				fragmentId: "frag-1",
				inPoint: 0,
				order: 0,
				outPoint: 5,
			}
			expect(computeSeekTime(segment, 5, 5)).toBe(0)
		})
	})

	describe("computeDuration", () => {
		test("returns 0 for empty layers", () => {
			expect(computeDuration([])).toBe(0)
		})

		test("returns 0 for layers with no segments", () => {
			expect(computeDuration([{ segments: [] }])).toBe(0)
		})

		test("computes duration from single segment", () => {
			expect(
				computeDuration([
					{
						segments: [{ inPoint: 0, order: 0, outPoint: 5 }],
					},
				]),
			).toBe(5)
		})

		test("computes duration from multiple segments", () => {
			expect(
				computeDuration([
					{
						segments: [
							{ inPoint: 0, order: 0, outPoint: 5 },
							{ inPoint: 0, order: 1, outPoint: 3 },
						],
					},
				]),
			).toBe(8)
		})

		test("returns max duration across layers", () => {
			expect(
				computeDuration([
					{
						segments: [{ inPoint: 0, order: 0, outPoint: 5 }],
					},
					{
						segments: [{ inPoint: 0, order: 0, outPoint: 10 }],
					},
				]),
			).toBe(10)
		})

		test("ignores segments with zero or negative duration", () => {
			expect(
				computeDuration([
					{
						segments: [
							{ inPoint: 0, order: 0, outPoint: 0 },
							{ inPoint: 5, order: 1, outPoint: 3 },
							{ inPoint: 0, order: 2, outPoint: 5 },
						],
					},
				]),
			).toBe(5)
		})
	})
})
