import { mock } from "bun:test"
import { Window } from "happy-dom"

const window = new Window()

globalThis.window = window as unknown as Window & typeof globalThis
globalThis.document = window.document
globalThis.self = globalThis.window
globalThis.navigator = window.navigator
globalThis.location = window.location
globalThis.history = window.history
globalThis.customElements = window.customElements
globalThis.crypto = window.crypto
globalThis.performance = window.performance
globalThis.localStorage = window.localStorage
globalThis.sessionStorage = window.sessionStorage
globalThis.screen = window.screen
globalThis.matchMedia = window.matchMedia.bind(window)
globalThis.getComputedStyle = window.getComputedStyle.bind(window)
globalThis.requestAnimationFrame = window.requestAnimationFrame.bind(window)
globalThis.cancelAnimationFrame = window.cancelAnimationFrame.bind(window)

globalThis.DOMRect = window.DOMRect
globalThis.DOMParser = window.DOMParser
globalThis.XMLSerializer = window.XMLSerializer
globalThis.MutationObserver = window.MutationObserver
globalThis.IntersectionObserver = window.IntersectionObserver
globalThis.ResizeObserver = window.ResizeObserver
globalThis.CSSStyleDeclaration = window.CSSStyleDeclaration
globalThis.Event = window.Event
globalThis.UIEvent = window.UIEvent
globalThis.MouseEvent = window.MouseEvent
globalThis.KeyboardEvent = window.KeyboardEvent
globalThis.FocusEvent = window.FocusEvent
globalThis.CustomEvent = window.CustomEvent
globalThis.EventTarget = window.EventTarget
globalThis.Node = window.Node
globalThis.Element = window.Element
globalThis.DocumentFragment = window.DocumentFragment
globalThis.Document = window.Document
globalThis.HTMLElement = window.HTMLElement
globalThis.HTMLInputElement = window.HTMLInputElement
globalThis.HTMLButtonElement = window.HTMLButtonElement
globalThis.HTMLDivElement = window.HTMLDivElement
globalThis.HTMLFormElement = window.HTMLFormElement
globalThis.HTMLSelectElement = window.HTMLSelectElement
globalThis.HTMLTextAreaElement = window.HTMLTextAreaElement
globalThis.HTMLAnchorElement = window.HTMLAnchorElement
globalThis.HTMLImageElement = window.HTMLImageElement
globalThis.HTMLScriptElement = window.HTMLScriptElement
globalThis.HTMLStyleElement = window.HTMLStyleElement
globalThis.HTMLCanvasElement = window.HTMLCanvasElement
globalThis.URL = window.URL
globalThis.URLSearchParams = window.URLSearchParams

const loggerMocks = {
	debug: mock(() => {}),
	error: mock(() => {}),
	info: mock(() => {}),
	warn: mock(() => {}),
}

await mock.module("@/lib/logger", () => ({
	logger: {
		debug: loggerMocks.debug,
		error: loggerMocks.error,
		info: loggerMocks.info,
		warn: loggerMocks.warn,
	},
}))
