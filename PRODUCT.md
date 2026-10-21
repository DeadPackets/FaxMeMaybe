# Product

## Register

product

## Users
Two groups use the public form at remind.deadpackets.pw. Friends and family send real reminders to the owner, often from a phone and without much context. Portfolio visitors try the form to see the over-engineered pipeline work end to end. Automations (n8n email parsing, Linear) send most of the volume through `POST /api/todos` and never see the UI. The owner uses `/admin` and scans the printed ticket's QR code to open `/view-todo` and mark tasks done, usually on a phone at the desk.

## Product Purpose
Turn a request into a physical thermal-printed ticket on the owner's desk, with Todoist as the source of truth. Success: a sender can send a TODO in under 30 seconds without instructions. The ticket is readable at arm's length, and one QR scan closes the loop.

## Brand Personality
Physical, playful, and exact. The web UI previews the object that comes out of the printer: a paper slip, receipt data, flames for importance, a tear line. The humor comes from taking a silly idea seriously, not from jokes in the copy.

## Anti-references
- The stock shadcn/ui slate look the app ships today (default tokens, Inter, cards in cards, `shadow-xl`).
- Terminal/hacker styling for the public form. It is right for the First Blood CTF receipt, but it loses family senders.
- Generic SaaS: gradient heroes, glass cards, metric tiles, marketing buzzwords.
- Grays, gradients or color on the printed ticket. The thermal head prints 1-bit black only.

## Design Principles
1. **The ticket is the product.** Every web surface previews or follows the printed slip. Design the ticket first.
2. **Print-true.** Ticket output uses pure black on white, sizes set in the 576 px printer width, and no detail that dithers away.
3. **Thirty seconds to send.** One required field, sensible defaults, no account. Optional fields never block.
4. **Serious about the silly.** Precise craft and plain copy. The personality lives in material and form, not in exclamation marks.
5. **Close the loop on a phone.** QR scan to `/view-todo` to done must work one-handed on a small screen.

## Accessibility & Inclusion
WCAG 2.2 AA for all web routes: 4.5:1 text contrast, visible focus, full keyboard operation, labelled controls, 24 px minimum target size (44 px preferred on the phone flows), and a `prefers-reduced-motion` alternative for all motion. Importance must not rely on color or emoji alone; it always has a text label.
