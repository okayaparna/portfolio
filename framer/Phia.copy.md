# Phia Rewards — page copy

Running prose and section heads for the Phia case study. The structured
sections (ledger, logic, signals, flow, figures) are the defaults in
`Phia.tsx`; this file is everything that sits between them as plain Framer
text layers. Order matches the stack in `Phia.tsx`.

---

## CaseStudyHero

*(defaults in `Phia.tsx`: "Points Without the Push")*

## Intro — two-column row

**Label:** The brief
**Heading:** Rewards that don't argue with the brand

Phia's pitch is that you can shop well: fair prices, secondhand first, less
impulse. Most rewards programs work the other way. Points turn into store
credit, store credit turns into more buying, and the loop quietly rewards the
exact behaviour a sustainability story is trying to slow down.

The brief set four goals: let people choose how they use their points,
strengthen the sustainability story without forcing anyone into it, stand
apart from apps that swap points for generic credit, and build a community
around fashion, affordability and conscious buying. I took it from market
research through strategy to the premium flows in Figma.

---

## SectionHead
**Eyebrow:** What the market already does
**Heading:** Every rewards program I studied paid you back in more shopping

I looked at ten programs, and only a few of them were in fashion: Bilt,
Letterboxd, Sephora, ClassPass, License to Glow, GOAT, Indyx, Blackbird,
Partiful, and Temu, for how hard it works to make every tap feel like
earning. The useful ideas came from outside the category. Bilt ties rewards
to a date. ClassPass sells membership by showing you what you're missing.
Letterboxd rewards loyalty with access, and its members post about it for
free.

Put together, that gave me the structure: Bilt's roll-out cadence,
ClassPass's visibility model and Letterboxd's in-person access.

## SystemLedger

*(defaults in `Phia.tsx`: Borrowed / Kept, demoted / Created new)*

## Callout

*(defaults in `Phia.tsx`: "The problem isn't buying too little…")*

---

## Two-column row — the strategy

**Label:** The strategy
**Heading:** Rewards as access, services and community

Instead of turning points straight into more buying, premium members redeem
them across four kinds of reward, so the choice of what the points are for
stays with them.

**Community and events.** Pop-ups, clothing swaps, styling workshops,
upcycling classes, designer meet-and-greets. Higher tiers reach fashion-week
adjacent events and designer previews. An experience builds an emotional
connection that a discount can't, and it gives people somewhere to wear what
they bought.

**Services.** Tailoring, alterations, repairs, cobblers, dry cleaning. Points
that make clothes last longer are the clearest way to back up a
sustainability claim.

**Store credit.** Kept for anyone who just wants to shop, or who lives in a
city Phia hasn't reached yet. Autonomy means this option has to stay.

**Deal intelligence.** Knowing when to buy, covered below.

Earning follows the same logic. Points come from buying through Phia, and
more from buying secondhand, choosing sustainable alternatives, reselling or
donating, and showing up: attending an event and posting from it, or
reviewing a workshop afterwards. Mission-minded behaviour is rewarded, and
nobody is penalised for buying new.

---

## SectionHead
**Eyebrow:** Deal intelligence
**Heading:** Knowing when to buy is worth more than a discount

Many products follow predictable price cycles, and a shopper can easily
overpay by 20–40% by not waiting a few weeks. Phia already tells people
whether a price is fair. The premium version tells them what to do about it.

## PromptChain

*(defaults in `Phia.tsx`: signals → baseline → verdict → confidence → alert)*

The open question was how to present it: a percentage, or a prediction? A
percentage is precise, but a shopper can't act on it. "Price typically drops
25% in 3–4 weeks" or "Lowest price this year was $XX in March" answers the
two things a shopper wants to know, which are when and how much.

---

## SectionHead
**Eyebrow:** Free vs. Pro
**Heading:** Premium should feel like the smarter choice, not the obvious upsell

The line between the tiers had to be drawn without making free users feel
punished. Free stays a working shopping app: earn slowly, spend at checkout.
Pro adds the verdict, the early alerts, connected wishlists across apps, a
network of people who care about clothes, and a rewards page that goes well
beyond checkout.

The trial raised the hardest question. **What if someone saves their bonus
points instead of using them?** Then the trial has shown them nothing. So the
joining bonus has to be spent on one event, service, stylist session or
community activity before it expires, and anything left over doesn't carry
forward. It's the one place I chose urgency over autonomy, because a trial
nobody uses can't show anyone what premium is for.

## SignalGrid

*(defaults in `Phia.tsx`)*

---

## SectionHead
**Eyebrow:** The flow
**Heading:** From a slow trickle of points to a booked session

## ParticipationLoop

*(defaults in `Phia.tsx`: five Designed steps, three Next)*

## Figures — Figma frames from `Rewards/Premium`

- **1.1 — Free → Pro.** The 14-day trial entry, with rewards visible but restricted.
- **1.2 — Rewards feed, Pro.** Unrestricted access.
- **1.3 — A session, service or event page.**
- **1.4 — Booking a session, service or event.**
- **1.5 — Free vs. Pro cards.** The Phia mark, colour and messaging that tell the tiers apart.

---

## SectionHead
**Eyebrow:** Rolling it out
**Heading:** Ordered by what Phia could build first

## FigureRow

*(defaults in `Phia.tsx`)*

## Closing — two-column row

**Label:** Reflection
**Heading:** A reward is an argument about what the product is for

Store credit says Phia is a place to spend. A repair voucher, a styling
session or a seat at a swap says it's a place to get more out of what you
own and to find people who care about the same things. Choosing the rewards
was really a positioning decision.

It also exposed how much of the system lives outside the interface. The most
ambitious tier depends on a sourcing team finding providers, an ops team
onboarding them, and a reason for a local tailor to want to be on Phia at
all. That, the end-of-trial decision and connecting other fashion apps are
the flows I'd design next.
