import * as React from "react"
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { addPropertyControls, ControlType, useIsStaticRenderer } from "framer"

/**
 * BLUEPRINT SPLASH — LIVE
 * ─────────────────────────────────────────────────────────────────────────────
 * The traced sibling of BlueprintSplash. Instead of re-creating one fixed page
 * layout, it reads whatever page it is dropped on, the moment it loads, and
 * sets that out as a pink drawing before wiping away to reveal it:
 *
 *   1. solid pink + grid (this is what the server renders, so it covers the
 *      page from the very first paint)
 *   2. the page under it is measured — everything in the first screenful:
 *        text blocks   → hatched boxes, "TITLE" / "COPY nn"
 *        images/video  → X-crossed plates, "PLATE nn"
 *        links/buttons → dashed boxes, "NAV nn"
 *   3. the boxes draw in top to bottom, the title box settles from full width
 *      into its real width, dimensions appear
 *   4. the page's real copy is cloned into the drawing, in white, in place
 *   5. the sheet wipes down and the page is underneath
 *
 * Steering it from Framer, by layer name (Framer publishes layer names):
 *   • "bp Hero image", "bp: Logo", "bp-Card"… → always outlined, with that
 *     label. In "Tagged Only" mode, only these are drawn.
 *   • "bp-skip" → that layer and everything inside it is ignored.
 *
 * Setup: put it on the page as a top-level layer, Position Fixed, pinned to
 * all four edges (100vw × 100vh), highest z-index. In the editor it shows a
 * stand-in drawing — the tracing only happens on the live/preview page.
 */

// ── Timeline, seconds at speed 1, counted from the moment of measuring ──────
const T = {
    minHold: 0.35, // solid pink + grid before measuring, at least
    fontWait: 1.0, // give webfonts this long before measuring anyway
    first: 0.25, // first box starts drawing
    draw: 0.5, // one box drawing in
    stagger: [0.03, 0.09], // per box, squeezed to fit ~1.2s of build-up
    settle: 0.8,
    text: 0.7,
    exit: 0.95,
}
const MAX_ITEMS = 60
const SESSION_KEY = "akr-blueprint-live-seen"
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect

const FONT_MONO = `"Iosevka Charon Mono Regular", "Iosevka Charon Mono", ui-monospace, "SF Mono", Menlo, monospace`

type Kind = "text" | "plate" | "link" | "frame"

interface Item {
    kind: Kind
    x: number
    y: number
    w: number
    h: number
    tag: string
    title: boolean // the first h1: gets the settle move and dimensions
    inLink: boolean // text inside a link/button: copied, not boxed
    rowFirst: boolean // first link of a row: carries the NAV tag
}

interface Scan {
    items: Item[]
    sources: (HTMLElement | null)[]
    vw: number
    vh: number
}

interface BlueprintSplashLiveProps {
    color: string
    lineColor: string
    speed: number
    mode: "auto" | "tagged"
    prefix: string
    copyText: boolean
    waitForLoad: boolean
    maxWait: number
    play: "every" | "session"
    showInEditor: boolean
    style?: React.CSSProperties
}

/**
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 *
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 */
export default function BlueprintSplashLive(props: BlueprintSplashLiveProps) {
    const {
        color = "#F0509A",
        lineColor = "#FFFFFF",
        speed = 1,
        mode = "auto",
        prefix = "bp",
        copyText = true,
        waitForLoad = true,
        maxWait = 6,
        play = "every",
        showInEditor = true,
    } = props

    const isStatic = useIsStaticRenderer()
    const rootRef = useRef<HTMLDivElement>(null)
    const cloneRefs = useRef<(HTMLDivElement | null)[]>([])
    const loadedRef = useRef<Promise<void> | null>(null)
    const exitingRef = useRef(false)
    const prevOverflowRef = useRef("")
    const [scan, setScan] = useState<Scan | null>(null)
    const [animate, setAnimate] = useState(true)
    const [done, setDone] = useState(false)

    // ── Mount: lock the page, wait for fonts, then measure it ───────────────
    useEffect(() => {
        if (isStatic || typeof window === "undefined") return
        const root = rootRef.current
        if (!root) return

        try {
            if (play === "session" && sessionStorage.getItem(SESSION_KEY)) {
                setDone(true)
                return
            }
        } catch {}

        const html = document.documentElement
        const prevOverflow = html.style.overflow
        prevOverflowRef.current = prevOverflow
        html.style.overflow = "hidden"
        if (!window.location.hash) window.scrollTo(0, 0)

        let cancelled = false
        let timer = 0
        loadedRef.current = new Promise<void>((resolve) => {
            if (!waitForLoad || document.readyState === "complete") resolve()
            else window.addEventListener("load", () => resolve(), { once: true })
            timer = window.setTimeout(resolve, Math.max(0, maxWait) * 1000)
        })

        const exclude = root.parentElement ?? root
        const measure = () => {
            if (cancelled) return
            let result: Scan
            try {
                result = scanPage(exclude, mode, prefix)
            } catch {
                result = {
                    items: [],
                    sources: [],
                    vw: window.innerWidth,
                    vh: window.innerHeight,
                }
            }
            setScan(result)
        }

        const sleep = (s: number) =>
            new Promise<void>((r) => window.setTimeout(r, (s * 1000) / speed))
        const fonts = (document as any).fonts?.ready ?? Promise.resolve()
        Promise.all([
            Promise.race([fonts, sleep(T.fontWait)]),
            sleep(T.minHold),
        ]).then(() => requestAnimationFrame(measure))

        // a width change mid-splash: re-measure and snap, no replay
        let lastW = window.innerWidth
        let resizeTimer = 0
        const onResize = () => {
            if (window.innerWidth === lastW) return
            lastW = window.innerWidth
            window.clearTimeout(resizeTimer)
            resizeTimer = window.setTimeout(() => {
                if (exitingRef.current) return
                setAnimate(false)
                measure()
            }, 120)
        }
        window.addEventListener("resize", onResize)

        return () => {
            cancelled = true
            window.clearTimeout(timer)
            window.clearTimeout(resizeTimer)
            window.removeEventListener("resize", onResize)
            html.style.overflow = prevOverflow
        }
    }, [isStatic, play, waitForLoad, maxWait, mode, prefix, speed])

    // ── Copy the page's text into the drawing ───────────────────────────────
    useIsoLayoutEffect(() => {
        if (!scan || !copyText) return
        scan.items.forEach((item, i) => {
            const host = cloneRefs.current[i]
            const src = scan.sources[i]
            if (!host || !src || item.kind !== "text") return
            host.replaceChildren(cloneStyled(src))
        })
    }, [scan, copyText])

    // ── Once the drawing has built and the page has loaded: wipe ────────────
    useEffect(() => {
        if (!scan || isStatic || exitingRef.current) return
        const root = rootRef.current
        if (!root) return
        let cancelled = false
        let raf = 0

        const html = document.documentElement
        const reduce = window.matchMedia?.(
            "(prefers-reduced-motion: reduce)"
        ).matches

        const finish = () => {
            html.style.overflow = prevOverflowRef.current
            const wrapper = root.parentElement
            if (wrapper) wrapper.style.pointerEvents = "none"
            try {
                sessionStorage.setItem(SESSION_KEY, "1")
            } catch {}
            setDone(true)
        }

        const start = requestAnimationFrame(() => {
            const finite = (root.getAnimations?.({ subtree: true }) ?? []).filter(
                (a) => a.effect?.getTiming().iterations !== Infinity
            )
            Promise.all([
                ...finite.map((a) => a.finished.catch(() => {})),
                loadedRef.current,
            ]).then(() => {
                if (cancelled || exitingRef.current) return
                exitingRef.current = true
                const dur = ((reduce ? 0.3 : T.exit) / speed) * 1000
                const band = 160
                const t0 = performance.now()
                const step = (now: number) => {
                    const t = Math.min(1, (now - t0) / dur)
                    const e =
                        t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
                    if (reduce) root.style.opacity = String(1 - e)
                    else
                        root.style.setProperty(
                            "--akr-reveal",
                            `${e * (root.clientHeight + band)}px`
                        )
                    if (t < 1) raf = requestAnimationFrame(step)
                    else finish()
                }
                raf = requestAnimationFrame(step)
            })
        })

        return () => {
            cancelled = true
            cancelAnimationFrame(start)
            // an exit already under way runs to the end
            if (!exitingRef.current) cancelAnimationFrame(raf)
        }
    }, [scan, isStatic, speed])

    if (done) return null
    if (isStatic && !showInEditor) return null

    const a = (
        name: string,
        dur: number,
        delay: number,
        ease = "cubic-bezier(.2,.7,.2,1)"
    ) =>
        animate ? `${name} ${dur / speed}s ${ease} ${delay / speed}s both` : "none"

    const rootStyle = {
        ...props.style,
        "--bp": color,
        "--ln": lineColor,
        position: "relative",
        width: "100%",
        height: "100%",
    } as React.CSSProperties

    return (
        <div
            ref={rootRef}
            className={`akl${isStatic ? " akl-static" : ""}`}
            aria-hidden="true"
            style={rootStyle}
        >
            <style>{CSS}</style>
            <div className="akl-sheet">
                <div
                    className="akl-grid"
                    style={{ animation: `akDrawY ${0.8 / speed}s cubic-bezier(.2,.7,.2,1) ${0.1 / speed}s both` }}
                />
                {isStatic ? (
                    <StandIn />
                ) : scan ? (
                    <Drawing
                        scan={scan}
                        a={a}
                        speed={speed}
                        copyText={copyText}
                        cloneRefs={cloneRefs}
                    />
                ) : null}
            </div>
            <div className="akl-band" />
        </div>
    )
}

// ── The drawing, from a scan ─────────────────────────────────────────────────
function Drawing({
    scan,
    a,
    speed,
    copyText,
    cloneRefs,
}: {
    scan: Scan
    a: (name: string, dur: number, delay: number, ease?: string) => string
    speed: number
    copyText: boolean
    cloneRefs: React.MutableRefObject<(HTMLDivElement | null)[]>
}) {
    const { items, vw } = scan
    const drawn = items.filter((it) => !(it.kind === "text" && it.inLink))
    const n = Math.max(1, drawn.length)
    const stagger = Math.min(T.stagger[1], Math.max(T.stagger[0], 1.2 / n))
    const order = new Map(drawn.map((it, i) => [it, i]))
    const delayOf = (it: Item) => T.first + (order.get(it) ?? 0) * stagger
    const buildEnd = T.first + (n - 1) * stagger + T.draw

    // content column: from the leftmost text edge to the rightmost text/link edge
    const texts = items.filter((it) => it.kind === "text" || it.kind === "link")
    const left = texts.length ? Math.min(...texts.map((t) => t.x)) : 20
    const right = texts.length
        ? Math.min(vw, Math.max(...texts.map((t) => t.x + t.w)))
        : vw - 20

    const title = items.find((it) => it.title)
    const settleTo = title ? right - title.x : 0
    const settles = !!title && settleTo - title.w > 40
    const settleAt = buildEnd + 0.1
    const after = settles ? settleAt + T.settle : buildEnd
    const textAt = after + 0.15

    // construction lines: the column edges text snaps to, and plate tops
    const blocks = items.filter((it) => it.kind === "text" && !it.inLink)
    const vGuides = uniq(
        [...blocks.map((t) => t.x), right].map(Math.round),
        3
    ).slice(0, 6)
    const hGuides = uniq(
        items.filter((it) => it.kind === "plate").map((p) => Math.round(p.y)),
        3
    ).slice(0, 4)
    const navRow = items.filter((it) => it.kind === "link")
    if (navRow.length) {
        const top = Math.min(...navRow.map((l) => l.y))
        const row = navRow.filter((l) => Math.abs(l.y - top) < 12)
        hGuides.unshift(Math.round(Math.max(...row.map((l) => l.y + l.h)) + 20))
    }


    return (
        <>
            <div className="akl-guides">
                {vGuides.map((x, i) => (
                    <i
                        key={`v${i}`}
                        className="akl-gv"
                        style={{ left: x, animation: a("akDrawY", 0.7, i * 0.06) }}
                    />
                ))}
                {hGuides.map((y, i) => (
                    <i
                        key={`h${i}`}
                        className="akl-gh"
                        style={{ top: y, animation: a("akDrawX", 0.7, 0.1 + i * 0.06) }}
                    />
                ))}
            </div>

            {right - left > 60 && (
                <div
                    className="akl-dimh akl-ruler"
                    style={{ left, width: right - left, animation: a("akDrawX", 0.6, 0.1) }}
                >
                    <span className="akl-num">{Math.round(right - left)}</span>
                </div>
            )}

            {items.map((it, i) => {
                const d = delayOf(it)
                const box = { left: it.x, top: it.y, width: it.w, height: it.h }
                const tagAbove = it.y > 22

                if (it.kind === "plate")
                    return (
                        <div
                            key={i}
                            className="akl-plate"
                            style={{ ...box, animation: a("akDrawUp", 0.7, d) }}
                        >
                            <svg className="akl-x" viewBox="0 0 100 100" preserveAspectRatio="none">
                                <line x1="0" y1="0" x2="100" y2="100" />
                                <line x1="100" y1="0" x2="0" y2="100" />
                            </svg>
                            <i className="akl-sheen" style={{ animationDelay: `${(d + 0.5) / speed}s` }} />
                            <span className="akl-tag" style={{ animation: a("akPop", 0.3, d + 0.4) }}>
                                {it.tag}
                            </span>
                            {it.w > 120 && it.h > 60 && (
                                <span
                                    className="akl-num akl-platedim"
                                    style={{ animation: a("akFade", 0.4, after) }}
                                >
                                    {Math.round(it.w)} × {Math.round(it.h)}
                                </span>
                            )}
                        </div>
                    )

                if (it.kind === "link" || it.kind === "frame")
                    return (
                        <div
                            key={i}
                            className={`akl-box akl-${it.kind}`}
                            style={{ ...box, animation: a("akDrawX", 0.45, d) }}
                        >
                            {(it.kind === "frame" || it.rowFirst) && (
                                <span
                                    className="akl-tag akl-tag-below"
                                    style={{ animation: a("akPop", 0.3, d + 0.3) }}
                                >
                                    {it.tag}
                                </span>
                            )}
                        </div>
                    )

                // text
                const copy = copyText ? (
                    <div
                        ref={(el) => {
                            cloneRefs.current[i] = el
                        }}
                        className="akl-copy"
                        style={{
                            ...box,
                            height: "auto",
                            animation: a("akText", T.text, textAt + (it.inLink ? 0.08 : 0)),
                        }}
                    />
                ) : null
                if (it.inLink) return <React.Fragment key={i}>{copy}</React.Fragment>

                const settleStyle =
                    it.title && settles
                        ? ({ "--from": `${settleTo}px` } as React.CSSProperties)
                        : undefined
                return (
                    <React.Fragment key={i}>
                        <div className="akl-slot" style={box}>
                            <div
                                className="akl-hatch"
                                style={{
                                    ...settleStyle,
                                    animation:
                                        it.title && settles
                                            ? `${a("akDrawX", 0.6, d)}, ${a("akSettle", T.settle, settleAt, "cubic-bezier(.7,0,.2,1)")}`
                                            : a("akDrawX", 0.5, d),
                                    // hatch dims once the copy lands
                                    ["--hd-delay" as any]: `${textAt / speed}s`,
                                    ["--hd-dur" as any]: `${0.6 / speed}s`,
                                }}
                            >
                                <span
                                    className={`akl-tag ${tagAbove ? "akl-tag-above" : "akl-tag-below"}`}
                                    style={{ animation: a("akPop", 0.3, d + 0.3) }}
                                >
                                    {it.tag}
                                </span>
                            </div>
                            {it.title && settles && (
                                <div
                                    className="akl-ghost"
                                    style={{
                                        width: settleTo - it.w,
                                        animation: a("akGhost", 1.1, settleAt, "linear"),
                                    }}
                                >
                                    <span className="akl-num">{Math.round(settleTo - it.w)}</span>
                                </div>
                            )}
                            {it.title && (
                                <>
                                    <div className="akl-dimh akl-under" style={{ animation: a("akFade", 0.4, after) }}>
                                        <span className="akl-num">{Math.round(it.w)}</span>
                                    </div>
                                    {it.x > 14 && (
                                        <div className="akl-dimv" style={{ animation: a("akFade", 0.4, after + 0.05) }}>
                                            <span className="akl-num">{Math.round(it.h)}</span>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                        {copy}
                    </React.Fragment>
                )
            })}
        </>
    )
}

// ── Editor stand-in (the canvas has no page to trace) ────────────────────────
function StandIn() {
    const box = (l: string, t: string, w: string, h: string) =>
        ({ left: l, top: t, width: w, height: h }) as React.CSSProperties
    return (
        <>
            <div className="akl-box akl-link" style={box("20px", "20px", "64px", "36px")}>
                <span className="akl-tag akl-tag-below">nav 01</span>
            </div>
            <div className="akl-slot" style={box("20px", "12%", "46%", "15%")}>
                <div className="akl-hatch">
                    <span className="akl-tag akl-tag-above">title</span>
                </div>
            </div>
            <div className="akl-slot" style={box("51%", "25%", "46%", "3%")}>
                <div className="akl-hatch">
                    <span className="akl-tag akl-tag-above">copy 01</span>
                </div>
            </div>
            {[0, 1].map((i) => (
                <div key={i} className="akl-plate" style={box(i ? "51%" : "0px", "40%", "48.5%", "50%")}>
                    <svg className="akl-x" viewBox="0 0 100 100" preserveAspectRatio="none">
                        <line x1="0" y1="0" x2="100" y2="100" />
                        <line x1="100" y1="0" x2="0" y2="100" />
                    </svg>
                    <span className="akl-tag">plate 0{i + 1}</span>
                </div>
            ))}
        </>
    )
}

// ── Reading the page ─────────────────────────────────────────────────────────
const TEXT_SEL = '[data-framer-component-type="RichTextContainer"]'
const TEXT_FALLBACK = "h1,h2,h3,h4,h5,h6,p"
const MEDIA_SEL = "[data-framer-background-image-wrapper], img, video, canvas, iframe"
const LINK_SEL = "a:not(.framer-text), button, [role='button']"

function scanPage(exclude: Element, mode: "auto" | "tagged", prefix: string): Scan {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const pre = escapeRe(prefix.trim() || "bp")
    const tagRe = new RegExp(`^${pre}[\\s:_-]+(.+)$`, "i")
    const skipRe = new RegExp(`^${pre}[\\s:_-]*skip$`, "i")

    const rectOf = (el: Element) => el.getBoundingClientRect()
    const skipped = (el: Element) => {
        if (exclude.contains(el)) return true
        for (let p: Element | null = el; p; p = p.parentElement) {
            const name = p.getAttribute("data-framer-name")
            if (name && skipRe.test(name)) return true
        }
        return false
    }
    const shown = (el: Element, min = 4) => {
        const r = rectOf(el)
        if (r.width < min || r.height < min) return false
        if (r.bottom <= 0 || r.top >= vh || r.right <= 0 || r.left >= vw) return false
        const cv = (el as any).checkVisibility
        if (typeof cv === "function" && !cv.call(el, { visibilityProperty: true }))
            return false
        return !skipped(el)
    }

    const picked: { el: HTMLElement; kind: Kind; tag?: string }[] = []
    const isPicked = (el: Element) => picked.some((p) => p.el === el)
    const insidePicked = (el: Element, kinds: Kind[]) =>
        picked.some((p) => kinds.includes(p.kind) && p.el !== el && p.el.contains(el))

    // 1. layers the designer tagged by name
    document.querySelectorAll<HTMLElement>("[data-framer-name]").forEach((el) => {
        const m = (el.getAttribute("data-framer-name") || "").match(tagRe)
        if (!m || skipRe.test(m[0]) || !shown(el)) return
        const kind: Kind = el.matches(TEXT_SEL)
            ? "text"
            : el.matches(LINK_SEL)
              ? "link"
              : el.matches(MEDIA_SEL) || el.querySelector(MEDIA_SEL)
                ? "plate"
                : el.querySelector(TEXT_SEL) && !el.querySelector(MEDIA_SEL)
                  ? "text"
                  : "frame"
        picked.push({ el, kind, tag: m[1].trim() })
    })
    const tagged = picked.slice()
    const underTag = (el: Element) => tagged.some((t) => t.el === el || t.el.contains(el))

    if (mode === "auto") {
        // 2. media → plates
        document.querySelectorAll<HTMLElement>(MEDIA_SEL).forEach((el) => {
            if (el.tagName === "IMG" && el.closest("[data-framer-background-image-wrapper]")) return
            const r = rectOf(el)
            if (el.closest("a, button") && r.width < 48) return // icons
            // full-bleed backgrounds (a WebGL scene, a hero video behind
            // everything) aren't a plate — outlining them just X's out the page
            if (r.width * r.height > 0.6 * vw * vh) return
            if (!shown(el, 24) || underTag(el) || insidePicked(el, ["plate"])) return
            picked.push({ el, kind: "plate" })
        })
        // 3. links & buttons
        document.querySelectorAll<HTMLElement>(LINK_SEL).forEach((el) => {
            const r = rectOf(el)
            if (r.width > 420 || r.height > 120) return
            if (!shown(el) || underTag(el) || isPicked(el)) return
            if (picked.some((p) => p.kind === "plate" && el.contains(p.el))) return
            picked.push({ el, kind: "link" })
        })
        // 4. text blocks
        let textEls = Array.from(document.querySelectorAll<HTMLElement>(TEXT_SEL))
        if (!textEls.length)
            textEls = Array.from(document.querySelectorAll<HTMLElement>(TEXT_FALLBACK)).filter(
                (el) => !el.parentElement?.closest(TEXT_FALLBACK)
            )
        textEls.forEach((el) => {
            if (!(el.textContent || "").trim()) return
            if (!shown(el) || underTag(el) || insidePicked(el, ["text"])) return
            picked.push({ el, kind: "text" })
        })
    }

    // reading order, then labels
    const withRect = picked
        .map((p) => ({ ...p, r: rectOf(p.el) }))
        .sort((p, q) => (Math.abs(p.r.top - q.r.top) < 6 ? p.r.left - q.r.left : p.r.top - q.r.top))
        .slice(0, MAX_ITEMS)

    const count: Record<string, number> = {}
    const next = (k: string) => (count[k] = (count[k] || 0) + 1)
    const nn = (n: number) => String(n).padStart(2, "0")
    let titled = false
    let lastLinkTop = -999

    const items: Item[] = []
    const sources: (HTMLElement | null)[] = []
    for (const p of withRect) {
        const inLink = p.kind === "text" && !!p.el.closest(LINK_SEL)
        const heading = p.kind === "text" ? p.el.querySelector("h1,h2,h3,h4,h5,h6") ?? (p.el.matches("h1,h2,h3,h4,h5,h6") ? p.el : null) : null
        const isTitle = !titled && !inLink && heading?.tagName === "H1"
        if (isTitle) titled = true

        let tag = p.tag ?? ""
        let rowFirst = false
        if (!p.tag) {
            if (p.kind === "plate") {
                const alt = (p.el.querySelector("img")?.getAttribute("alt") || (p.el as HTMLImageElement).alt || "").trim()
                tag = `plate ${nn(next("plate"))}${alt ? " · " + alt.slice(0, 22) : ""}`
            } else if (p.kind === "link") {
                tag = `nav ${nn(next("nav"))}`
            } else if (isTitle) {
                tag = "title · h1"
            } else if (p.kind === "text" && !inLink) {
                tag = `copy ${nn(next("copy"))}${heading ? " · " + heading.tagName.toLowerCase() : ""}`
            }
        }
        if (p.kind === "link") {
            rowFirst = Math.abs(p.r.top - lastLinkTop) > 12 || !!p.tag
            lastLinkTop = p.r.top
        }
        items.push({
            kind: p.kind,
            x: p.r.left,
            y: p.r.top,
            w: p.r.width,
            h: p.r.height,
            tag,
            title: isTitle,
            inLink,
            rowFirst,
        })
        sources.push(p.kind === "text" ? p.el : null)
    }
    return { items, sources, vw, vh }
}

// Deep-copy a text block with its computed typography inlined, so it renders
// identically outside the page's CSS — then recoloured by the drawing.
const COPY_PROPS = [
    "display", "flex-direction", "justify-content", "align-items", "gap",
    "font-family", "font-size", "font-weight", "font-style", "font-stretch",
    "font-variant", "font-feature-settings", "font-variation-settings",
    "line-height", "letter-spacing", "word-spacing", "text-align", "text-indent",
    "text-transform", "white-space", "text-wrap", "text-wrap-mode", "text-wrap-style",
    "word-break", "overflow-wrap", "hyphens", "direction", "vertical-align",
    "text-decoration-line", "text-decoration-thickness", "text-underline-offset",
    "margin-top", "margin-right", "margin-bottom", "margin-left",
    "padding-top", "padding-right", "padding-bottom", "padding-left",
    "list-style-type", "list-style-position",
]
const DROP = new Set(["IMG", "VIDEO", "CANVAS", "IFRAME", "SCRIPT", "STYLE", "NOSCRIPT"])

function cloneStyled(src: Element): Node {
    const out = src.cloneNode(false) as HTMLElement
    const cs = getComputedStyle(src)
    let s = ""
    for (const p of COPY_PROPS) {
        const v = cs.getPropertyValue(p)
        if (v) s += `${p}:${v};`
    }
    out.setAttribute(
        "style",
        s + "color:inherit;text-decoration-color:currentColor;background:none;border:none;box-shadow:none;transform:none;opacity:1;"
    )
    for (const attr of ["class", "id", "href", "target", "rel", "data-framer-name", "tabindex"])
        out.removeAttribute(attr)
    src.childNodes.forEach((child) => {
        if (child.nodeType === 3) out.appendChild(child.cloneNode())
        else if (child.nodeType === 1 && !DROP.has((child as Element).tagName))
            out.appendChild(cloneStyled(child as Element))
    })
    if (out.style) out.style.width = "100%"
    return out
}

function uniq(values: number[], tol: number) {
    const out: number[] = []
    values
        .slice()
        .sort((a, b) => a - b)
        .forEach((v) => {
            if (!out.some((o) => Math.abs(o - v) <= tol)) out.push(v)
        })
    return out
}

function escapeRe(s: string) {
    return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

// ── Styles ───────────────────────────────────────────────────────────────────
const CSS = `
.akl {
  --akr-reveal: 0px;
  --soft: color-mix(in srgb, var(--ln) 55%, transparent);
  --faint: color-mix(in srgb, var(--ln) 22%, transparent);
  overflow: hidden; pointer-events: auto; user-select: none;
  color: var(--ln);
}
.akl *, .akl *::before, .akl *::after { box-sizing: border-box; }
.akl-sheet { position: absolute; inset: 0; background: var(--bp); clip-path: inset(var(--akr-reveal) 0 0 0); }
.akl-band {
  position: absolute; left: 0; right: 0; top: 0; height: 160px; pointer-events: none;
  transform: translateY(calc(var(--akr-reveal) - 160px));
  background: linear-gradient(to bottom, transparent, color-mix(in srgb, var(--bp) 28%, transparent));
}
.akl-grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(var(--faint) 1px, transparent 1px),
    linear-gradient(90deg, var(--faint) 1px, transparent 1px),
    linear-gradient(color-mix(in srgb, var(--ln) 9%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--ln) 9%, transparent) 1px, transparent 1px);
  background-size: 100px 100px, 100px 100px, 20px 20px, 20px 20px;
  background-position: 20px 0, 20px 0, 20px 0, 20px 0;
}
.akl-guides i { position: absolute; display: block; }
.akl-gv { top: 0; bottom: 0; width: 1px; background: var(--soft); }
.akl-gh { left: 0; right: 0; height: 1px; background: var(--soft); }

.akl-tag, .akl-num {
  font-family: ${FONT_MONO}; font-size: 9px; line-height: 1; letter-spacing: .06em;
  text-transform: uppercase; white-space: nowrap;
}
.akl-tag { position: absolute; left: 4px; top: 4px; z-index: 2; padding: 2px 4px; background: var(--ln); color: var(--bp); }
.akl-tag-above { top: auto; bottom: calc(100% + 4px); left: -1px; }
.akl-tag-below { top: calc(100% + 4px); left: -1px; }
.akl-num { padding: 2px 4px; background: var(--bp); color: var(--ln); border: 1px solid var(--soft); }

.akl-box { position: absolute; border: 1px dashed var(--ln); }
.akl-link { border-color: var(--soft); }
.akl-slot { position: absolute; }
.akl-hatch {
  position: absolute; left: 0; top: 0; bottom: 0; width: 100%;
  border: 1px solid var(--soft);
}
.akl-hatch::before {
  content: ""; position: absolute; inset: 0; opacity: .35;
  background:
    repeating-linear-gradient(135deg, var(--faint) 0 1px, transparent 1px 7px),
    color-mix(in srgb, var(--ln) 6%, transparent);
  animation: akHatchDim var(--hd-dur, .6s) ease var(--hd-delay, 0s) both;
}
.akl-ghost {
  position: absolute; left: 100%; top: 50%; border-top: 1px dashed var(--ln); opacity: 0;
  display: flex; justify-content: center;
}
.akl-ghost .akl-num { transform: translateY(-50%); }
.akl-dimh {
  position: absolute; height: 7px;
  border-left: 1px solid var(--ln); border-right: 1px solid var(--ln);
  display: flex; align-items: center; justify-content: center;
}
.akl-dimh::before { content: ""; position: absolute; left: 0; right: 0; top: 3px; height: 1px; background: var(--soft); }
.akl-dimh .akl-num { position: relative; }
.akl-ruler { top: 7px; }
.akl-under { left: 0; right: 0; top: calc(100% + 7px); }
.akl-dimv {
  position: absolute; top: 0; bottom: 0; left: -12px; width: 7px;
  border-top: 1px solid var(--ln); border-bottom: 1px solid var(--ln);
  display: flex; align-items: center; justify-content: center;
}
.akl-dimv::before { content: ""; position: absolute; top: 0; bottom: 0; left: 3px; border-left: 1px dashed var(--ln); }
.akl-dimv .akl-num { position: relative; transform: rotate(-90deg); }

.akl-plate {
  position: absolute; border: 1px solid var(--ln); overflow: hidden;
  background:
    radial-gradient(120% 90% at 30% 20%, color-mix(in srgb, var(--ln) 16%, transparent), transparent 60%),
    color-mix(in srgb, var(--ln) 6%, transparent);
}
.akl-x { position: absolute; inset: 0; width: 100%; height: 100%; }
.akl-x line { stroke: var(--soft); stroke-width: 1; vector-effect: non-scaling-stroke; }
.akl-sheen {
  position: absolute; top: 0; bottom: 0; left: -60%; width: 60%;
  background: linear-gradient(100deg, transparent, color-mix(in srgb, var(--ln) 22%, transparent), transparent);
  animation: akSheen 2.6s cubic-bezier(.5,0,.3,1) infinite;
}
.akl-platedim { position: absolute; left: 50%; bottom: 8px; transform: translateX(-50%); }

.akl-copy { position: absolute; color: var(--ln); pointer-events: none; }

@keyframes akFade { from { opacity: 0; } to { opacity: 1; } }
@keyframes akPop { from { opacity: 0; transform: translateY(3px); } to { opacity: 1; transform: none; } }
@keyframes akDrawX { from { clip-path: inset(-20px 100% -20px -20px); } to { clip-path: inset(-20px -20px -20px -20px); } }
@keyframes akDrawY { from { clip-path: inset(0 0 100% 0); } to { clip-path: inset(0 0 0 0); } }
@keyframes akDrawUp { from { clip-path: inset(100% 0 0 0); } to { clip-path: inset(0 0 0 0); } }
@keyframes akSettle { from { width: var(--from); } to { width: 100%; } }
@keyframes akGhost { 0% { opacity: 0; } 15% { opacity: 1; } 75% { opacity: 1; } 100% { opacity: 0; } }
@keyframes akText { from { opacity: 0; filter: blur(6px); } to { opacity: 1; filter: blur(0); } }
@keyframes akSheen { 0% { transform: translateX(0); } 60%, 100% { transform: translateX(270%); } }
@keyframes akHatchDim { from { opacity: 1; } to { opacity: .35; } }

.akl-static *, .akl-static *::before, .akl-static *::after { animation: none !important; }
@media (prefers-reduced-motion: reduce) {
  .akl *, .akl *::before, .akl *::after {
    animation-duration: 1ms !important; animation-delay: 0ms !important; animation-iteration-count: 1 !important;
  }
}
`

addPropertyControls(BlueprintSplashLive, {
    color: { type: ControlType.Color, title: "Blueprint", defaultValue: "#F0509A" },
    lineColor: { type: ControlType.Color, title: "Lines", defaultValue: "#FFFFFF" },
    speed: { type: ControlType.Number, title: "Speed", defaultValue: 1, min: 0.5, max: 2, step: 0.05, unit: "×" },
    mode: {
        type: ControlType.Enum,
        title: "Trace",
        options: ["auto", "tagged"],
        optionTitles: ["Everything", "Tagged Only"],
        defaultValue: "auto",
        displaySegmentedControl: true,
        description: "Name a layer “bp Label” to outline it with that label, or “bp-skip” to leave it out.",
    },
    prefix: { type: ControlType.String, title: "Tag Prefix", defaultValue: "bp" },
    copyText: { type: ControlType.Boolean, title: "Copy Text", defaultValue: true, enabledTitle: "Yes", disabledTitle: "No" },
    waitForLoad: {
        type: ControlType.Boolean,
        title: "Wait for Load",
        defaultValue: true,
        description: "Hold on the finished drawing until the page has loaded.",
    },
    maxWait: {
        type: ControlType.Number,
        title: "Max Wait",
        defaultValue: 6,
        min: 1,
        max: 15,
        step: 0.5,
        unit: "s",
        hidden: (p: any) => !p.waitForLoad,
    },
    play: {
        type: ControlType.Enum,
        title: "Play",
        options: ["every", "session"],
        optionTitles: ["Every Visit", "Once per Session"],
        defaultValue: "every",
        displaySegmentedControl: true,
        segmentedControlDirection: "vertical",
    },
    showInEditor: { type: ControlType.Boolean, title: "In Editor", defaultValue: true, enabledTitle: "Show", disabledTitle: "Hide" },
})

BlueprintSplashLive.displayName = "Blueprint Splash Live"
