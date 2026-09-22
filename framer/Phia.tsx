import * as React from "react"
import { addPropertyControls, ControlType } from "framer"

/**
 * PHIA REWARDS — case study section components
 * ─────────────────────────────────────────────────────────────────────────────
 * The same seven components as `AshAlign.tsx`, so the two case studies share
 * one grammar. Stack them in a page Stack in this order:
 *
 *   CaseStudyHero → SectionHead → SystemLedger → Callout → SectionHead
 *   → PromptChain → SectionHead → SignalGrid → SectionHead
 *   → ParticipationLoop → SectionHead → FigureRow
 *
 * Running prose and the per-section headings are in `Phia.copy.md`. Every
 * component ships with the real case study content as its defaults.
 *
 * Differences from AshAlign.tsx: the hero's question card is off by default
 * (this was a brief, not an interview answer), and ParticipationLoop's chip
 * labels are props — nothing here shipped, so it reads Designed / Next.
 *
 * TOKENS ─────────────────────────────────────────────────────────────────────
 * Identical to AshAlign.tsx, lifted from `src/project.css`.
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
    eyebrow: "What the market already does",
    heading: "Every rewards program I studied paid you back in more shopping",
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
    showQuestion: false,
    questionLabel: "The brief",
    question:
        "Design a rewards system for Phia that supports user autonomy, strengthens its sustainability story without forcing it, and sets it apart from apps that turn points into generic store credit.",
    title: "Points Without the Push",
    standfirst:
        "A rewards system and premium tier for Phia, the price-comparison shopping app, that pays out in access, repairs and community instead of more store credit — so the points a shopper earns never argue with the brand's case for buying less, and better.",
    facts: [
        {
            label: "Role",
            value: "Research, strategy and design — market analysis, tier model, pricing logic, flows",
        },
        { label: "Timeline", value: "Late 2025" },
        {
            label: "Built with",
            value: "Figma, Notion",
        },
        { label: "Status", value: "Proposal — key premium flows designed in Figma" },
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
   3. SYSTEM LEDGER — borrowed / kept, demoted / created new
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
            verb: "Borrowed",
            rationale: "Proven mechanics from outside fashion. Took the structure, not the category.",
            items: [
                {
                    name: "Roll-out cadence",
                    aside: "Bilt",
                    note: "Everyday earning plus a monthly moment worth waiting for. Bilt's rent-day deals give points a date on the calendar, which is what turns a balance into a habit.",
                },
                {
                    name: "Visible, locked rewards",
                    aside: "ClassPass",
                    note: "Show just enough of what membership unlocks that free users can see the shape of it. A trial with a bonus to spend, not a bonus to hoard.",
                },
                {
                    name: "Access as the prize",
                    aside: "Letterboxd",
                    note: "Pre-screenings and director Q&As for loyal members. Access to something otherwise paid builds more attachment than a discount, and people post about it for free.",
                },
            ],
        },
        {
            verb: "Kept, demoted",
            rationale: "Right for some users, wrong as the whole system. Still there, no longer the point.",
            items: [
                {
                    name: "Store credit and gift cards",
                    aside: "",
                    note: "The honest option for someone who just wants to shop, or lives somewhere Phia has no events yet. Kept as one way to spend points — the floor, not the ceiling.",
                },
                {
                    name: "Points for engagement",
                    aside: "Temu",
                    note: "Rewarding everything with expiring points works on attention and nothing else. Kept the idea of earning outside checkout, but tied it to behaviour the brand actually wants: secondhand, resale, showing up.",
                },
            ],
        },
        {
            verb: "Created new",
            rationale: "Nothing in the market does it for fashion. Designed from Phia's own positioning.",
            items: [
                {
                    name: "Repairs as rewards",
                    aside: "",
                    note: "Tailoring, dry cleaning, cobblers, mending workshops. Points that extend the life of clothes someone already owns — the most direct way a reward can agree with a sustainability story.",
                },
                {
                    name: "Buy-or-wait verdict",
                    aside: "",
                    note: "Phia already says whether a price is fair. Premium adds when: buy now, wait, or good deal, with a confidence level, and an alert a day before everyone else when the price drops.",
                },
                {
                    name: "One wishlist",
                    aside: "needs partners",
                    note: "Connect Depop, Etsy, eBay and the rest so saved items stop scattering across apps. A frustration that came up again and again in my research, and the one idea Phia can't ship alone.",
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
   4. PROMPT CHAIN — five numbered stages (here: the buy-or-wait logic)
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
    carriesLabel: "outputs →",
    stages: [
        {
            name: "signals",
            description:
                "Everything the model reads about one item: price history, current price, how often the price moves, views, add-to-carts, how fast it sells and how much is left, plus where it sits in its season and product life cycle.",
            carries: "price, demand and timing inputs",
        },
        {
            name: "baseline",
            description:
                "What this item normally costs. A 90-day average with its low and high, stretched to 365 days when there is enough history. Every verdict is a distance from this line, not an absolute number.",
            carries: "typical price + range",
        },
        {
            name: "verdict",
            description:
                "Three words a shopper can act on. Buy now: 10–15% under average and near its recent low. Wait: 10–15% over, with recent dips below today's price and no urgency. Good deal: within 5–10% and not at a peak, or high demand at a fair price.",
            carries: "buy now · wait · good deal",
        },
        {
            name: "confidence",
            description:
                "Shoppers asked for when and how much, not percentages. So the model speaks in plain sentences — “prices often drop around this time” — and says high or low confidence out loud. Too little history gets its own state rather than a guess.",
            carries: "readable claim + confidence level",
        },
        {
            name: "alert",
            description:
                "Choosing to wait is where most carts get abandoned. For premium members it becomes a promise instead: Phia watches the price and tells them 24 hours ahead of everyone else, which turns hesitation into a reason to come back.",
            carries: "early price-drop notification",
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
    tag: "What shoppers told me",
    quote: "The problem isn't buying too little. It's buying things there's nowhere to wear.",
    note: "Friends who love shopping, and the Reddit threads they'd recognise, kept landing on the same few frustrations: buying on impulse, feeling bad about the money, wishlists lost across five apps, and clothes with no occasion to wear them to. A rewards system that only paid out in more shopping would fix none of that.",
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
            job: "Marks membership",
            name: "The Pro card",
            note: "The Phia mark, its own colour and its own messaging. Membership should be legible at a glance without shouting about it.",
        },
        {
            job: "Shows what's locked",
            name: "Restricted rewards feed",
            note: "Free users see the events, services and sessions they could redeem, just not in full. The pitch for premium is the feed itself.",
        },
        {
            job: "Sets a deadline",
            name: "Expiring trial points",
            note: "The 14-day joining bonus has to be spent on one service, event or session before it runs out. Saved, it would never show anyone what premium is for.",
        },
        {
            job: "Assists the decision",
            name: "Buy-or-wait verdict",
            note: "A plain-language call at the moment of doubt, where carts get abandoned — the difference between guessing and knowing.",
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
   7. PARTICIPATION LOOP — steps with a two-state status chip
   ═══════════════════════════════════════════════════════════════════════════ */

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 */
export function ParticipationLoop(props) {
    const { steps, maxWidth, onLabel, offLabel } = props
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
                        {s.shipped ? onLabel : offLabel}
                    </span>
                </div>
            ))}
        </div>
    )
}

ParticipationLoop.defaultProps = {
    maxWidth: 760,
    onLabel: "Designed",
    offLabel: "Next",
    steps: [
        {
            text: "A free user earns points slowly, from purchases made through Phia",
            shipped: true,
        },
        {
            text: "Phia suggests premium. The 14-day trial opens with a bonus, and a rewards feed that is visible but partly locked",
            shipped: true,
        },
        {
            text: "The bonus goes on one event, service or stylist session before it expires — a real taste of what the points are for",
            shipped: true,
        },
        {
            text: "A Pro member browses the full feed, opens a session or event, and books it with points",
            shipped: true,
        },
        {
            text: "Points keep coming from secondhand buys, resale, and posting photos after an event — each one feeding the community back into the app",
            shipped: true,
        },
        {
            text: "End of trial: become a paying member, or cancel without penalty",
            shipped: false,
        },
        {
            text: "Onboarding for designers, stylists and service providers, and what they earn from being on Phia",
            shipped: false,
        },
        {
            text: "Connecting other fashion apps, so wishlists and search live in one place",
            shipped: false,
        },
    ],
}

addPropertyControls(ParticipationLoop, {
    maxWidth: { type: ControlType.Number, title: "Max width", min: 320, max: 1200, step: 20 },
    onLabel: { type: ControlType.String, title: "On label" },
    offLabel: { type: ControlType.String, title: "Off label" },
    steps: {
        type: ControlType.Array,
        title: "Steps",
        control: {
            type: ControlType.Object,
            controls: {
                text: { type: ControlType.String, title: "Step", displayTextArea: true },
                shipped: { type: ControlType.Boolean, title: "Done", defaultValue: true },
            },
        },
    },
})

/* ═══════════════════════════════════════════════════════════════════════════
   8. FIGURE ROW — the headline numbers
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
    note: "Estimates from the roll-out plan, not measured results. Ordered by what Phia could build first, not what would matter most.",
    figures: [
        {
            value: "1.5–2 mo",
            caption: "gift cards and spend power at checkout, once brands agree to be on the roster",
        },
        {
            value: "2–3 mo",
            caption: "the buy-or-wait widget, including training a model that reports confidence, not percentages",
        },
        {
            value: "3–5 mo",
            caption: "experiences and services, with a sourcing team finding providers and an ops team onboarding them",
        },
        {
            value: "20–40%",
            caption: "what a shopper can overpay on seasonal items by not waiting a few weeks — the case for the widget",
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
