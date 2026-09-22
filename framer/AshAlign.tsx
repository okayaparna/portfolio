import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

/**
 * ASH ALIGN — case study section components
 * ─────────────────────────────────────────────────────────────────────────────
 * Seven components for the Ash Align case study page. Each is a separate
 * draggable component in Framer; stack them in a page Stack in this order:
 *
 *   CaseStudyHero → SectionHead → SystemLedger → SectionHead → PromptChain
 *   → Callout → SectionHead → SignalGrid → SectionHead → ParticipationLoop
 *   → FigureRow
 *
 * Running prose between them is plain Framer text layers, so it stays editable
 * on canvas. The copy for those blocks is in `AshAlign.copy.md`.
 *
 * Every component ships with the real case study content as its defaults, so
 * dropping one on the canvas renders the finished section immediately — no
 * empty shells to fill in.
 *
 * TOKENS ─────────────────────────────────────────────────────────────────────
 * Colours and type are lifted from `src/project.css` in the portfolio repo
 * (the same system the HTML case studies use), so this matches the existing
 * project pages rather than inventing a second look. If the Framer project has
 * drifted from that, retune TOKENS below — it is the only place they're set.
 */

// ── Design tokens, from src/project.css ──────────────────────────────────────
export const TOKENS = {
    bg: "#FBFAF7",
    ink: "#6B5F76",
    inkMuted: "#A89FB0",
    lilac2: "#E8DDF0", // wash
    lilac3: "#D8C7E4", // rule
    lilac4: "#B6A0C8", // accent

    serif: "'ABC Arizona Flare', Georgia, serif",
    sans: "'ABC Diatype', 'Manrope', -apple-system, BlinkMacSystemFont, sans-serif",
    mono: "'Iosevka Charon Mono', 'SF Mono', ui-monospace, monospace",

    // Type scale, from .project__title / .project__content h2 / .project__pullquote
    titleSize: 36,
    headingSize: 24,
    quoteSize: 28,
    bodySize: 16,
    metaSize: 14,
    labelSize: 12,
}

const T = TOKENS

// Shared bits ────────────────────────────────────────────────────────────────
const label: React.CSSProperties = {
    fontFamily: T.sans,
    fontSize: T.labelSize,
    color: T.inkMuted,
    margin: 0,
}

const mono: React.CSSProperties = {
    fontFamily: T.mono,
    fontSize: 11,
    letterSpacing: "0.11em",
    textTransform: "uppercase",
    margin: 0,
}

const body: React.CSSProperties = {
    fontFamily: T.sans,
    fontSize: T.bodySize,
    lineHeight: 1.6,
    color: T.ink,
    margin: 0,
    fontWeight: 300,
}

const col = (gap: number): React.CSSProperties => ({
    display: "flex",
    flexDirection: "column",
    gap,
})

/** Cells sharing one hairline grid — the 1px gap on a rule-coloured ground. */
const gridBox = (min: number): React.CSSProperties => ({
    display: "grid",
    gridTemplateColumns: `repeat(auto-fit, minmax(${min}px, 1fr))`,
    gap: 1,
    background: T.lilac3,
    border: `1px solid ${T.lilac3}`,
    width: "100%",
})

const cell: React.CSSProperties = {
    background: T.bg,
    padding: "20px 20px 22px",
    ...col(8),
}

/* ═══════════════════════════════════════════════════════════════════════════
   1. SECTION HEAD — eyebrow + serif heading. Use above each section.
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 */
export function SectionHead(props) {
    const { eyebrow, heading, maxWidth } = props
    return (
        <div style={{ ...col(12), width: "100%" }}>
            {eyebrow ? <p style={label}>{eyebrow}</p> : null}
            <h2
                style={{
                    fontFamily: T.serif,
                    fontSize: T.headingSize,
                    fontWeight: 300,
                    lineHeight: 1.3,
                    color: T.ink,
                    letterSpacing: "-0.2px",
                    margin: 0,
                    maxWidth,
                    textWrap: "balance",
                }}
            >
                {heading}
            </h2>
        </div>
    )
}

SectionHead.defaultProps = {
    eyebrow: "Evolving the system",
    heading: "Every component we had assumed one person was talking",
    maxWidth: 560,
}

addPropertyControls(SectionHead, {
    eyebrow: { type: ControlType.String, title: "Eyebrow" },
    heading: { type: ControlType.String, title: "Heading", displayTextArea: true },
    maxWidth: { type: ControlType.Number, title: "Max width", min: 240, max: 1200, step: 20 },
})

/* ═══════════════════════════════════════════════════════════════════════════
   2. CASE STUDY HERO — question frame, title, standfirst, facts row
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 */
export function CaseStudyHero(props) {
    const { showQuestion, questionLabel, question, title, standfirst, facts } = props

    return (
        <div style={{ ...col(36), width: "100%" }}>
            {showQuestion ? (
                <div
                    style={{
                        border: `1px solid ${T.lilac3}`,
                        background: T.lilac2,
                        padding: "18px 22px",
                        maxWidth: 640,
                        ...col(10),
                    }}
                >
                    <p style={{ ...mono, color: T.lilac4 }}>{questionLabel}</p>
                    <p
                        style={{
                            fontFamily: T.serif,
                            fontSize: 17,
                            lineHeight: 1.45,
                            fontStyle: "italic",
                            color: T.ink,
                            margin: 0,
                        }}
                    >
                        {question}
                    </p>
                </div>
            ) : null}

            <div style={col(20)}>
                <h1
                    style={{
                        fontFamily: T.serif,
                        fontSize: T.titleSize * 1.8,
                        fontWeight: 400,
                        lineHeight: 1.05,
                        letterSpacing: "-1.2px",
                        color: T.ink,
                        margin: 0,
                        textWrap: "balance",
                    }}
                >
                    {title}
                </h1>
                <p style={{ ...body, fontSize: 19, lineHeight: 1.5, maxWidth: 620 }}>
                    {standfirst}
                </p>
            </div>

            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "22px 40px",
                    borderTop: `1px solid ${T.lilac3}`,
                    borderBottom: `1px solid ${T.lilac3}`,
                    padding: "22px 0",
                    width: "100%",
                }}
            >
                {(facts ?? []).map((f, i) => (
                    <div key={i} style={col(4)}>
                        <p style={label}>{f.label}</p>
                        <p
                            style={{
                                fontFamily: T.sans,
                                fontSize: T.metaSize,
                                lineHeight: 1.4,
                                letterSpacing: "-0.1px",
                                color: T.ink,
                                margin: 0,
                            }}
                        >
                            {f.value}
                        </p>
                    </div>
                ))}
            </div>
        </div>
    )
}

CaseStudyHero.defaultProps = {
    showQuestion: true,
    questionLabel: "The question",
    question:
        "Describe a time you used front-end code or AI prompting to explore or communicate a design idea, leveraging or evolving an existing design system. What did you build, and how did it shape the outcome?",
    title: "Prompting a Mediator",
    standfirst:
        "I built and shipped Ash Align — a web session where two people work through a conflict with an AI mediating between them — as a front-end prototype living outside our mobile app, borrowing its design system and stretching it to hold a second person.",
    facts: [
        {
            label: "Role",
            value: "Product designer — flow, UI, prompt architecture, front-end changes, analytics",
        },
        { label: "Timeline", value: "Three weeks, March 2026" },
        {
            label: "Built with",
            value: "Figma, Claude Code, PostHog, Loops",
        },
        { label: "Shipped to", value: "~1,000 targeted users, plus organic social" },
    ],
}

addPropertyControls(CaseStudyHero, {
    showQuestion: { type: ControlType.Boolean, title: "Question card", defaultValue: true },
    questionLabel: { type: ControlType.String, title: "Card label", hidden: (p) => !p.showQuestion },
    question: {
        type: ControlType.String,
        title: "Question",
        displayTextArea: true,
        hidden: (p) => !p.showQuestion,
    },
    title: { type: ControlType.String, title: "Title" },
    standfirst: { type: ControlType.String, title: "Standfirst", displayTextArea: true },
    facts: {
        type: ControlType.Array,
        title: "Facts",
        control: {
            type: ControlType.Object,
            controls: {
                label: { type: ControlType.String, title: "Label" },
                value: { type: ControlType.String, title: "Value", displayTextArea: true },
            },
        },
    },
})

/* ═══════════════════════════════════════════════════════════════════════════
   3. SYSTEM LEDGER — reused / extended / created new
   The centrepiece: three columns, each a verb, a rationale, and its components.
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 */
export function SystemLedger(props) {
    const { columns } = props
    return (
        <div style={gridBox(260)}>
            {(columns ?? []).map((c, i) => (
                <div key={i} style={{ ...cell, gap: 18 }}>
                    <div style={col(6)}>
                        <p style={{ ...mono, color: T.lilac4 }}>{c.verb}</p>
                        <p style={{ ...body, fontSize: 13, lineHeight: 1.5, color: T.inkMuted }}>
                            {c.rationale}
                        </p>
                    </div>
                    <div style={col(14)}>
                        {(c.items ?? []).map((it, j) => (
                            <div key={j} style={col(3)}>
                                <p
                                    style={{
                                        fontFamily: T.sans,
                                        fontSize: 15,
                                        fontWeight: 500,
                                        lineHeight: 1.35,
                                        color: T.ink,
                                        margin: 0,
                                    }}
                                >
                                    {it.name}
                                    {it.aside ? (
                                        <span style={{ color: T.inkMuted, fontWeight: 400 }}>
                                            {" "}
                                            — {it.aside}
                                        </span>
                                    ) : null}
                                </p>
                                <p style={{ ...body, fontSize: 13, lineHeight: 1.5 }}>{it.note}</p>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    )
}

SystemLedger.defaultProps = {
    columns: [
        {
            verb: "Reused as-is",
            rationale: "Same job, same meaning. Changing it would only cost us recognition.",
            items: [
                {
                    name: "Conversation thread",
                    aside: "",
                    note: "Ash's message rhythm, typing behaviour and input affordance carried over untouched. People who knew Ash recognised it instantly; people who didn't got a chat interface, which needs no teaching.",
                },
                {
                    name: "Brand and type scale",
                    aside: "",
                    note: "The wordmark, palette and type ramp came straight across, so a link from a stranger still read as the same product.",
                },
            ],
        },
        {
            verb: "Extended",
            rationale: "Existing pattern, new obligation. Kept the shape, changed what it carries.",
            items: [
                {
                    name: "“Before we begin” consent",
                    aside: "",
                    note: "The app's three-card disclosure, rewritten for two people. One checkbox covering age, terms and the sharing mechanic — every extra checkbox costs completions, and the cards above do the actual informing.",
                },
                {
                    name: "Speaker identity",
                    aside: "",
                    note: "A single-speaker thread needs no name colour. A three-party one does. Extended the palette with a per-participant colour so you can tell at a glance who Ash is addressing.",
                },
                {
                    name: "Onboarding survey",
                    aside: "",
                    note: "Placed after consent, before the private room, framed as helping Ash understand your relationship. Two 1–7 scales did double duty as outcome measure and as context Ash reads while mediating.",
                },
            ],
        },
        {
            verb: "Created new",
            rationale: "No existing pattern fits. Built deliberately, and audited afterwards.",
            items: [
                {
                    name: "Private room → Commons",
                    aside: "",
                    note: "A two-stage room model with a visible threshold between them. Nothing in a one-to-one product needed the idea of a conversation you enter together.",
                },
                {
                    name: "Guest entry",
                    aside: "",
                    note: "The invited partner has agreed to nothing and may not know what Ash is. A full parallel flow, with a splash written for curiosity rather than obligation.",
                },
                {
                    name: "Hand-raise",
                    aside: "didn't work",
                    note: "Confusing when permanently visible, with nowhere to hold the thought you were raising. The fix I specced — fade in after Ash responds, paired with a drafting space — is the version worth putting into the system. The first was a component we hadn't earned yet.",
                },
            ],
        },
    ],
}

addPropertyControls(SystemLedger, {
    columns: {
        type: ControlType.Array,
        title: "Columns",
        control: {
            type: ControlType.Object,
            controls: {
                verb: { type: ControlType.String, title: "Verb" },
                rationale: { type: ControlType.String, title: "Rationale", displayTextArea: true },
                items: {
                    type: ControlType.Array,
                    title: "Items",
                    control: {
                        type: ControlType.Object,
                        controls: {
                            name: { type: ControlType.String, title: "Name" },
                            aside: { type: ControlType.String, title: "Aside" },
                            note: { type: ControlType.String, title: "Note", displayTextArea: true },
                        },
                    },
                },
            },
        },
    },
})

/* ═══════════════════════════════════════════════════════════════════════════
   4. PROMPT CHAIN — the five-stage agentic pipeline
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 */
export function PromptChain(props) {
    const { stages, carriesLabel } = props
    return (
        <div style={{ width: "100%", borderTop: `1px solid ${T.lilac3}` }}>
            {(stages ?? []).map((s, i) => (
                <div
                    key={i}
                    style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(120px, 140px) minmax(0, 1fr)",
                        gap: "8px 32px",
                        padding: "18px 0",
                        borderBottom: `1px solid ${T.lilac3}`,
                    }}
                >
                    <div style={col(4)}>
                        <p style={{ ...mono, color: T.lilac4, fontVariantNumeric: "tabular-nums" }}>
                            Stage {String(i + 1).padStart(2, "0")}
                        </p>
                        <p style={{ fontFamily: T.mono, fontSize: 13, color: T.ink, margin: 0 }}>
                            {s.name}
                        </p>
                    </div>
                    <div style={col(8)}>
                        <p style={{ ...body, fontSize: 15, lineHeight: 1.55 }}>{s.description}</p>
                        {s.carries ? (
                            <p
                                style={{
                                    fontFamily: T.mono,
                                    fontSize: 11,
                                    color: T.inkMuted,
                                    lineHeight: 1.6,
                                    margin: 0,
                                }}
                            >
                                {carriesLabel}{" "}
                                <span style={{ color: T.lilac4 }}>{s.carries}</span>
                            </p>
                        ) : null}
                    </div>
                </div>
            ))}
        </div>
    )
}

PromptChain.defaultProps = {
    carriesLabel: "carries →",
    stages: [
        {
            name: "intake",
            description:
                "Three to five exchanges with one partner alone. Deliberately shallow — no advice, no reframing. It closes with a privacy check: is there anything you'd rather I didn't bring in?",
            carries: "raw perspective + explicit consent boundary",
        },
        {
            name: "summarize",
            description:
                "Compresses the intake into situation, feeling, need — and splits what's shareable from what isn't. One instruction did more work than any interface element: do not include anything that could be weaponized against them.",
            carries: "neutral summary, privacy-partitioned",
        },
        {
            name: "open",
            description:
                "The first thing both people see together. Names the themes from both sides without quoting either, then invites one specific person by name to speak first — whoever's summary suggests more unspoken hurt. Choosing who goes first is a design decision, and it's a sentence in a prompt.",
            carries: "shared framing + first turn",
        },
        {
            name: "mediate",
            description:
                "The Commons. Phase-aware — hearing each other, then deepening, then wrapping — with responses capped at two to four sentences so it facilitates rather than lectures. Every response ends with a turn tag naming who speaks next, which the interface reads to move the floor. The mediator's output is the state machine.",
            carries: "full transcript + turn control",
        },
        {
            name: "conclude",
            description:
                "Returns strict JSON: a short personal message plus exactly three themes. Constraining the model to a fixed shape is what let me design the summary screen as a real component instead of a container for whatever prose arrived.",
            carries: "3 themes, rendered as UI",
        },
    ],
}

addPropertyControls(PromptChain, {
    carriesLabel: { type: ControlType.String, title: "Carries label" },
    stages: {
        type: ControlType.Array,
        title: "Stages",
        control: {
            type: ControlType.Object,
            controls: {
                name: { type: ControlType.String, title: "Name" },
                description: {
                    type: ControlType.String,
                    title: "Description",
                    displayTextArea: true,
                },
                carries: { type: ControlType.String, title: "Carries" },
            },
        },
    },
})

/* ═══════════════════════════════════════════════════════════════════════════
   5. CALLOUT — accent-bar pull quote
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 */
export function Callout(props) {
    const { tag, quote, note, maxWidth } = props
    return (
        <div
            style={{
                borderLeft: `2px solid ${T.lilac4}`,
                padding: "2px 0 2px 24px",
                maxWidth,
                ...col(10),
            }}
        >
            {tag ? <p style={{ ...mono, color: T.lilac4 }}>{tag}</p> : null}
            <p
                style={{
                    fontFamily: T.serif,
                    fontSize: T.quoteSize,
                    fontWeight: 300,
                    lineHeight: 1.35,
                    color: T.ink,
                    margin: 0,
                    textWrap: "balance",
                }}
            >
                {quote}
            </p>
            {note ? <p style={{ ...body, fontSize: 15 }}>{note}</p> : null}
        </div>
    )
}

Callout.defaultProps = {
    tag: "What the transcripts taught me",
    quote: "Asking a good question is the safe move for a mediator. At fifteen minutes, safety reads as evasion.",
    note: "Users weren't saying Ash felt robotic — several said the opposite, and one said it outperformed their real therapist. They were saying it wouldn't commit. They wanted the pattern named out loud.",
    maxWidth: 680,
}

addPropertyControls(Callout, {
    tag: { type: ControlType.String, title: "Tag" },
    quote: { type: ControlType.String, title: "Quote", displayTextArea: true },
    note: { type: ControlType.String, title: "Note", displayTextArea: true },
    maxWidth: { type: ControlType.Number, title: "Max width", min: 240, max: 1200, step: 20 },
})

/* ═══════════════════════════════════════════════════════════════════════════
   6. SIGNAL GRID — motion and state, each tagged by the job it does
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 */
export function SignalGrid(props) {
    const { signals } = props
    return (
        <div style={gridBox(210)}>
            {(signals ?? []).map((s, i) => (
                <div key={i} style={cell}>
                    <p style={{ ...mono, color: T.lilac4, marginBottom: 2 }}>{s.job}</p>
                    <p
                        style={{
                            fontFamily: T.sans,
                            fontSize: 15,
                            fontWeight: 500,
                            color: T.ink,
                            margin: 0,
                        }}
                    >
                        {s.name}
                    </p>
                    <p style={{ ...body, fontSize: 13.5, lineHeight: 1.5 }}>{s.note}</p>
                </div>
            ))}
        </div>
    )
}

SignalGrid.defaultProps = {
    signals: [
        {
            job: "Guides attention",
            name: "Typing states",
            note: "“Is it thinking, or did it forget me?” — the single most destabilising silence in a mediated conversation.",
        },
        {
            job: "Confirms an action",
            name: "Threshold to The Commons",
            note: "Progress before the joint session opens, so hitting I'm ready visibly does something while you wait for someone who might be hours away.",
        },
        {
            job: "Paces the read",
            name: "Chunked opening",
            note: "Ash's first joint message carries both people's themes. Delivered whole it's a wall; broken into beats it lands as a person speaking.",
        },
        {
            job: "Orients",
            name: "Per-speaker colour",
            note: "Who is Ash talking to right now? In a two-party thread this has to be answerable without reading.",
        },
    ],
}

addPropertyControls(SignalGrid, {
    signals: {
        type: ControlType.Array,
        title: "Signals",
        control: {
            type: ControlType.Object,
            controls: {
                job: { type: ControlType.String, title: "Job" },
                name: { type: ControlType.String, title: "Name" },
                note: { type: ControlType.String, title: "Note", displayTextArea: true },
            },
        },
    },
})

/* ═══════════════════════════════════════════════════════════════════════════
   7. PARTICIPATION LOOP — steps with a shipped / designed status chip
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 */
export function ParticipationLoop(props) {
    const { steps, maxWidth } = props
    return (
        <div style={{ width: "100%", maxWidth, borderTop: `1px solid ${T.lilac3}` }}>
            {(steps ?? []).map((s, i) => (
                <div
                    key={i}
                    style={{
                        display: "grid",
                        gridTemplateColumns: "20px minmax(0, 1fr) auto",
                        gap: 14,
                        alignItems: "baseline",
                        padding: "13px 0",
                        borderBottom: `1px solid ${T.lilac2}`,
                    }}
                >
                    <span style={{ fontFamily: T.mono, fontSize: 12, color: T.lilac4 }}>→</span>
                    <p style={{ ...body, fontSize: 15, lineHeight: 1.5 }}>{s.text}</p>
                    <span
                        style={{
                            fontFamily: T.mono,
                            fontSize: 9.5,
                            letterSpacing: "0.11em",
                            textTransform: "uppercase",
                            whiteSpace: "nowrap",
                            padding: "3px 7px",
                            color: s.shipped ? T.lilac4 : T.inkMuted,
                            border: `1px solid ${s.shipped ? T.lilac4 : T.lilac3}`,
                        }}
                    >
                        {s.shipped ? "Shipped" : "Designed"}
                    </span>
                </div>
            ))}
        </div>
    )
}

ParticipationLoop.defaultProps = {
    maxWidth: 760,
    steps: [
        {
            text: "Ash suggests a session, or a user finds it directly — no account required for either person",
            shipped: true,
        },
        {
            text: "Inviter creates a space and shares a link. Guest pass by design, so “my partner doesn't use Ash” stops being a blocker",
            shipped: true,
        },
        {
            text: "Both complete private rooms on their own schedule, then meet in The Commons",
            shipped: true,
        },
        {
            text: "Session summary ends with a route into the Ash app to debrief solo — the paid product, reached through a free one",
            shipped: true,
        },
        {
            text: "Native share sheet instead of copy-link, since two thirds of users are on mobile",
            shipped: false,
        },
        {
            text: "“They're already in the room waiting for you” in the link preview — the strongest reason to open a link now",
            shipped: false,
        },
        {
            text: "A solo reflection prompt 24–48 hours later, and a referral moment for the couple who found it useful",
            shipped: false,
        },
    ],
}

addPropertyControls(ParticipationLoop, {
    maxWidth: { type: ControlType.Number, title: "Max width", min: 320, max: 1200, step: 20 },
    steps: {
        type: ControlType.Array,
        title: "Steps",
        control: {
            type: ControlType.Object,
            controls: {
                text: { type: ControlType.String, title: "Step", displayTextArea: true },
                shipped: { type: ControlType.Boolean, title: "Shipped", defaultValue: true },
            },
        },
    },
})

/* ═══════════════════════════════════════════════════════════════════════════
   8. FIGURE ROW — the outcome numbers
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 */
export function FigureRow(props) {
    const { figures, note } = props
    return (
        <div style={{ ...col(20), width: "100%" }}>
            <div
                style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
                    gap: "28px 32px",
                    width: "100%",
                }}
            >
                {(figures ?? []).map((f, i) => (
                    <div key={i} style={col(6)}>
                        <p
                            style={{
                                fontFamily: T.serif,
                                fontSize: 40,
                                fontWeight: 300,
                                lineHeight: 1,
                                letterSpacing: "-0.8px",
                                color: T.ink,
                                fontVariantNumeric: "tabular-nums",
                                margin: 0,
                            }}
                        >
                            {f.value}
                        </p>
                        <p style={{ ...body, fontSize: 13, lineHeight: 1.45, color: T.inkMuted }}>
                            {f.caption}
                        </p>
                    </div>
                ))}
            </div>
            {note ? (
                <p
                    style={{
                        fontFamily: T.mono,
                        fontSize: 12,
                        lineHeight: 1.65,
                        color: T.inkMuted,
                        margin: 0,
                    }}
                >
                    {note}
                </p>
            ) : null}
        </div>
    )
}

FigureRow.defaultProps = {
    note: "Self-reported, same session, no control arm, small n. I'd call that a signal worth chasing, not a result.",
    figures: [
        {
            value: "17",
            caption: "couples completed a full session, from one email to a targeted list of ~1,000",
        },
        {
            value: "24→36%",
            caption: "strongly agreeing “I am satisfied with this relationship,” before vs. after",
        },
        {
            value: "14→31%",
            caption: "strongly agreeing “we resolve disagreements effectively,” before vs. after",
        },
        {
            value: "5.5×",
            caption: "impression-to-follower ratio on one organic post — 13.7K impressions on ~2.5K connections",
        },
    ],
}

addPropertyControls(FigureRow, {
    note: { type: ControlType.String, title: "Note", displayTextArea: true },
    figures: {
        type: ControlType.Array,
        title: "Figures",
        control: {
            type: ControlType.Object,
            controls: {
                value: { type: ControlType.String, title: "Value" },
                caption: { type: ControlType.String, title: "Caption", displayTextArea: true },
            },
        },
    },
})
