import * as React from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { addPropertyControls, ControlType, RenderTarget } from "framer"

/**
 * FLOWER CONSOLE
 * ─────────────────────────────────────────────────────────────────────────────
 * A viewport-fixed navigation "flower". Geometry is lifted 1:1 from
 * Group 9.svg / Group 10.svg (52x82 petals, rx 26, ±20° splay, 10.58 stem,
 * 38 calyx flare) so it matches the Figma source exactly at scale 1.
 *
 * Behaviour
 *   • On load it sprouts: the stem grows up from the bottom edge of the
 *     browser and the head blooms open (petals fan out, whole head scales up).
 *   • Clicking a petal with the "Scroll to section" action scrolls the page.
 *   • Once the work section is reached the flower retracts down out of frame,
 *     then re-sprouts from the TOP edge at a smaller scale — stem now hanging
 *     from the top of the browser, petals fanning downward.
 *   • Scrolling back up reverses it.
 *
 * Drop this on the page as a top-level layer. It renders into document.body,
 * so its position on the canvas doesn't matter — only the properties do.
 */

// ── Design constants, straight from the source SVGs ──────────────────────────
const D = {
    petalW: 52,
    petalH: 82,
    spacing: 41.35, // distance between petal pivot points
    outerLift: 2.5, // outer petals sit 2.5 nearer the head than the middle one
    stemW: 10.58,
    flareW: 38, // width of the calyx where it meets the petals
    calyxOut: 10.73, // how far the calyx reaches past the joint, into the head
    calyxIn: 11.44, // how far it reaches back down the stem
    iconCx: 26, // icon centre inside a petal, in petal-local coordinates
    iconCy: 60,
}
const STEM_RUN = 4000 // stem is drawn over-long and clipped by the viewport

// ── Icons ────────────────────────────────────────────────────────────────────
// Material Symbols glyphs, extracted from the source file. `t` re-maps each
// path out of its baked-in placement and back into a clean 0,0→vb,vb box, so
// they can be repositioned freely. To add a Material Symbol of your own, paste
// its 24px path as { vb: 24, d: "…" } — no transform needed.
const ICONS: Record<
    string,
    { vb: number; vbox?: string; t?: string; d: string }
> = {
    home: {
        vb: 24,
        t: "translate(-15.866,-47.686) rotate(-20) translate(-28.0457,-279)",
        d: "M25.3665 348.245L28.1869 340.496C28.2725 340.261 28.406 340.057 28.5872 339.885C28.7686 339.713 28.9859 339.584 29.2391 339.5L35.3373 337.635C35.6895 337.542 36.0251 337.554 36.3441 337.67C36.6631 337.786 36.9286 337.993 37.1406 338.291L40.6131 343.64C40.753 343.867 40.8371 344.105 40.8652 344.354C40.8932 344.602 40.8644 344.844 40.7788 345.08L37.9584 352.828C37.8091 353.239 37.5325 353.538 37.1286 353.726C36.7248 353.914 36.3179 353.934 35.9077 353.785L33.4718 352.898C33.2577 352.82 33.1046 352.683 33.0126 352.485C32.9204 352.288 32.9133 352.082 32.9912 351.868L34.5934 347.466C34.6713 347.252 34.6644 347.046 34.5727 346.849C34.4811 346.651 34.3286 346.514 34.1152 346.436L32.4277 345.822C32.2142 345.744 32.0076 345.751 31.8079 345.842C31.6081 345.934 31.4693 346.086 31.3914 346.3L29.7892 350.702C29.7113 350.916 29.5736 351.069 29.376 351.161C29.1786 351.254 28.9728 351.261 28.7587 351.183L26.3228 350.296C25.9126 350.147 25.6134 349.87 25.4252 349.466C25.2368 349.063 25.2172 348.656 25.3665 348.245Z",
    },
    draw: {
        vb: 20,
        t: "translate(-83.2021,-336.031)",
        d: "M88.2889 352.615C88.1018 352.615 87.9434 352.55 87.8137 352.42C87.6838 352.29 87.6189 352.132 87.6189 351.945V350.717C87.6189 350.544 87.651 350.375 87.7151 350.211C87.7792 350.046 87.8796 349.896 88.0164 349.759L98.0099 339.757C98.1254 339.642 98.2466 339.562 98.3737 339.516C98.5009 339.471 98.635 339.448 98.776 339.448C98.9117 339.448 99.0458 339.471 99.1783 339.516C99.3106 339.562 99.4345 339.642 99.5499 339.757L100.476 340.684C100.592 340.799 100.672 340.923 100.717 341.055C100.763 341.188 100.786 341.322 100.786 341.458C100.786 341.599 100.763 341.733 100.717 341.86C100.672 341.987 100.592 342.108 100.476 342.224L90.4747 352.217C90.3379 352.354 90.1872 352.455 90.0226 352.519C89.8582 352.583 89.6895 352.615 89.5164 352.615H88.2889ZM98.6076 342.544L99.7022 341.45L98.7839 340.531L97.6895 341.626L98.6076 342.544ZM95.0645 352.615C95.8583 352.615 96.647 352.387 97.4306 351.931C98.2142 351.476 98.606 350.856 98.606 350.073C98.606 349.653 98.5051 349.296 98.3033 349C98.1013 348.705 97.7851 348.426 97.3545 348.164C97.2359 348.082 97.104 348.052 96.9587 348.075C96.8134 348.098 96.6884 348.168 96.5837 348.283C96.479 348.398 96.4415 348.532 96.4714 348.683C96.5014 348.834 96.5757 348.951 96.6943 349.033C96.9689 349.196 97.1756 349.356 97.3145 349.511C97.4534 349.665 97.5229 349.853 97.5229 350.073C97.5229 350.467 97.259 350.809 96.7312 351.098C96.2034 351.387 95.6479 351.531 95.0645 351.531C94.9288 351.531 94.8046 351.588 94.6918 351.701C94.5792 351.813 94.5229 351.937 94.5229 352.073C94.5229 352.223 94.5792 352.35 94.6918 352.456C94.8046 352.562 94.9288 352.615 95.0645 352.615ZM91.1189 341.49C91.1189 341.718 90.9883 341.945 90.727 342.17C90.4659 342.395 89.9245 342.702 89.1029 343.091C88.168 343.547 87.5203 343.95 87.1597 344.301C86.7992 344.652 86.6189 345.049 86.6189 345.49C86.6189 345.863 86.7215 346.175 86.9266 346.427C87.1317 346.679 87.3801 346.892 87.6718 347.065C87.8096 347.134 87.9498 347.149 88.0924 347.112C88.2351 347.074 88.3475 346.993 88.4297 346.87C88.5121 346.746 88.5332 346.608 88.4931 346.455C88.4531 346.303 88.3641 346.193 88.2262 346.124C88.067 346.028 87.9399 345.924 87.8449 345.811C87.7498 345.698 87.7022 345.591 87.7022 345.49C87.7022 345.308 87.8385 345.112 88.111 344.901C88.3833 344.69 88.8801 344.405 89.6012 344.047C90.6344 343.524 91.3262 343.079 91.6766 342.712C92.027 342.346 92.2022 341.939 92.2022 341.49C92.2022 340.862 91.9592 340.364 91.4731 339.998C90.987 339.631 90.3689 339.448 89.6189 339.448C89.1029 339.448 88.5947 339.534 88.0941 339.705C87.5935 339.877 87.2385 340.105 87.0291 340.389C86.9416 340.513 86.9008 340.647 86.9066 340.793C86.9124 340.938 86.9774 341.057 87.1014 341.15C87.2114 341.232 87.3447 341.267 87.5012 341.254C87.6577 341.241 87.7797 341.184 87.8672 341.083C88.0639 340.886 88.3198 340.745 88.6349 340.66C88.9501 340.574 89.2781 340.531 89.6189 340.531C90.0922 340.531 90.4606 340.624 90.7239 340.81C90.9872 340.996 91.1189 341.223 91.1189 341.49Z",
    },
    send: {
        vb: 20,
        t: "translate(-15.266,-49.849) rotate(20) translate(-110.745,-296.844)",
        d: "M150.998 351.823C150.645 351.952 150.303 351.938 149.971 351.783C149.639 351.628 149.409 351.375 149.28 351.022L146.376 343.042C146.248 342.689 146.261 342.348 146.417 342.018C146.572 341.688 146.826 341.458 147.179 341.33L158.913 337.059C159.265 336.931 159.607 336.944 159.94 337.099C160.272 337.254 160.502 337.508 160.63 337.861L163.535 345.841C163.663 346.194 163.65 346.535 163.494 346.865C163.338 347.195 163.084 347.424 162.732 347.552L150.998 351.823ZM155.302 344.851C155.346 344.813 155.392 344.768 155.44 344.717L159.734 339.508C159.803 339.42 159.841 339.318 159.849 339.202C159.856 339.086 159.832 338.975 159.776 338.868C159.693 338.673 159.544 338.563 159.327 338.538C159.109 338.513 158.926 338.586 158.776 338.758L154.692 343.717L148.402 342.556C148.182 342.519 147.991 342.575 147.83 342.725C147.669 342.874 147.618 343.054 147.678 343.263C147.701 343.374 147.756 343.472 147.844 343.557C147.932 343.642 148.032 343.699 148.143 343.726L154.776 344.952C154.837 344.968 154.896 344.977 154.954 344.978C155.012 344.979 155.073 344.968 155.138 344.944C155.204 344.92 155.258 344.889 155.302 344.851Z",
    },
    face3: {
        vb: 20,
        vbox: "0 -960 960 960",
        d: "M480-240q134 0 227-93.5T800-560q0-31-5-59.5T779-675q-27 17-57 26t-62 9q-54 0-101.5-24.5T480-734q-31 45-78.5 69.5T300-640q-32 0-62-9t-57-26q-11 27-16 55.5t-5 59.5q0 133 93.5 226.5T480-240ZM360-470q21 0 35.5-14.5T410-520q0-21-14.5-35.5T360-570q-21 0-35.5 14.5T310-520q0 21 14.5 35.5T360-470Zm240 0q21 0 35.5-14.5T650-520q0-21-14.5-35.5T600-570q-21 0-35.5 14.5T550-520q0 21 14.5 35.5T600-470ZM88-80q-35 0-59-26T8-167l36-395q8-84 45.5-157t96-126.5q58.5-53.5 134-84T480-960q85 0 160.5 30.5t134 84Q833-792 870.5-719T916-562l36 395q3 35-21 61t-59 26H88Z",
    },
    arrowUp: {
        vb: 24,
        d: "M12 4.2c.28 0 .53.11.74.32l6.1 6.1a1 1 0 0 1-1.42 1.42L13 7.62V19a1 1 0 1 1-2 0V7.62l-4.42 4.42a1 1 0 0 1-1.42-1.42l6.1-6.1c.21-.21.46-.32.74-.32Z",
    },
    close: {
        vb: 24,
        d: "M6.4 5a1 1 0 0 0-.7 1.7l5.3 5.3-5.3 5.3a1 1 0 1 0 1.4 1.4l5.3-5.3 5.3 5.3a1 1 0 0 0 1.4-1.4L13.8 12l5.3-5.3a1 1 0 0 0-1.4-1.4L12.4 10.6 7.1 5.3A1 1 0 0 0 6.4 5Z",
    },
    dot: {
        vb: 24,
        d: "M12 5.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13Z",
    },
}
type IconName = keyof typeof ICONS

// ── Motion specs ─────────────────────────────────────────────────────────────
const EASE_OUT = "cubic-bezier(0.22, 1, 0.36, 1)"
const EASE_BLOOM = "cubic-bezier(0.34, 1.42, 0.64, 1)"
const EASE_IN = "cubic-bezier(0.55, 0, 0.85, 0.35)"
const HOVER_T = `transform 260ms ${EASE_OUT}, background-color 260ms ${EASE_OUT}`

type PhaseName = "seedBottom" | "hero" | "retractDown" | "seedTop" | "docked" | "retractUp"

type Phase = {
    dir: 1 | -1 // 1 = stem to the bottom edge, head grows up. -1 = mirrored.
    place: "hero" | "docked" | "belowBottom" | "aboveTop"
    size: "hero" | "docked" | "seed"
    open: boolean // petals fanned out, or folded shut
}

const PHASES: Record<PhaseName, Phase> = {
    seedBottom: { dir: 1, place: "belowBottom", size: "seed", open: false },
    hero: { dir: 1, place: "hero", size: "hero", open: true },
    retractDown: { dir: 1, place: "belowBottom", size: "docked", open: false },
    seedTop: { dir: -1, place: "aboveTop", size: "seed", open: false },
    docked: { dir: -1, place: "docked", size: "docked", open: true },
    retractUp: { dir: -1, place: "aboveTop", size: "docked", open: false },
}

type Item = {
    label?: string
    icon?: IconName
    link?: string
}

// Accessible name for each petal, derived from its icon.
const LABELS: Record<IconName, string> = {
    home: "Home",
    face3: "About",
    draw: "Work",
    send: "Contact",
    arrowUp: "Back to top",
    close: "Close",
    dot: "Menu",
}

// An email petal is always "Contact", whichever glyph is sitting in it.
const labelFor = (icon: IconName, link?: string) =>
    /^mailto:/i.test((link || "").trim()) ? "Contact" : LABELS[icon]

type Props = {
    mode?: "home" | "project"
    leftLink?: string
    leftIcon?: IconName
    midLink?: string
    midIcon?: IconName
    rightLink?: string
    rightIcon?: IconName
    petalColor?: string
    petalHoverColor?: string
    iconColor?: string
    stemColor?: string
    heroScale?: number
    dockedScale?: number
    heroPosition?: number
    dockedOffset?: number
    splay?: number
    petalWidth?: number
    petalHeight?: number
    spacing?: number
    stemWidth?: number
    iconScale?: number
    dockSection?: string
    dockAt?: number
    startDelay?: number
    growDuration?: number
    retractDuration?: number
    sproutDuration?: number
    zIndex?: number
    style?: React.CSSProperties
}

/**
 * @framerIntrinsicWidth 240
 * @framerIntrinsicHeight 300
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 * @framerDisableUnlink
 */
export default function FlowerConsole(props: Props) {
    const {
        mode = "home",
        leftLink = "/",
        leftIcon = "home",
        midLink = "/#work",
        midIcon = "draw",
        rightLink = "",
        rightIcon = "face3",
        petalColor = "#D8FF85",
        petalHoverColor = "#CDFF5C",
        iconColor = "rgba(28, 27, 31, 0.7)",
        stemColor = "#D8FF85",
        heroScale = 1.6,
        dockedScale = 1,
        heroPosition = 0.38,
        dockedOffset = 0,
        splay = 20,
        petalWidth = D.petalW,
        petalHeight = D.petalH,
        spacing = D.spacing,
        stemWidth = D.stemW,
        iconScale = 1,
        dockSection = "#work",
        dockAt = 0.5,
        startDelay = 250,
        growDuration = 1000,
        retractDuration = 420,
        sproutDuration = 780,
        zIndex = 500,
        style,
    } = props

    const items: Item[] = useMemo(
        () => [
            { icon: leftIcon, link: leftLink, label: labelFor(leftIcon, leftLink) },
            { icon: midIcon, link: midLink, label: labelFor(midIcon, midLink) },
            { icon: rightIcon, link: rightLink, label: labelFor(rightIcon, rightLink) },
        ],
        [leftIcon, leftLink, midIcon, midLink, rightIcon, rightLink]
    )

    const isStatic = useMemo(() => {
        const t = RenderTarget.current()
        return t === RenderTarget.canvas || t === RenderTarget.thumbnail
    }, [])

    // ── Viewport ─────────────────────────────────────────────────────────────
    const [vp, setVp] = useState({ w: 0, h: 0 })
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        const measure = () =>
            setVp({ w: window.innerWidth, h: window.innerHeight })
        measure()
        window.addEventListener("resize", measure)
        return () => window.removeEventListener("resize", measure)
    }, [])

    const reduced = useMemo(() => {
        if (typeof window === "undefined" || !window.matchMedia) return false
        return window.matchMedia("(prefers-reduced-motion: reduce)").matches
    }, [])

    // ── Phase machine ────────────────────────────────────────────────────────
    const [livePhase, setPhase] = useState<PhaseName>("seedBottom")
    const [animating, setAnimating] = useState(false)
    const [scrolledPastHero, setScrolledPastHero] = useState(false)
    // A project page has no hero state — the console just hangs from the top.
    const docked = mode === "project" ? true : scrolledPastHero
    const timers = useRef<number[]>([])

    const clearTimers = useCallback(() => {
        timers.current.forEach((t) => window.clearTimeout(t))
        timers.current = []
    }, [])

    const after = useCallback((ms: number, fn: () => void) => {
        timers.current.push(window.setTimeout(fn, ms))
    }, [])

    // Entrance, and every hero <-> docked transition, in one place.
    const started = useRef(false)
    useEffect(() => {
        if (isStatic || !mounted) return
        clearTimers()
        const target: PhaseName = docked ? "docked" : "hero"

        if (reduced) {
            setPhase(target)
            return
        }

        // First run: sit below (or above) the frame, then sprout in.
        if (!started.current) {
            started.current = true
            setPhase(docked ? "seedTop" : "seedBottom")
            after(Math.max(16, startDelay), () => {
                setPhase(target)
                setAnimating(true)
                after(growDuration + 400, () => setAnimating(false))
            })
            return clearTimers
        }

        // Retract out of frame, flip the anchored edge, sprout back in.
        setAnimating(true)
        setPhase(docked ? "retractDown" : "retractUp")
        after(retractDuration, () => {
            setPhase(docked ? "seedTop" : "seedBottom")
            // one frame with transitions off, so the flip isn't animated
            requestAnimationFrame(() =>
                requestAnimationFrame(() => {
                    setPhase(target)
                    after(sproutDuration + 400, () => setAnimating(false))
                })
            )
        })
        return clearTimers
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [docked, mounted, isStatic, reduced])

    // ── Scroll watching (home only) ──────────────────────────────────────────
    useEffect(() => {
        if (isStatic || !mounted || mode === "project") return
        let raf = 0
        const read = () => {
            raf = 0
            const h = window.innerHeight
            if (!h) return // hidden / detached frame — don't flip state on a 0-height viewport
            const el = resolveTarget(dockSection)
            let next: boolean
            if (el) {
                const top = el.getBoundingClientRect().top
                // hysteresis, so a slow scroll can't flap the transition
                next = docked ? top <= h * (dockAt + 0.15) : top <= h * dockAt
            } else {
                const y = window.scrollY || window.pageYOffset || 0
                next = docked ? y > h * 0.2 : y > h * 0.35
            }
            if (next !== docked) setScrolledPastHero(next)
        }
        const onScroll = () => {
            if (!raf) raf = requestAnimationFrame(read)
        }
        read()
        window.addEventListener("scroll", onScroll, { passive: true })
        window.addEventListener("resize", onScroll)
        return () => {
            if (raf) cancelAnimationFrame(raf)
            window.removeEventListener("scroll", onScroll)
            window.removeEventListener("resize", onScroll)
        }
    }, [isStatic, mounted, mode, docked, dockSection, dockAt])

    // ── Resolve the current phase into numbers ───────────────────────────────
    // On the canvas there is no animation, so draw the pose it comes to rest in.
    const restPhase: PhaseName = mode === "project" ? "docked" : "hero"
    const phase = isStatic ? restPhase : livePhase
    const p = PHASES[phase]
    // A seed is 55% of whatever size it is about to bloom into.
    const scale =
        p.size === "hero"
            ? heroScale
            : p.size === "docked"
              ? dockedScale
              : (p.dir === 1 ? heroScale : dockedScale) * 0.55

    const headReach = petalHeight + petalWidth * 0.5 + 24 // vertical extent of the head
    const jointY = (() => {
        switch (p.place) {
            case "hero":
                return vp.h * (1 - heroPosition)
            case "docked":
                return dockedOffset
            case "belowBottom":
                return vp.h + headReach * scale
            case "aboveTop":
                return -headReach * scale
        }
    })()

    const openAmount = p.open ? 1 : 0.12

    // Per-phase transition timings
    const spec = (() => {
        if (phase === "seedBottom" || phase === "seedTop")
            return { pos: "none", scale: "none", petal: () => "none" }
        if (phase === "retractDown" || phase === "retractUp")
            return {
                pos: `transform ${retractDuration}ms ${EASE_IN}`,
                scale: `transform ${retractDuration}ms ${EASE_IN}`,
                petal: () => `transform ${retractDuration * 0.75}ms ${EASE_IN}`,
            }
        const dur = phase === "hero" ? growDuration : sproutDuration
        return {
            pos: `transform ${dur}ms ${EASE_OUT}`,
            scale: `transform ${dur * 0.82}ms ${dur * 0.24}ms ${EASE_BLOOM}`,
            petal: (i: number) =>
                `transform ${dur * 0.68}ms ${dur * 0.34 + i * 70}ms ${EASE_BLOOM}`,
        }
    })()

    const flower = (
        <Flower
            items={items}
            dir={p.dir}
            openAmount={openAmount}
            animating={animating}
            petalColor={petalColor}
            petalHoverColor={petalHoverColor}
            iconColor={iconColor}
            stemColor={stemColor}
            splay={splay}
            petalWidth={petalWidth}
            petalHeight={petalHeight}
            spacing={spacing}
            stemWidth={stemWidth}
            iconScale={iconScale}
            petalTransition={spec.petal}
        />
    )

    // ── Canvas: a static, in-frame preview so the layer is visible in Framer ──
    if (isStatic) {
        return (
            <div
                style={{
                    ...style,
                    position: "relative",
                    overflow: "hidden",
                    display: "flex",
                }}
            >
                <div
                    style={{
                        position: "absolute",
                        left: "50%",
                        // hangs from the top of the frame on a project page,
                        // grows from the bottom of it on the home page
                        top: mode === "project" ? 0 : undefined,
                        bottom: mode === "project" ? undefined : 0,
                        width: 0,
                        height: 0,
                        transform: `scale(${
                            mode === "project" ? dockedScale : heroScale
                        })`,
                        transformOrigin: "0 0",
                    }}
                >
                    {flower}
                </div>
            </div>
        )
    }

    if (!mounted || typeof document === "undefined") return null

    return createPortal(
        <div
            style={{
                position: "fixed",
                inset: 0,
                overflow: "hidden",
                pointerEvents: "none",
                zIndex,
            }}
            aria-hidden={false}
        >
            <div
                style={{
                    position: "absolute",
                    left: "50%",
                    top: 0,
                    width: 0,
                    height: 0,
                    transform: `translate3d(0, ${jointY}px, 0)`,
                    transition: spec.pos,
                    willChange: "transform",
                }}
            >
                <div
                    style={{
                        position: "absolute",
                        left: 0,
                        top: 0,
                        width: 0,
                        height: 0,
                        transform: `scale(${scale})`,
                        transformOrigin: "0 0",
                        transition: spec.scale,
                        willChange: "transform",
                    }}
                >
                    {flower}
                </div>
            </div>
        </div>,
        document.body
    )
}

// ── The flower itself, drawn around a joint point at local (0, 0) ────────────
function Flower({
    items,
    dir,
    openAmount,
    animating,
    petalColor,
    petalHoverColor,
    iconColor,
    stemColor,
    splay,
    petalWidth,
    petalHeight,
    spacing,
    stemWidth,
    iconScale,
    petalTransition,
}: {
    items: Item[]
    dir: 1 | -1
    openAmount: number
    animating: boolean
    petalColor: string
    petalHoverColor: string
    iconColor: string
    stemColor: string
    splay: number
    petalWidth: number
    petalHeight: number
    spacing: number
    stemWidth: number
    iconScale: number
    petalTransition: (i: number) => string
}) {
    const list = items
    const mid = (list.length - 1) / 2

    const flare = (D.flareW / D.stemW) * stemWidth
    const calyxOut = (D.calyxOut / D.stemW) * stemWidth
    const calyxIn = (D.calyxIn / D.stemW) * stemWidth

    return (
        <>
            {/* stem — drawn over-long, clipped by the fixed layer */}
            <div
                style={{
                    position: "absolute",
                    left: -stemWidth / 2,
                    top: dir === 1 ? calyxIn : -(calyxIn + STEM_RUN),
                    width: stemWidth,
                    height: STEM_RUN,
                    background: stemColor,
                }}
            />

            {list.map((item, i) => (
                <Petal
                    key={i}
                    index={i}
                    item={item}
                    dir={dir}
                    x={(i - mid) * spacing}
                    lift={i === mid ? 0 : D.outerLift}
                    angle={(i - mid) * splay * dir * openAmount}
                    petalColor={petalColor}
                    petalHoverColor={petalHoverColor}
                    iconColor={iconColor}
                    petalWidth={petalWidth}
                    petalHeight={petalHeight}
                    iconScale={iconScale}
                    transition={
                        animating ? petalTransition(i) : HOVER_T
                    }
                />
            ))}

            {/* calyx — the flared cup where the stem meets the petals */}
            <svg
                viewBox={`0 0 ${flare} ${calyxOut + calyxIn}`}
                width={flare}
                height={calyxOut + calyxIn}
                style={{
                    position: "absolute",
                    left: -flare / 2,
                    top: dir === 1 ? -calyxOut : -calyxIn,
                    transform: dir === 1 ? undefined : "scaleY(-1)",
                    pointerEvents: "none",
                    overflow: "visible",
                }}
            >
                <path d={calyxPath(flare, calyxOut, calyxIn, stemWidth)} fill={stemColor} />
            </svg>
        </>
    )
}

function Petal({
    index,
    item,
    dir,
    x,
    lift,
    angle,
    petalColor,
    petalHoverColor,
    iconColor,
    petalWidth,
    petalHeight,
    iconScale,
    transition,
}: {
    index: number
    item: Item
    dir: 1 | -1
    x: number
    lift: number
    angle: number
    petalColor: string
    petalHoverColor: string
    iconColor: string
    petalWidth: number
    petalHeight: number
    iconScale: number
    transition: string
}) {
    const [hover, setHover] = useState(false)
    const [press, setPress] = useState(false)

    const pivotY = dir === 1 ? -lift : lift
    const icon = ICONS[(item.icon as IconName) || "dot"] || ICONS.dot
    const size = icon.vb * iconScale
    const cx = (D.iconCx / D.petalW) * petalWidth
    const cy = (D.iconCy / D.petalH) * petalHeight

    const href = (item.link || "").trim()
    const external = /^https?:\/\//i.test(href) && !href.startsWith(window?.location?.origin ?? "\u0000")
    // A real <a> so Framer's router handles page changes (and so cmd-click,
    // middle-click and "copy link address" behave the way people expect).
    const Tag: any = href ? "a" : "button"

    return (
        <Tag
            {...(href
                ? {
                      href,
                      target: external ? "_blank" : undefined,
                      rel: external ? "noopener noreferrer" : undefined,
                  }
                : { type: "button" })}
            aria-label={item.label || `Nav ${index + 1}`}
            title={item.label || undefined}
            onClick={(e: React.MouseEvent) => handleClick(e, href)}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => {
                setHover(false)
                setPress(false)
            }}
            onPointerDown={() => setPress(true)}
            onPointerUp={() => setPress(false)}
            style={{
                position: "absolute",
                left: x - petalWidth / 2,
                top: dir === 1 ? pivotY - petalHeight : pivotY,
                width: petalWidth,
                height: petalHeight,
                padding: 0,
                border: "none",
                borderRadius: petalWidth / 2,
                background: hover ? petalHoverColor : petalColor,
                color: iconColor,
                display: "block",
                textDecoration: "none",
                cursor: "pointer",
                pointerEvents: "auto",
                transformOrigin: dir === 1 ? "50% 100%" : "50% 0%",
                transform: `rotate(${angle}deg) scale(${press ? 0.965 : hover ? 1.045 : 1})`,
                transition,
                WebkitTapHighlightColor: "transparent",
            }}
        >
            <svg
                viewBox={icon.vbox || `0 0 ${icon.vb} ${icon.vb}`}
                width={size}
                height={size}
                style={{
                    position: "absolute",
                    left: cx - size / 2,
                    top: cy - size / 2,
                    display: "block",
                    pointerEvents: "none",
                }}
            >
                <g transform={icon.t}>
                    <path d={icon.d} fill="currentColor" />
                </g>
            </svg>
        </Tag>
    )
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function calyxPath(flare: number, out: number, into: number, stemW: number) {
    // Traced from the source path: a flared cup, wide edge meeting the petals,
    // narrowing to exactly the stem width.
    const hw = flare / 2
    const hn = stemW / 2
    const yTop = 0
    const yBot = out + into
    const c1x = hw * 0.5187
    const c1y = out * 0.4391
    const c2x = hw * 0.3861
    const c2y = out * 0.9883
    return [
        `M 0 ${yTop}`,
        `L ${flare} ${yTop}`,
        `C ${hw + c1x} ${c1y} ${hw + c2x} ${c2y} ${hw + hn} ${yBot}`,
        `L ${hw - hn} ${yBot}`,
        `C ${hw - c2x} ${c2y} ${hw - c1x} ${c1y} 0 ${yTop}`,
        "Z",
    ].join(" ")
}

function resolveTarget(sel?: string): Element | null {
    if (!sel || typeof document === "undefined") return null
    const s = sel.trim()
    if (!s) return null
    try {
        if (s.startsWith("#") || s.startsWith(".") || s.startsWith("["))
            return document.querySelector(s)
        return document.getElementById(s) || document.querySelector(s)
    } catch {
        return null
    }
}

/**
 * One rule for both modes, so a petal needs only one setting:
 *
 *   • mailto: / tel: / another site  → let the browser do its normal thing
 *   • a different page on this site  → let the <a> through, so Framer's router
 *                                      handles it as a client-side page change
 *   • THIS page, with a #hash        → smooth-scroll to that section
 *   • THIS page, no hash             → smooth-scroll back to the top
 *
 * So a Work petal pointing at `/#work` scrolls down on the home page, and
 * navigates home-then-to-the-work-section from a project page. Same setting.
 */
function handleClick(e: React.MouseEvent, href: string) {
    if (!href) {
        e.preventDefault()
        return
    }
    // let modified clicks (new tab, download, ...) behave normally
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || (e as any).button > 0)
        return
    if (/^(mailto:|tel:|sms:)/i.test(href)) return

    let url: URL
    try {
        url = new URL(href, window.location.href)
    } catch {
        return
    }
    if (url.origin !== window.location.origin) return // another site

    const norm = (path: string) => path.replace(/\/+$/, "") || "/"
    if (norm(url.pathname) !== norm(window.location.pathname)) return // Framer routes it

    // Same page — scroll rather than reload.
    e.preventDefault()
    if (url.hash) {
        const el = resolveTarget(url.hash)
        if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" })
            return
        }
    }
    window.scrollTo({ top: 0, behavior: "smooth" })
}

// ── Property controls ────────────────────────────────────────────────────────
const isProject = (p: any) => p.mode === "project"

addPropertyControls(FlowerConsole, {
    mode: {
        type: ControlType.Enum,
        title: "Mode",
        description:
            "Home: sprouts from the bottom, then docks to the top at the work section. Project page: just hangs from the top.",
        options: ["home", "project"],
        optionTitles: ["Home page", "Project page"],
        displaySegmentedControl: true,
        defaultValue: "home",
    },

    // ── Links ────────────────────────────────────────────────────────────
    // Plain text, typed by hand. Paste a Framer path ("/", "/work/ash"), a
    // section on a page ("/#work"), a full URL, or a mailto: address.
    leftLink: {
        type: ControlType.String,
        title: "Left link",
        placeholder: "/",
        defaultValue: "/",
        description:
            "A link to a section of the page you're already on smooth-scrolls instead of reloading. Leave blank for a petal that does nothing.",
    },
    midLink: {
        type: ControlType.String,
        title: "Middle link",
        placeholder: "/#work",
        defaultValue: "/#work",
    },
    rightLink: {
        type: ControlType.String,
        title: "Right link",
        placeholder: "mailto:you@example.com",
        defaultValue: "",
    },

    leftIcon: {
        type: ControlType.Enum,
        title: "Left icon",
            options: ["home", "draw", "send", "face3", "arrowUp", "close", "dot"],
            optionTitles: ["Home", "Draw", "Send", "Face", "Arrow up", "Close", "Dot"],
        defaultValue: "home",
    },
    midIcon: {
        type: ControlType.Enum,
        title: "Middle icon",
            options: ["home", "draw", "send", "face3", "arrowUp", "close", "dot"],
            optionTitles: ["Home", "Draw", "Send", "Face", "Arrow up", "Close", "Dot"],
        defaultValue: "draw",
    },
    rightIcon: {
        type: ControlType.Enum,
        title: "Right icon",
            options: ["home", "draw", "send", "face3", "arrowUp", "close", "dot"],
            optionTitles: ["Home", "Draw", "Send", "Face", "Arrow up", "Close", "Dot"],
        defaultValue: "face3",
    },

    petalColor: { type: ControlType.Color, title: "Petal", defaultValue: "#D8FF85" },
    petalHoverColor: { type: ControlType.Color, title: "Hover", defaultValue: "#CDFF5C" },
    iconColor: { type: ControlType.Color, title: "Icon", defaultValue: "rgba(28, 27, 31, 0.7)" },
    stemColor: { type: ControlType.Color, title: "Stem", defaultValue: "#D8FF85" },

    heroScale: {
        type: ControlType.Number,
        title: "Hero size",
        min: 0.2, max: 4, step: 0.05, defaultValue: 1.6,
        hidden: isProject,
    },
    dockedScale: {
        type: ControlType.Number,
        title: "Size (docked)",
        min: 0.2, max: 3, step: 0.05, defaultValue: 1,
    },
    heroPosition: {
        type: ControlType.Number,
        title: "Hero height",
        description: "Where the joint sits, as a share of the viewport measured up from the bottom.",
        min: 0, max: 1, step: 0.01, defaultValue: 0.38,
        hidden: isProject,
    },
    dockedOffset: {
        type: ControlType.Number,
        title: "Docked drop",
        description: "Distance the docked joint hangs below the top edge.",
        min: -200, max: 400, step: 1, defaultValue: 0,
    },

    splay: { type: ControlType.Number, title: "Splay", min: 0, max: 45, step: 1, defaultValue: 20, unit: "°" },
    petalWidth: { type: ControlType.Number, title: "Petal W", min: 20, max: 160, step: 1, defaultValue: D.petalW },
    petalHeight: { type: ControlType.Number, title: "Petal H", min: 30, max: 240, step: 1, defaultValue: D.petalH },
    spacing: { type: ControlType.Number, title: "Spacing", min: 10, max: 160, step: 0.05, defaultValue: D.spacing },
    stemWidth: { type: ControlType.Number, title: "Stem", min: 1, max: 40, step: 0.01, defaultValue: D.stemW },
    iconScale: { type: ControlType.Number, title: "Icon size", min: 0.4, max: 2.5, step: 0.05, defaultValue: 1 },

    dockSection: {
        type: ControlType.String,
        title: "Work section",
        description: "CSS selector or element ID of the section that triggers docking.",
        defaultValue: "#work",
        hidden: isProject,
    },
    dockAt: {
        type: ControlType.Number,
        title: "Dock at",
        description: "Docks once the section's top passes this share of the viewport.",
        min: 0, max: 1, step: 0.05, defaultValue: 0.5,
        hidden: isProject,
    },

    startDelay: { type: ControlType.Number, title: "Start delay", min: 0, max: 3000, step: 50, defaultValue: 250, unit: "ms" },
    growDuration: { type: ControlType.Number, title: "Grow", min: 200, max: 3000, step: 50, defaultValue: 1000, unit: "ms", hidden: isProject },
    retractDuration: { type: ControlType.Number, title: "Retract", min: 100, max: 2000, step: 20, defaultValue: 420, unit: "ms", hidden: isProject },
    sproutDuration: { type: ControlType.Number, title: "Re-sprout", min: 200, max: 3000, step: 20, defaultValue: 780, unit: "ms" },

    zIndex: { type: ControlType.Number, title: "z-index", min: 0, max: 10000, step: 1, defaultValue: 500 },
})
