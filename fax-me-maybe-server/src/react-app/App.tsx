import { useState, useEffect, type FormEvent } from "react";
import { Flame, Loader2, Copy } from "lucide-react";
import { toast } from "sonner";
import { LabelSelector, type LabelOption } from "@/components/ui/label-selector";
import { SmartDateInput } from "@/components/ui/smart-date-input";
import { Ticket, IMPORTANCE_LEVELS } from "./Ticket";

const EMPTY_FORM = { importance: 3, todo: "", description: "", dueDate: "", from: "", labels: [] as string[] };

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
	const [status, setStatus] = useState<"idle" | "sending" | "sent">("idle");
	const [stats, setStats] = useState<{ pending: number; completed: number } | null>(null);
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

	const set = <K extends keyof typeof EMPTY_FORM>(key: K, value: (typeof EMPTY_FORM)[K]) =>
		setForm((f) => ({ ...f, [key]: value }));

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();
		if (!form.todo.trim()) {
			toast.error("Write what needs doing first.");
			return;
		}
		setStatus("sending");
		try {
			const response = await fetch("/api/todos", {
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
			});
			const data = await response.json();
			if (!response.ok) {
				toast.error(data.error || "The TODO was not sent. Try again.");
				setStatus("idle");
				return;
			}
			if (data.printed === false) {
				toast.warning("Saved to Todoist, but the ticket did not print.");
			} else {
				toast.success("Sent. It is printing on my desk now.");
			}
			setStatus("sent");
			setStats((s) => s && { ...s, pending: s.pending + 1 });
			setTimeout(() => {
				setForm(EMPTY_FORM);
				setStatus("idle");
			}, 2000);
		} catch (error) {
			console.error("Error submitting TODO:", error);
			toast.error("Could not reach the server. Check your connection and try again.");
			setStatus("idle");
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
		<div className="min-h-dvh pl-[max(16px,env(safe-area-inset-left))] pr-[max(16px,env(safe-area-inset-right))]">
			<main className="mx-auto max-w-[1000px] py-10 sm:py-14">
				<header className="mb-8 sm:mb-10">
					<h1 className="flex items-center gap-2 text-[2rem] font-bold tracking-[-0.02em] sm:text-[2.5rem]">
						<Flame aria-hidden="true" className="size-8 fill-white sm:size-10" />
						FaxMeMaybe
					</h1>
					<p className="mt-1 text-lg">Send me a TODO, I'll get to it... eventually.</p>
					<p className="mt-3 min-h-5 font-mono text-xs tabular-nums" aria-live="polite">
						{stats && `${stats.pending.toLocaleString()} pending · ${stats.completed.toLocaleString()} done`}
					</p>
				</header>

				<div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-14">
					<form onSubmit={handleSubmit} className="slip max-w-[560px] px-6 pt-6 pb-12 sm:px-8" aria-labelledby="send-heading">
						<div className="mb-5 flex items-baseline justify-between gap-3 border-b-2 border-dashed border-ink pb-3">
							<h2 id="send-heading" className="text-[1.375rem] font-bold tracking-[-0.01em]">
								Send a TODO
							</h2>
							{stats && (
								<span className="font-mono text-[0.6875rem] text-ink-soft">
									No. {(stats.pending + stats.completed + 1).toString().padStart(4, "0")}
								</span>
							)}
						</div>

						<div className="grid gap-6">
							<div className="grid gap-1">
								<label htmlFor="todo" className={fieldLabel}>
									<span>What needs doing</span>
									<Counter id="todo-count" value={form.todo} max={64} />
								</label>
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
								<label htmlFor="description" className={fieldLabel}>
									<span>Details (optional)</span>
									<Counter id="description-count" value={form.description} max={500} />
								</label>
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
								<label htmlFor="from" className={fieldLabel}>
									<span>From (optional)</span>
									<Counter id="from-count" value={form.from} max={40} />
								</label>
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

							<button
								type="submit"
								disabled={status !== "idle"}
								className="mt-2 flex h-13 items-center justify-center gap-2 rounded-md bg-ink text-base font-semibold text-paper transition-colors duration-150 hover:bg-signal focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-signal active:translate-y-px disabled:cursor-not-allowed disabled:bg-ink/70"
							>
								{status === "sending" && <Loader2 aria-hidden="true" className="size-5 motion-safe:animate-spin" />}
								{status === "idle" ? "Print my TODO" : status === "sending" ? "Sending" : "Sent to the printer"}
							</button>
						</div>
					</form>

					<aside aria-labelledby="preview-heading" className="grid gap-3 lg:sticky lg:top-8">
						<h2 id="preview-heading" className="font-mono text-xs font-bold tracking-[0.06em] uppercase">
							What prints
						</h2>
						<div className="w-full max-w-[400px] shadow-[0_2px_6px_rgb(0_0_0/0.25)]">
							<Ticket
								todo={form.todo.trim() || "Your TODO goes here"}
								importance={form.importance}
								dueDate={form.dueDate || undefined}
								from={form.from.trim() || undefined}
								labels={form.labels}
								createdAt={previewTime}
							/>
						</div>
						<p className="max-w-[400px] text-sm">
							The ticket prints 80 mm wide on a thermal printer on my desk. Its QR code opens the task in Todoist.
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
			</main>
		</div>
	);
}

export default App;
