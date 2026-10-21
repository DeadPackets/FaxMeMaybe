import { useState, useEffect, useRef, type FormEvent } from "react";
import { flushSync } from "react-dom";
import { Flame, Loader2, Copy } from "lucide-react";
import { toast } from "sonner";
import { LabelSelector, type LabelOption } from "@/components/ui/label-selector";
import { SmartDateInput } from "@/components/ui/smart-date-input";
import { Ticket, IMPORTANCE_LEVELS } from "./Ticket";
import { startHeat, type HeatEngine } from "./heat";

const EMPTY_FORM = { importance: 3, todo: "", description: "", dueDate: "", from: "", labels: [] as string[] };
type Stats = { printed: number; pending: number; completed: number; medianHoursToDone: number | null };

const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
// The sheet passes through a slot on the top edge of the preview
const IN_SLOT = { transform: "translateY(-100%)", clipPath: "inset(100% -24px -24px)" };
const ON_DESK = { transform: "translateY(0)", clipPath: "inset(0 -24px -24px)" };
const motionOk = () => !matchMedia("(prefers-reduced-motion: reduce)").matches;
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function fmtHours(h: number) {
	if (h < 1) return `${Math.max(1, Math.round(h * 60))} min`;
	if (h < 48) return `${Math.round(h)} h`;
	return `${(h / 24).toFixed(1)} days`;
}

const fieldLabel = "flex justify-between font-mono text-[0.6875rem] uppercase tracking-[0.06em] text-ink-soft";
const slipInput =
	"w-full rounded-none border-0 border-b-2 border-ink bg-transparent px-0 py-1.5 text-[1.0625rem] text-ink placeholder:text-ink-soft focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-signal disabled:opacity-60";

function Counter({ id, value, max }: { id: string; value: string; max: number }) {
	const left = max - value.length;
	return (
		<span id={id} className={left <= 5 ? "font-bold text-destructive" : undefined}>
			{value.length}/{max}
		</span>
	);
}

function App() {
	const [form, setForm] = useState(EMPTY_FORM);
	const [sending, setSending] = useState(false);
	const [stats, setStats] = useState<Stats | null>(null);
	const [labels, setLabels] = useState<LabelOption[] | null>(null);
	const [previewTime] = useState(() => new Date().toISOString());
	const level = IMPORTANCE_LEVELS.find((l) => l.value === form.importance) ?? IMPORTANCE_LEVELS[2];
	const curl = `curl -X POST ${window.location.origin}/api/todos \\
  -H "Content-Type: application/json" \\
  -d '{"todo": "Review the new feature", "importance": 3,
       "dueDate": "tomorrow at 5pm", "from": "API User"}'`;

	useEffect(() => {
		fetch("/api/todos/stats")
			.then((r) => r.json())
			.then((data) => {
				if (data.success) setStats(data.stats);
			})
			.catch((error) => console.error("Error fetching stats:", error));
		fetch("/api/labels")
			.then((r) => r.json())
			.then((data) => setLabels(data.success ? data.labels : []))
			.catch(() => setLabels([]));
	}, []);

	const pageRef = useRef<HTMLElement>(null);
	const bgRef = useRef<HTMLCanvasElement>(null);
	const heroRef = useRef<HTMLElement>(null);
	const wrapRef = useRef<HTMLDivElement>(null);
	const feedRef = useRef<HTMLDivElement>(null);
	const burnRef = useRef<HTMLCanvasElement>(null);
	const formRef = useRef<HTMLFormElement>(null);
	const tallyRef = useRef<HTMLDListElement>(null);
	const heat = useRef<HeatEngine | null>(null);
	const importance = useRef(form.importance);
	const mounted = useRef(false);
	const prevStats = useRef<Stats | null>(null);

	useEffect(() => {
		const engine = startHeat({
			page: pageRef.current!,
			canvas: bgRef.current!,
			hero: heroRef.current!,
			anchor: wrapRef.current!,
			feed: feedRef.current!,
			burnCanvas: burnRef.current!,
			importance: () => importance.current,
		});
		heat.current = engine;
		return () => engine.destroy();
	}, []);

	useEffect(() => {
		importance.current = form.importance;
		if (!mounted.current) return;
		heat.current?.touch(true);
		if (!motionOk()) return;
		formRef.current?.querySelectorAll<SVGElement>("[data-on] svg").forEach((svg, i) =>
			svg.animate([{ transform: "scale(0.55)" }, { transform: "scale(1)" }], { duration: 320, delay: i * 30, easing: EASE }),
		);
	}, [form.importance]);

	useEffect(() => {
		if (mounted.current) heat.current?.touch(false);
		mounted.current = true;
	}, [form.todo, form.from, form.dueDate, form.labels]);

	useEffect(() => {
		const prev = prevStats.current;
		prevStats.current = stats;
		if (!prev || !stats || !motionOk()) return;
		tallyRef.current?.querySelectorAll<HTMLElement>("dd[data-key]").forEach((dd) => {
			const key = dd.dataset.key as keyof Stats;
			if (prev[key] !== stats[key]) dd.animate([{ transform: "translateY(40%)", opacity: 0.2 }, { transform: "none", opacity: 1 }], { duration: 380, easing: EASE });
		});
	}, [stats]);

	const set = <K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) =>
		setForm((f) => ({ ...f, [key]: value }));

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		if (sending) return;
		if (!form.todo.trim()) {
			toast.error("Write what needs doing first.");
			return;
		}
		setSending(true);
		const sent = fetch("/api/todos", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({
				importance: form.importance,
				todo: form.todo,
				description: form.description || undefined,
				dueDate: form.dueDate || undefined,
				from: form.from || undefined,
				labels: form.labels.length > 0 ? form.labels : undefined,
			}),
		})
			.then(async (r) => ({ ok: r.ok, data: await r.json() }))
			.catch((error) => {
				console.error("Error submitting TODO:", error);
				return null;
			});

		// The sheet feeds up into the slot while the request runs, then a sheet feeds back out
		const feed = feedRef.current!, wrap = wrapRef.current!;
		let exit: Animation | null = null;
		if (motionOk()) {
			const r = feed.getBoundingClientRect();
			if (r.top < 0 || r.bottom > innerHeight) {
				feed.scrollIntoView({ block: "center", behavior: "smooth" });
				await wait(450);
			}
			wrap.dataset.feeding = "";
			exit = feed.animate([ON_DESK, IN_SLOT], { duration: 1100, easing: "steps(28)", fill: "forwards" });
			await exit.finished;
		}

		const res = await sent;
		if (!res) toast.error("Could not reach the server. Check your connection and try again.");
		else if (!res.ok) toast.error(res.data.error || "The TODO was not sent. Try again.");
		else toast.success("Sent. It is printing on my desk now.");

		heat.current?.clearBurn();
		flushSync(() => {
			if (res?.ok) {
				setForm(EMPTY_FORM);
				setStats((s) => s && { ...s, printed: s.printed + 1, pending: s.pending + 1 });
			}
			setSending(false);
		});
		if (res?.ok) heat.current?.sweep();
		if (exit) {
			// A blank sheet after a send, the same sheet back after a failure
			const back = feed.animate([IN_SLOT, ON_DESK], { duration: 700, easing: "steps(18)" });
			exit.cancel();
			await back.finished;
			delete wrap.dataset.feeding;
		}
	};

	const copyCurl = async () => {
		try {
			await navigator.clipboard.writeText(curl);
			toast.success("cURL command copied.");
		} catch {
			toast.error("Copy failed. Select the command and copy it by hand.");
		}
	};

	return (
		<main
			ref={pageRef}
			className="relative min-h-dvh pl-[max(16px,env(safe-area-inset-left))] pr-[max(16px,env(safe-area-inset-right))]"
		>
			<canvas ref={bgRef} className="heat" aria-hidden="true" />
			<div className="relative z-[1] mx-auto max-w-[1120px] pt-10 pb-14 sm:pt-14">
				<header ref={heroRef}>
					<h1 className="flex items-center gap-2.5 text-[clamp(2.75rem,8vw,6rem)] leading-none font-bold tracking-[-0.03em]">
						<Flame aria-hidden="true" className="size-[0.9em] shrink-0 fill-white" />
						FaxMeMaybe
					</h1>
					<p className="mt-2.5 text-xl">Send me a TODO, I'll get to it... eventually.</p>
					<dl ref={tallyRef} className="tally" aria-label="Ticket stats">
						{[
							{ key: "printed", label: "Printed", value: stats?.printed.toLocaleString("en-GB") },
							{ key: "pending", label: "On the desk", value: stats?.pending.toLocaleString("en-GB") },
							{ key: "completed", label: "Done", value: stats?.completed.toLocaleString("en-GB") },
							...(stats?.medianHoursToDone != null
								? [{ key: "medianHoursToDone", label: "Median time to done", value: fmtHours(stats.medianHoursToDone) }]
								: []),
						].map((row) => (
							<div key={row.key}>
								<dt>{row.label}</dt>
								<dd data-key={row.key}>{row.value ?? "–"}</dd>
							</div>
						))}
					</dl>
				</header>

				<div className="mt-9 grid items-start gap-10 min-[960px]:grid-cols-[minmax(0,1fr)_420px] min-[960px]:gap-14">
					<form ref={formRef} onSubmit={handleSubmit} className="slip max-w-[560px] px-6 pt-6 pb-12 sm:px-8" aria-labelledby="send-heading">
						<div className="mb-5 flex items-baseline justify-between gap-3 border-b-2 border-dashed border-ink pb-3">
							<h2 id="send-heading" className="text-[1.375rem] font-bold tracking-[-0.01em]">
								Send a TODO
							</h2>
							{stats && (
								<span className="font-mono text-[0.6875rem] text-ink-soft">
									No. {(stats.printed + 1).toString().padStart(4, "0")}
								</span>
							)}
						</div>

						<div className="grid gap-6">
							<fieldset disabled={sending} className="m-0 grid min-w-0 gap-6 border-0 p-0">
								<div className="grid gap-1">
									<div className={fieldLabel}>
										<label htmlFor="todo">What needs doing</label>
										<Counter id="todo-count" value={form.todo} max={64} />
									</div>
									<input
										id="todo"
										className={`${slipInput} text-xl font-semibold`}
										placeholder="Pick up the dry cleaning"
										value={form.todo}
										onChange={(e) => set("todo", e.target.value)}
										maxLength={64}
										required
										aria-describedby="todo-count"
									/>
								</div>

								<fieldset className="grid gap-1">
									<legend className={`${fieldLabel} mb-1`}>Importance</legend>
									<div className="flex flex-wrap items-center gap-x-1 gap-y-2">
										{IMPORTANCE_LEVELS.map((l) => (
											<label
												key={l.value}
												data-on={l.value <= form.importance || undefined}
												className="grid h-11 w-10 cursor-pointer place-items-center rounded-md has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-signal"
											>
												<input
													type="radio"
													name="importance"
													value={l.value}
													checked={form.importance === l.value}
													onChange={() => set("importance", l.value)}
													className="sr-only"
												/>
												<Flame
													aria-hidden="true"
													strokeWidth={1.8}
													className={`size-[26px] transition-colors duration-150 ${l.value <= form.importance ? "fill-signal text-signal" : "text-ink"}`}
												/>
												<span className="sr-only">{`${l.label}: ${l.hint}`}</span>
											</label>
										))}
										<p className="ml-2 text-sm" aria-hidden="true">
											<span className="font-mono text-xs font-bold tracking-[0.08em] uppercase">{level.label}</span>
											<span className="text-ink-soft"> · {level.hint}</span>
										</p>
									</div>
							</fieldset>

							<div className="grid gap-1">
								<div className={fieldLabel}>
									<label htmlFor="description">Details (optional)</label>
									<Counter id="description-count" value={form.description} max={500} />
								</div>
								<textarea
									id="description"
									className={`${slipInput} resize-none`}
									rows={2}
									placeholder="Anything I need to know"
									value={form.description}
									onChange={(e) => set("description", e.target.value)}
									maxLength={500}
									aria-describedby="description-count description-hint"
								/>
								<p id="description-hint" className="text-xs text-ink-soft">
									Saved to Todoist. Not printed on the ticket.
								</p>
							</div>

							<div className="grid gap-1">
								<label htmlFor="dueDate" className={fieldLabel}>
									Due (optional)
								</label>
								<SmartDateInput
									id="dueDate"
									inputClassName={slipInput}
									value={form.dueDate}
									onChange={(dueDate) => set("dueDate", dueDate)}
									placeholder="tomorrow at 2pm"
								/>
							</div>

							<div className="grid gap-1">
								<span id="labels-label" className={fieldLabel}>
									Labels (optional)
								</span>
								{labels === null ? (
									<p className="flex items-center gap-2 py-1.5 text-sm text-ink-soft">
										<Loader2 aria-hidden="true" className="size-4 motion-safe:animate-spin" />
										Loading labels from Todoist
									</p>
								) : (
									<LabelSelector
										aria-labelledby="labels-label"
										labels={labels}
										selectedLabels={form.labels}
										onLabelsChange={(next) => set("labels", next)}
										placeholder="Choose labels"
										maxLabels={5}
									/>
								)}
							</div>

							<div className="grid gap-1">
								<div className={fieldLabel}>
									<label htmlFor="from">From (optional)</label>
									<Counter id="from-count" value={form.from} max={40} />
								</div>
								<input
									id="from"
									className={slipInput}
									placeholder="Your name"
									autoComplete="name"
									value={form.from}
									onChange={(e) => set("from", e.target.value)}
									maxLength={40}
									aria-describedby="from-count"
								/>
							</div>
							</fieldset>

							<button
								type="submit"
								aria-disabled={sending}
								className="mt-2 flex h-13 items-center justify-center gap-2 rounded-md bg-ink text-base font-semibold text-paper transition-colors duration-150 hover:bg-signal focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-signal active:translate-y-px aria-disabled:cursor-progress aria-disabled:bg-ink/70"
							>
								{sending && <Loader2 aria-hidden="true" className="size-5 motion-safe:animate-spin" />}
								{sending ? "Sending" : "Print my TODO"}
							</button>
							<p role="status" className="sr-only">
								{sending ? "Sending your TODO to the printer." : ""}
							</p>
						</div>
					</form>

					<aside aria-labelledby="preview-heading" className="grid min-w-0 gap-3 min-[960px]:sticky min-[960px]:top-8">
						<h2 id="preview-heading" className="font-mono text-xs font-bold tracking-[0.06em] uppercase">
							What prints
						</h2>
						<div ref={wrapRef} className="cwrap">
							<div ref={feedRef} className="feed">
								<Ticket
									todo={form.todo.trim() || "Your TODO goes here"}
									importance={form.importance}
									dueDate={form.dueDate || undefined}
									from={form.from.trim() || undefined}
									labels={form.labels}
									createdAt={previewTime}
								/>
								<canvas ref={burnRef} className="burn" aria-hidden="true" />
							</div>
							{sending && (
								<p className="waiting" aria-hidden="true">
									Printing on my desk
								</p>
							)}
						</div>
						<p className="max-w-[400px] text-sm">
							The ticket prints 80 mm wide on a thermal printer on my desk, and its QR code opens the task in Todoist. Hold the pointer on it to see the paper burn.
						</p>
					</aside>
				</div>

				<details className="mt-12 max-w-[560px]">
					<summary className="cursor-pointer font-semibold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
						Send a TODO from code
					</summary>
					<div className="mt-3 grid gap-3">
						<p className="text-sm">
							<code className="font-mono">POST /api/todos</code> takes the same fields. Due dates accept natural language like "next monday at 2pm".
						</p>
						<pre className="overflow-x-auto rounded-md bg-ink p-4 font-mono text-xs leading-relaxed text-paper">
							<code>{curl}</code>
						</pre>
						<button
							type="button"
							onClick={copyCurl}
							className="inline-flex h-10 w-max items-center gap-2 rounded-md border-2 border-white px-4 text-sm font-semibold hover:bg-white hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
						>
							<Copy aria-hidden="true" className="size-4" />
							Copy cURL command
						</button>
					</div>
				</details>

				<footer className="mt-12 text-sm">
					Built with Cloudflare Workers, Todoist and a Raspberry Pi.{" "}
					<a href="https://github.com/deadpackets/FaxMeMaybe" className="font-semibold underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
						Source on GitHub
					</a>
				</footer>
			</div>
		</main>
	);
}

export default App;
