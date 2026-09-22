import * as React from "react"
import { useEffect, useRef, useState } from "react"
import { addPropertyControls, ControlType, useIsStaticRenderer } from "framer"

/**
 * BLUEPRINT SPLASH
 * ─────────────────────────────────────────────────────────────────────────────
 * A loading screen for the Portfolio F26 home page. A pink sheet sets out the
 * page as a drawing, then wipes away to reveal the real page underneath:
 *
 *   1. solid pink → grid and construction lines draw in
 *   2. every element of the home page is outlined: nav, headline, subline,
 *      project plates (hatched boxes, tags, dimensions)
 *   3. the headline box "settles" from full width into its 50% column
 *   4. the real copy fades in, in white, on top of its boxes
 *   5. the sheet wipes down, top to bottom, and the page is underneath
 *
 * The drawing is not traced from the page at runtime. It re-creates the Home
 * page's own layout rules with the same CSS (nav 76px, hero 30vh with 20px
 * padding and 50% columns, 582×500 cards with a 411px thumbnail pinned to the
 * bottom, the Desktop / Tablet / Phone breakpoints, the Heading 1 / Heading 2c
 * type scale), so every outline lands on the element it stands for at any
 * viewport width. If the page layout changes, change it in PAGE below.
 *
 * Setup in Framer: put it on the Home page as a top-level layer, Position
 * Fixed, pinned to all four edges (100vw × 100vh), highest z-index.
 */

// ── The Home page, as laid out in Framer ─────────────────────────────────────
const PAGE = {
    pad: 20, // hero padding, nav logo padding, content gutters
    navH: 76,
    heroVh: 30, // hero height, in % of viewport height
    cardW: 582,
    cardH: 500,
    thumbH: 411,
    cardGap: 20,
    phoneRowGap: 40,
    tabletTop: 140, // page padding-top at Tablet
    phoneTop: 100, // page padding-top at Phone
    font: `"Test Untitled Sans Regular", "Test Untitled Sans", "Test Untitled Sans Regular Placeholder", ui-sans-serif, system-ui, sans-serif`,
    mono: `"Iosevka Charon Mono Regular", "Iosevka Charon Mono", ui-monospace, "SF Mono", Menlo, monospace`,
}

// ── Timeline, in seconds at speed 1 ──────────────────────────────────────────
const T = {
    grid: 0.35,
    guides: 0.55,
    nav: 1.0,
    h1: 1.3,
    h2: 1.55,
    plates: 1.65,
    plateStagger: 0.12,
    settle: 2.45,
    dims: 3.05,
    text: 3.25,
    exit: 0.95, // wipe duration
}

interface BlueprintSplashProps {
    color: string
    lineColor: string
    speed: number
    waitForLoad: boolean
    maxWait: number
    play: "every" | "session"
    showInEditor: boolean
    logo: string
    navLinks: string[]
    headline: string
    subline: string
    projects: string[]
    style?: React.CSSProperties
}

const SESSION_KEY = "akr-blueprint-splash-seen"

/**
 * @framerIntrinsicWidth 1200
 * @framerIntrinsicHeight 800
 *
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 */
export default function BlueprintSplash(props: BlueprintSplashProps) {
    const {
        color = "#F0509A",
        lineColor = "#FFFFFF",
        speed = 1,
        waitForLoad = true,
        maxWait = 6,
        play = "every",
        showInEditor = true,
        logo = "AKR",
        navLinks = ["Design", "Play", "About", "Contact"],
        headline = "I'm Aparna, a Product designer based in NYC,\nwith a background in Interaction & Graphic design.",
        subline = "Currently designing Ash to change a billion lives.",
        projects = [
            "TNS 2025",
            "Align with Ash",
            "Disciple",
            "Phia",
            "Sea12",
            "WIRED",
            "Gundi Studios",
        ],
    } = props

    const isStatic = useIsStaticRenderer()
    const rootRef = useRef<HTMLDivElement>(null)
    const h1Ref = useRef<HTMLDivElement>(null)
    const h2Ref = useRef<HTMLDivElement>(null)
    const thumbRef = useRef<HTMLDivElement>(null)
    const [done, setDone] = useState(false)
    const [dims, setDims] = useState({
        w: 1160,
        h1w: 580,
        h1h: 144,
        h2w: 580,
        h2h: 19,
        tw: 582,
        th: 411,
    })

    // Dimension labels: measure our own boxes (never the page's).
    useEffect(() => {
        const root = rootRef.current
        if (!root || typeof ResizeObserver === "undefined") return
        const measure = () => {
            const r = (el: HTMLElement | null) =>
                el ? el.getBoundingClientRect() : { width: 0, height: 0 }
            const next = {
                w: Math.round(root.clientWidth - PAGE.pad * 2),
                h1w: Math.round(r(h1Ref.current).width),
                h1h: Math.round(r(h1Ref.current).height),
                h2w: Math.round(r(h2Ref.current).width),
                h2h: Math.round(r(h2Ref.current).height),
                tw: Math.round(r(thumbRef.current).width),
                th: Math.round(r(thumbRef.current).height),
            }
            setDims((prev) =>
                (Object.keys(next) as (keyof typeof next)[]).every(
                    (k) => prev[k] === next[k]
                )
                    ? prev
                    : next
            )
        }
        measure()
        const ro = new ResizeObserver(measure)
        ro.observe(root)
        if (h1Ref.current) ro.observe(h1Ref.current)
        return () => ro.disconnect()
    }, [headline, subline])

    // Playback: hold until the build-up has finished and the page has loaded,
    // then wipe the sheet away and get out of the way.
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
        html.style.overflow = "hidden"
        if (!window.location.hash) window.scrollTo(0, 0)

        let cancelled = false
        let raf = 0
        let timer = 0

        const finite = (root.getAnimations?.({ subtree: true }) ?? []).filter(
            (a) => a.effect?.getTiming().iterations !== Infinity
        )
        const built = Promise.all(finite.map((a) => a.finished.catch(() => {})))
        const loaded = new Promise<void>((resolve) => {
            if (!waitForLoad || document.readyState === "complete") resolve()
            else window.addEventListener("load", () => resolve(), { once: true })
            timer = window.setTimeout(resolve, Math.max(0, maxWait) * 1000)
        })

        const reduce = window.matchMedia?.(
            "(prefers-reduced-motion: reduce)"
        ).matches

        const finish = () => {
            if (cancelled) return
            html.style.overflow = prevOverflow
            // our Framer wrapper stays in the page after we unmount; make sure
            // it can never swallow clicks
            const wrapper = root.parentElement
            if (wrapper) wrapper.style.pointerEvents = "none"
            try {
                sessionStorage.setItem(SESSION_KEY, "1")
            } catch {}
            setDone(true)
        }

        Promise.all([built, loaded]).then(() => {
            if (cancelled) return
            const dur = ((reduce ? 0.3 : T.exit) / speed) * 1000
            const band = 160
            const start = performance.now()
            const step = (now: number) => {
                if (cancelled) return
                const t = Math.min(1, (now - start) / dur)
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

        return () => {
            cancelled = true
            cancelAnimationFrame(raf)
            window.clearTimeout(timer)
            html.style.overflow = prevOverflow
        }
    }, [isStatic, play, waitForLoad, maxWait, speed])

    if (done) return null
    if (isStatic && !showInEditor) return null

    // animation shorthand, scaled by speed
    const a = (
        name: string,
        dur: number,
        delay: number,
        ease = "cubic-bezier(.2,.7,.2,1)"
    ) => `${name} ${dur / speed}s ${ease} ${delay / speed}s both`

    const pad2 = (n: number) => String(n).padStart(2, "0")
    const lines = headline.split("\n")

    return (
        <div
            ref={rootRef}
            className={`akr-bp${isStatic ? " akr-static" : ""}`}
            aria-hidden="true"
            style={
                {
                    ...props.style,
                    "--bp": color,
                    "--ln": lineColor,
                    "--hd-delay": `${T.text / speed}s`,
                    "--hd-dur": `${0.6 / speed}s`,
                    position: "relative",
                    width: "100%",
                    height: "100%",
                } as React.CSSProperties
            }
        >
            <style>{CSS}</style>

            <div className="akr-sheet">
                {/* grid + construction lines */}
                <div
                    className="akr-grid"
                    style={{ animation: a("akrDrawY", 0.8, T.grid) }}
                />
                <div className="akr-guides">
                    <i
                        className="akr-gv"
                        style={{
                            left: PAGE.pad,
                            animation: a("akrDrawY", 0.7, T.guides),
                        }}
                    />
                    <i
                        className="akr-gv akr-mid"
                        style={{ animation: a("akrDrawY", 0.7, T.guides + 0.08) }}
                    />
                    <i
                        className="akr-gv"
                        style={{
                            right: PAGE.pad,
                            animation: a("akrDrawY", 0.7, T.guides + 0.16),
                        }}
                    />
                    <i
                        className="akr-gh"
                        style={{
                            top: PAGE.navH,
                            animation: a("akrDrawX", 0.7, T.guides + 0.1),
                        }}
                    />
                    <i
                        className="akr-gh akr-herobase"
                        style={{ animation: a("akrDrawX", 0.7, T.guides + 0.2) }}
                    />
                </div>

                {/* top ruler: content width */}
                <div
                    className="akr-ruler"
                    style={{ animation: a("akrDrawX", 0.6, T.guides + 0.1) }}
                >
                    <span className="akr-num">{dims.w}</span>
                </div>

                {/* ── the page, set out ── */}
                <div className="akr-page">
                    <div className="akr-nav">
                        <div
                            className="akr-logo akr-box"
                            style={{ animation: a("akrDrawX", 0.45, T.nav) }}
                        >
                            <span
                                className="akr-tag akr-tag-below"
                                style={{ animation: a("akrPop", 0.3, T.nav + 0.3) }}
                            >
                                nav 01
                            </span>
                            <span
                                className="akr-txt"
                                style={{ animation: a("akrText", 0.6, T.text) }}
                            >
                                {logo}
                            </span>
                        </div>
                        <div
                            className="akr-links akr-box"
                            style={{ animation: a("akrDrawX", 0.5, T.nav + 0.1) }}
                        >
                            <span
                                className="akr-tag akr-tag-below"
                                style={{ animation: a("akrPop", 0.3, T.nav + 0.4) }}
                            >
                                nav 02
                            </span>
                            {navLinks.map((l, i) => (
                                <span
                                    key={i}
                                    className="akr-link"
                                    style={{
                                        animation: a(
                                            "akrFade",
                                            0.3,
                                            T.nav + 0.2 + i * 0.06
                                        ),
                                    }}
                                >
                                    <span
                                        className="akr-txt"
                                        style={{
                                            animation: a(
                                                "akrText",
                                                0.6,
                                                T.text + 0.1 + i * 0.04
                                            ),
                                        }}
                                    >
                                        {l}
                                    </span>
                                </span>
                            ))}
                        </div>
                    </div>

                    <div className="akr-hero">
                        <div className="akr-slot akr-h1" ref={h1Ref}>
                            <div
                                className="akr-box akr-hatch akr-settle"
                                style={{
                                    animation: `${a("akrDrawX", 0.6, T.h1)}, ${a(
                                        "akrSettle",
                                        0.8,
                                        T.settle,
                                        "cubic-bezier(.7,0,.2,1)"
                                    )}`,
                                }}
                            >
                                <span
                                    className="akr-tag akr-tag-above"
                                    style={{ animation: a("akrPop", 0.3, T.h1 + 0.35) }}
                                >
                                    title · h1
                                </span>
                            </div>
                            <div
                                className="akr-ghost"
                                style={{
                                    animation: a("akrGhost", 1.1, T.settle, "linear"),
                                }}
                            >
                                <span className="akr-num">{dims.w - dims.h1w}</span>
                            </div>
                            <div
                                className="akr-txt akr-h1txt"
                                style={{ animation: a("akrText", 0.7, T.text) }}
                            >
                                {lines.map((l, i) => (
                                    <React.Fragment key={i}>
                                        {i > 0 && <br />}
                                        {l}
                                    </React.Fragment>
                                ))}
                            </div>
                            <div
                                className="akr-dimh"
                                style={{ animation: a("akrFade", 0.4, T.dims) }}
                            >
                                <span className="akr-num">{dims.h1w}</span>
                            </div>
                            <div
                                className="akr-dimv"
                                style={{ animation: a("akrFade", 0.4, T.dims + 0.05) }}
                            >
                                <span className="akr-num">{dims.h1h}</span>
                            </div>
                        </div>

                        <div className="akr-slot akr-h2" ref={h2Ref}>
                            <div
                                className="akr-box akr-hatch"
                                style={{ animation: a("akrDrawX", 0.5, T.h2) }}
                            >
                                <span
                                    className="akr-tag akr-tag-above"
                                    style={{ animation: a("akrPop", 0.3, T.h2 + 0.3) }}
                                >
                                    copy · h2
                                </span>
                            </div>
                            <div
                                className="akr-txt akr-h2txt"
                                style={{ animation: a("akrText", 0.7, T.text + 0.12) }}
                            >
                                {subline}
                            </div>
                            <div
                                className="akr-dimh"
                                style={{ animation: a("akrFade", 0.4, T.dims + 0.1) }}
                            >
                                <span className="akr-num">
                                    {dims.h2w} × {dims.h2h}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="akr-cards">
                        {projects.map((name, i) => {
                            const d = T.plates + i * T.plateStagger
                            return (
                                <div
                                    key={i}
                                    className="akr-card"
                                    style={{ animation: a("akrFade", 0.4, d) }}
                                >
                                    <div
                                        className="akr-thumb"
                                        ref={i === 0 ? thumbRef : undefined}
                                        style={{
                                            animation: a("akrDrawUp", 0.7, d),
                                        }}
                                    >
                                        <svg
                                            className="akr-x"
                                            viewBox="0 0 100 100"
                                            preserveAspectRatio="none"
                                        >
                                            <line x1="0" y1="0" x2="100" y2="100" />
                                            <line x1="100" y1="0" x2="0" y2="100" />
                                        </svg>
                                        <i
                                            className="akr-sheen"
                                            style={{
                                                animationDelay: `${(d + 0.5) / speed}s`,
                                            }}
                                        />
                                        <span
                                            className="akr-tag"
                                            style={{ animation: a("akrPop", 0.3, d + 0.4) }}
                                        >
                                            plate {pad2(i + 1)} · {name}
                                        </span>
                                        <span
                                            className="akr-num akr-thumbdim"
                                            style={{ animation: a("akrFade", 0.4, T.dims) }}
                                        >
                                            {dims.tw} × {dims.th}
                                        </span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* fixed arrow_up button, bottom right */}
                    <div
                        className="akr-up akr-box"
                        style={{ animation: a("akrDrawX", 0.4, T.plates + 0.3) }}
                    >
                        <span className="akr-tag akr-tag-above">btn</span>
                    </div>
                </div>
            </div>

            {/* soft leading edge of the wipe */}
            <div className="akr-band" />
        </div>
    )
}

// ── Styles ───────────────────────────────────────────────────────────────────
// Breakpoints are container queries on the component itself, so they match
// the page's viewport breakpoints live (the layer is 100vw) and still work on
// a fixed-size frame in the editor.
const CSS = `
.akr-bp {
  --akr-reveal: 0px;
  --soft: color-mix(in srgb, var(--ln) 55%, transparent);
  --faint: color-mix(in srgb, var(--ln) 22%, transparent);
  container-type: size;
  overflow: hidden;
  pointer-events: auto;
  color: var(--ln);
  font-family: ${PAGE.font};
  -webkit-font-smoothing: antialiased;
  user-select: none;
}
.akr-bp *, .akr-bp *::before, .akr-bp *::after { box-sizing: border-box; }
.akr-sheet {
  position: absolute; inset: 0;
  background: var(--bp);
  clip-path: inset(var(--akr-reveal) 0 0 0);
}
.akr-band {
  position: absolute; left: 0; right: 0; top: 0; height: 160px;
  transform: translateY(calc(var(--akr-reveal) - 160px));
  background: linear-gradient(to bottom, transparent, color-mix(in srgb, var(--bp) 28%, transparent));
  pointer-events: none;
}

/* grid: 20px minor, 100px major, registered to the 20px gutter */
.akr-grid {
  position: absolute; inset: 0;
  background-image:
    linear-gradient(var(--faint) 1px, transparent 1px),
    linear-gradient(90deg, var(--faint) 1px, transparent 1px),
    linear-gradient(color-mix(in srgb, var(--ln) 9%, transparent) 1px, transparent 1px),
    linear-gradient(90deg, color-mix(in srgb, var(--ln) 9%, transparent) 1px, transparent 1px);
  background-size: 100px 100px, 100px 100px, 20px 20px, 20px 20px;
  background-position: 20px 0, 20px 0, 20px 0, 20px 0;
}
.akr-guides i { position: absolute; display: block; }
.akr-gv { top: 0; bottom: 0; width: 1px; background: var(--soft); }
.akr-mid { left: 50%; background: none; border-left: 1px dashed var(--faint); }
.akr-gh { left: 0; right: 0; height: 1px; background: var(--soft); }
.akr-herobase { top: ${PAGE.heroVh}cqh; }

.akr-ruler {
  position: absolute; left: ${PAGE.pad}px; right: ${PAGE.pad}px; top: 7px; height: 9px;
  border-left: 1px solid var(--ln); border-right: 1px solid var(--ln);
  display: flex; align-items: center; justify-content: center;
}
.akr-ruler::before {
  content: ""; position: absolute; left: 0; right: 0; top: 4px; height: 1px; background: var(--soft);
}
.akr-ruler .akr-num { position: relative; }

/* labels */
.akr-tag, .akr-num {
  font-family: ${PAGE.mono}; font-size: 9px; line-height: 1; letter-spacing: .06em;
  text-transform: uppercase; white-space: nowrap;
}
.akr-tag {
  position: absolute; left: 4px; top: 4px; z-index: 2;
  padding: 2px 4px; background: var(--ln); color: var(--bp);
}
.akr-tag-above { top: auto; bottom: calc(100% + 4px); left: -1px; }
.akr-tag-below { top: calc(100% + 4px); left: -1px; }
.akr-num { padding: 2px 4px; background: var(--bp); color: var(--ln); border: 1px solid var(--soft); }

/* boxes */
.akr-box { position: relative; border: 1px dashed var(--ln); }
.akr-hatch {
  position: absolute; inset: 0; border-style: solid; border-color: var(--soft);
}
.akr-hatch::before {
  content: ""; position: absolute; inset: 0; opacity: .35;
  background:
    repeating-linear-gradient(135deg, var(--faint) 0 1px, transparent 1px 7px),
    color-mix(in srgb, var(--ln) 6%, transparent);
  animation: akrHatchDim var(--hd-dur) ease var(--hd-delay) both;
}

/* ── page layout (mirrors Home) ── */
.akr-page {
  position: absolute; inset: 0;
  display: flex; flex-direction: column;
}
.akr-nav {
  position: absolute; left: 0; right: 0; top: 0; height: ${PAGE.navH}px;
  display: flex; align-items: center; justify-content: space-between;
  padding-right: ${PAGE.pad}px;
}
.akr-logo {
  margin-left: ${PAGE.pad}px; height: 36px;
  display: flex; align-items: center;
  font-size: 30px; line-height: 1.2em;
}
.akr-links { display: flex; gap: 12px; padding: 0 4px; height: 34px; border-style: solid; border-color: var(--faint); }
.akr-link {
  position: relative; display: flex; align-items: center; height: 100%;
  padding: 0 19px; border: 1px dashed var(--soft);
  font-size: 11px; line-height: 1.2em;
}

.akr-hero {
  flex: none; height: ${PAGE.heroVh}cqh; padding: ${PAGE.pad}px;
  display: flex; flex-direction: row; align-items: flex-end; gap: 10px;
}
.akr-slot { position: relative; flex: none; width: 50%; }
.akr-h1txt {
  position: relative; font-size: 30px; line-height: 1.2em; letter-spacing: -0.3px;
  text-wrap: balance;
}
.akr-h2txt { position: relative; font-size: 16px; line-height: 1.2em; letter-spacing: -0.3px; }
.akr-settle { --from: 200%; width: 100%; right: auto; }
.akr-ghost {
  position: absolute; left: 100%; top: 50%; width: 100%;
  border-top: 1px dashed var(--ln); opacity: 0;
  display: flex; justify-content: center;
}
.akr-ghost .akr-num { transform: translateY(-50%); }
.akr-dimh {
  position: absolute; left: 0; right: 0; top: calc(100% + 7px); height: 7px;
  border-left: 1px solid var(--ln); border-right: 1px solid var(--ln);
  display: flex; align-items: center; justify-content: center;
}
.akr-dimh::before { content: ""; position: absolute; left: 0; right: 0; top: 3px; height: 1px; background: var(--soft); }
.akr-dimh .akr-num { position: relative; }
.akr-dimv {
  position: absolute; top: 0; bottom: 0; left: -12px; width: 7px;
  border-top: 1px solid var(--ln); border-bottom: 1px solid var(--ln);
  display: flex; align-items: center; justify-content: center;
}
.akr-dimv::before { content: ""; position: absolute; top: 0; bottom: 0; left: 3px; width: 1px; border-left: 1px dashed var(--ln); }
.akr-dimv .akr-num { position: relative; transform: rotate(-90deg); }

.akr-cards {
  flex: none; height: ${100 - PAGE.heroVh}cqh;
  display: flex; flex-direction: row; align-items: flex-start; gap: ${PAGE.cardGap}px;
}
.akr-card {
  position: relative; flex: none; width: ${PAGE.cardW}px; height: ${PAGE.cardH}px;
  border: 1px dashed var(--faint);
}
.akr-thumb {
  position: absolute; left: -1px; right: -1px; bottom: -1px; height: ${PAGE.thumbH}px;
  border: 1px solid var(--ln); border-radius: 4px; overflow: hidden;
  background:
    radial-gradient(120% 90% at 30% 20%, color-mix(in srgb, var(--ln) 16%, transparent), transparent 60%),
    color-mix(in srgb, var(--ln) 6%, transparent);
}
.akr-x { position: absolute; inset: 0; width: 100%; height: 100%; }
.akr-x line { stroke: var(--soft); stroke-width: 1; vector-effect: non-scaling-stroke; }
.akr-sheen {
  position: absolute; top: 0; bottom: 0; left: -60%; width: 60%;
  background: linear-gradient(100deg, transparent, color-mix(in srgb, var(--ln) 22%, transparent), transparent);
  animation: akrSheen 2.6s cubic-bezier(.5,0,.3,1) infinite;
}
.akr-thumbdim { position: absolute; left: 50%; bottom: 8px; transform: translateX(-50%); }

.akr-up {
  position: absolute; right: ${PAGE.pad}px; bottom: ${PAGE.pad}px; width: 50px; height: 50px;
}

/* Tablet: 810–1199 */
@container (max-width: 1199.98px) {
  .akr-page { padding-top: ${PAGE.tabletTop}px; }
  .akr-hero { flex-direction: column; align-items: flex-start; justify-content: flex-end; }
  .akr-h1txt { font-size: 24px; }
  .akr-h2txt { font-size: 14px; }
  .akr-cards { height: auto; padding: ${PAGE.pad}px 0; }
  .akr-mid { display: none; }
  /* subline sits right under the headline: keep their labels apart */
  .akr-h1 .akr-dimh, .akr-h2 .akr-dimh { display: none; }
  .akr-h2 .akr-tag-above { bottom: auto; top: calc(100% + 4px); }
}
/* Phone: < 810 */
@container (max-width: 809.98px) {
  .akr-page { padding-top: ${PAGE.phoneTop}px; }
  .akr-slot { width: 100%; }
  .akr-h1txt { font-size: 20px; }
  .akr-settle { --from: 100%; }
  .akr-ghost { display: none; }
  .akr-herobase { top: calc(${PAGE.phoneTop}px + ${PAGE.heroVh}cqh); }
  .akr-cards {
    display: grid; grid-template-columns: 1fr; row-gap: ${PAGE.phoneRowGap}px;
    padding: ${PAGE.pad}px; height: auto;
  }
  .akr-card { width: auto; }
  .akr-links { gap: 2px; }
  .akr-link { padding: 0 7px; }
}
@container (max-width: 1199.98px) and (min-width: 810px) {
  .akr-herobase { top: calc(${PAGE.tabletTop}px + ${PAGE.heroVh}cqh); }
}
/* Heading 1 type scale */
@container (min-width: 1440px) {
  .akr-h1txt { font-size: 32px; letter-spacing: -1px; }
}

@keyframes akrFade { from { opacity: 0; } to { opacity: 1; } }
@keyframes akrPop { from { opacity: 0; transform: translateY(3px); } to { opacity: 1; transform: none; } }
@keyframes akrDrawX { from { clip-path: inset(-20px 100% -20px -20px); } to { clip-path: inset(-20px -20px -20px -20px); } }
@keyframes akrDrawY { from { clip-path: inset(0 0 100% 0); } to { clip-path: inset(0 0 0 0); } }
@keyframes akrDrawUp { from { clip-path: inset(100% -20px 0 -20px); } to { clip-path: inset(-20px -20px -20px -20px); } }
@keyframes akrSettle { from { width: var(--from); } to { width: 100%; } }
@keyframes akrGhost { 0% { opacity: 0; } 15% { opacity: 1; } 75% { opacity: 1; } 100% { opacity: 0; } }
@keyframes akrText {
  from { opacity: 0; filter: blur(6px); }
  to { opacity: 1; filter: blur(0); }
}
@keyframes akrSheen { 0% { transform: translateX(0); } 60%, 100% { transform: translateX(270%); } }
@keyframes akrHatchDim { from { opacity: 1; } to { opacity: .35; } }

/* editor preview: everything in its final, set-out state */
.akr-static *, .akr-static *::before, .akr-static *::after { animation: none !important; }

@media (prefers-reduced-motion: reduce) {
  .akr-bp *, .akr-bp *::before, .akr-bp *::after {
    animation-duration: 1ms !important; animation-delay: 0ms !important; animation-iteration-count: 1 !important;
  }
}
`

addPropertyControls(BlueprintSplash, {
    color: { type: ControlType.Color, title: "Blueprint", defaultValue: "#F0509A" },
    lineColor: { type: ControlType.Color, title: "Lines", defaultValue: "#FFFFFF" },
    speed: {
        type: ControlType.Number,
        title: "Speed",
        defaultValue: 1,
        min: 0.5,
        max: 2,
        step: 0.05,
        unit: "×",
    },
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
        hidden: (p) => !p.waitForLoad,
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
    showInEditor: {
        type: ControlType.Boolean,
        title: "In Editor",
        defaultValue: true,
        enabledTitle: "Show",
        disabledTitle: "Hide",
    },
    logo: { type: ControlType.String, title: "Logo", defaultValue: "AKR" },
    navLinks: {
        type: ControlType.Array,
        title: "Nav Links",
        control: { type: ControlType.String },
        defaultValue: ["Design", "Play", "About", "Contact"],
        maxCount: 8,
    },
    headline: {
        type: ControlType.String,
        title: "Headline",
        displayTextArea: true,
        defaultValue:
            "I'm Aparna, a Product designer based in NYC,\nwith a background in Interaction & Graphic design.",
    },
    subline: {
        type: ControlType.String,
        title: "Subline",
        defaultValue: "Currently designing Ash to change a billion lives.",
    },
    projects: {
        type: ControlType.Array,
        title: "Plates",
        control: { type: ControlType.String },
        defaultValue: [
            "TNS 2025",
            "Align with Ash",
            "Disciple",
            "Phia",
            "Sea12",
            "WIRED",
            "Gundi Studios",
        ],
        maxCount: 20,
    },
})

BlueprintSplash.displayName = "Blueprint Splash"
