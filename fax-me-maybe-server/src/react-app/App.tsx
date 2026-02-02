import { useState, FormEvent, ChangeEvent, useEffect } from "react";
import { Link } from "react-router-dom";
import { Loader2, Send, Flame, CheckCircle2, Calendar, User, Copy, Code2, Sun, Moon, Printer, Settings, Tag, FileText, Clock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "@/components/theme-provider";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { LabelSelector, type LabelOption } from "@/components/ui/label-selector";
import { SmartDateInput } from "@/components/ui/smart-date-input";

export function ModeToggle() {
  const { setTheme } = useTheme()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Sun className="h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme("light")}>
          Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("dark")}>
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme("system")}>
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

const IMPORTANCE_LEVELS = [
	{ value: 1, label: "Low", emoji: "🔥", description: "When you have time" },
	{ value: 2, label: "Medium", emoji: "🔥🔥", description: "This week would be nice" },
	{ value: 3, label: "High", emoji: "🔥🔥🔥", description: "Pretty important" },
	{ value: 4, label: "Urgent", emoji: "🔥🔥🔥🔥", description: "Need this soon!" },
	{ value: 5, label: "Critical", emoji: "🔥🔥🔥🔥🔥", description: "DROP EVERYTHING!" },
] as const;


function App() {
	const [formData, setFormData] = useState({
		importance: 3,
		todo: "",
		description: "",
		dueDate: "",
		from: "",
		labels: [] as string[],
	});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isSubmitted, setIsSubmitted] = useState(false);
	const [stats, setStats] = useState<{ pending: number; completed: number } | null>(null);
	const [isLoadingStats, setIsLoadingStats] = useState(true);
	const [availableLabels, setAvailableLabels] = useState<LabelOption[]>([]);
	const [isLoadingLabels, setIsLoadingLabels] = useState(true);

	// Fetch stats and labels on component mount
	useEffect(() => {
		fetchStats();
		fetchLabels();
	}, []);

	const fetchStats = async () => {
		try {
			setIsLoadingStats(true);
			const response = await fetch("/api/todos/stats");
			const data = await response.json();
			if (response.ok && data.success) {
				setStats(data.stats);
			}
		} catch (error) {
			console.error("Error fetching stats:", error);
		} finally {
			setIsLoadingStats(false);
		}
	};

	const fetchLabels = async () => {
		try {
			setIsLoadingLabels(true);
			const response = await fetch("/api/labels");
			const data = await response.json();
			if (response.ok && data.success) {
				setAvailableLabels(data.labels);
			}
		} catch (error) {
			console.error("Error fetching labels:", error);
		} finally {
			setIsLoadingLabels(false);
		}
	};

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();

		if (!formData.todo.trim()) {
			toast.error("Please enter a TODO");
			return;
		}

		if (formData.todo.trim().length > 64) {
			toast.error("TODO must be 64 characters or less");
			return;
		}

		if (formData.description && formData.description.trim().length > 500) {
			toast.error("Description must be 500 characters or less");
			return;
		}

		if (formData.from && formData.from.trim().length > 20) {
			toast.error("From field must be 20 characters or less");
			return;
		}

		setIsSubmitting(true);

		try {
			const response = await fetch("/api/todos", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					importance: formData.importance,
					todo: formData.todo,
					description: formData.description || undefined,
					dueDate: formData.dueDate || undefined,
					from: formData.from || undefined,
					labels: formData.labels.length > 0 ? formData.labels : undefined,
				}),
			});

			const data = await response.json();

			if (response.ok) {
				toast.success(data.message || "TODO sent successfully!");
				setIsSubmitted(true);

				// Refresh the stats
				fetchStats();

				// Reset form after 2 seconds
				setTimeout(() => {
					setFormData({
						importance: 3,
						todo: "",
						description: "",
						dueDate: "",
						from: "",
						labels: [],
					});
					setIsSubmitted(false);
				}, 2000);
			} else {
				toast.error(data.error || "Failed to send TODO");
			}
		} catch (error) {
			console.error("Error submitting TODO:", error);
			toast.error("Failed to send TODO. Please try again.");
		} finally {
			setIsSubmitting(false);
		}
	};

	const generateTicketUrl = () => {
		const params = new URLSearchParams();
		params.set("todo", formData.todo);
		params.set("importance", String(formData.importance));
		if (formData.dueDate) params.set("dueDate", formData.dueDate);
		if (formData.from) params.set("from", formData.from);
		if (formData.labels.length > 0) params.set("labels", formData.labels.join(","));
		params.set("created_at", new Date().toISOString());

		return `${window.location.origin}/todo-ticket?${params.toString()}`;
	};

	const openTicket = () => {
		const url = generateTicketUrl();
		window.open(url, "_blank");
	};

	const copyTicketUrl = () => {
		const url = generateTicketUrl();
		navigator.clipboard.writeText(url);
		toast.success("Ticket URL copied to clipboard!");
	};

	return (
		<div className="min-h-screen flex items-center justify-center p-4">
			<div className="w-full max-w-2xl">
				<div className="flex justify-end mb-4 gap-2">
					<Link to="/admin">
						<Button variant="outline" size="icon">
							<Settings className="h-[1.2rem] w-[1.2rem]" />
							<span className="sr-only">Admin Dashboard</span>
						</Button>
					</Link>
					<ModeToggle />
				</div>
				<div className="text-center mb-8">
					<div className="inline-flex items-center justify-center mb-4">
						<Flame className="w-12 h-12 mr-2" />
						<h1 className="text-5xl font-bold">FaxMeMaybe</h1>
					</div>
				<p className="text-lg text-muted-foreground">
					Send me a TODO, I'll get to it... eventually.
				</p>

				{/* Stats Counter */}
					<div className="mt-6 inline-flex items-center gap-4 px-6 py-3 rounded-full bg-muted/50 border">
						{isLoadingStats ? (
							<Loader2 className="w-5 h-5 animate-spin" />
						) : (
							<>
								<div className="flex items-center gap-1.5">
									<Clock className="w-4 h-4 text-yellow-500" />
									<span className="font-bold">{stats?.pending?.toLocaleString() || "0"}</span>
									<span className="text-muted-foreground text-sm">Pending</span>
								</div>
								<span className="text-muted-foreground">•</span>
								<div className="flex items-center gap-1.5">
									<CheckCircle2 className="w-4 h-4 text-green-500" />
									<span className="font-bold">{stats?.completed?.toLocaleString() || "0"}</span>
									<span className="text-muted-foreground text-sm">Completed</span>
								</div>
							</>
						)}
					</div>
				</div>

				<Card className="shadow-xl border">
					<CardHeader>
						<CardTitle className="text-2xl">Send a TODO</CardTitle>
						<CardDescription>
							Fill out the form below to send me your task or request
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleSubmit} className="space-y-6">
							{/* Importance Level */}
							<div className="space-y-2">
								<Label htmlFor="importance" className="text-base flex items-center gap-2">
									<Flame className="w-4 h-4" />
									Importance Level
								</Label>
								<Select
									value={String(formData.importance)}
									onValueChange={(val: string) => setFormData({ ...formData, importance: parseInt(val) as 1 | 2 | 3 | 4 | 5 })}
								>
									<SelectTrigger id="importance" className="w-full">
										<SelectValue placeholder="Select importance level" />
									</SelectTrigger>
									<SelectContent>
										<SelectGroup>
											{IMPORTANCE_LEVELS.map((level) => (
												<SelectItem key={level.value} value={String(level.value)}>
													<div className="flex items-center gap-2">
														<span>{level.emoji}</span>
														<span className="font-medium">{level.label}</span>
														<span className="text-xs text-muted-foreground">- {level.description}</span>
													</div>
												</SelectItem>
											))}
										</SelectGroup>
									</SelectContent>
								</Select>
							</div>

						{/* TODO Text */}
						<div className="space-y-2">
							<Label htmlFor="todo" className="text-base flex items-center justify-between">
								<span>What needs to be done? <span className="text-red-500">*</span></span>
								<span className={`text-xs ${formData.todo.length > 64 ? 'text-red-500 font-bold' : 'text-muted-foreground'}`}>
									{formData.todo.length}/64
								</span>
							</Label>
							<Input
								id="todo"
								placeholder="Brief task description..."
								value={formData.todo}
								onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, todo: e.target.value })}
								required
								maxLength={64}
							/>
							{formData.todo.length > 60 && formData.todo.length <= 64 && (
								<p className="text-xs text-yellow-600 dark:text-yellow-500">
									{64 - formData.todo.length} characters remaining
								</p>
							)}
						</div>

						{/* Description */}
						<div className="space-y-2">
							<Label htmlFor="description" className="text-base flex items-center justify-between">
								<span className="flex items-center gap-2">
									<FileText className="w-4 h-4" />
									Description <span className="text-xs">(optional)</span>
								</span>
								<span className={`text-xs ${formData.description.length > 500 ? 'text-red-500 font-bold' : 'text-muted-foreground'}`}>
									{formData.description.length}/500
								</span>
							</Label>
							<Textarea
								id="description"
								placeholder="Add more details about the task..."
								value={formData.description}
								onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, description: e.target.value })}
								maxLength={500}
								rows={3}
								className="resize-none"
							/>
						</div>

						{/* Labels */}
						<div className="space-y-2">
							<Label className="text-base flex items-center gap-2">
								<Tag className="w-4 h-4" />
								Labels <span className="text-xs">(optional)</span>
							</Label>
							{isLoadingLabels ? (
								<div className="flex items-center gap-2 text-sm text-muted-foreground">
									<Loader2 className="w-4 h-4 animate-spin" />
									Loading labels from Todoist...
								</div>
							) : (
								<LabelSelector
									labels={availableLabels}
									selectedLabels={formData.labels}
									onLabelsChange={(labels) => setFormData({ ...formData, labels })}
									placeholder="Select or create labels..."
									allowCustom={true}
									maxLabels={5}
								/>
							)}
						</div>

						{/* Due Date */}
						<div className="space-y-2">
							<Label htmlFor="dueDate" className="text-base flex items-center gap-2">
								<Calendar className="w-4 h-4" />
								Due Date <span className="text-xs">(optional)</span>
							</Label>
							<SmartDateInput
								value={formData.dueDate}
								onChange={(dueDate) => setFormData({ ...formData, dueDate })}
								placeholder="Enter date or 'tomorrow at 2pm'"
							/>
						</div>

						{/* From */}
						<div className="space-y-2">
							<Label htmlFor="from" className="text-base flex items-center justify-between">
								<span className="flex items-center gap-2">
									<User className="w-4 h-4" />
									From <span className="text-xs">(optional)</span>
								</span>
								<span className={`text-xs ${formData.from.length > 20 ? 'text-red-500 font-bold' : 'text-muted-foreground'}`}>
									{formData.from.length}/20
								</span>
							</Label>
							<Input
								id="from"
								placeholder="Your name or email"
								value={formData.from}
								onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, from: e.target.value })}
								maxLength={20}
							/>
							{formData.from.length > 17 && formData.from.length <= 20 && (
								<p className="text-xs text-yellow-600 dark:text-yellow-500">
									{20 - formData.from.length} characters remaining
								</p>
							)}
						</div>

							{/* Submit Button */}
							<Button
								type="submit"
								disabled={isSubmitting || isSubmitted}
								className="w-full h-12 text-base disabled:opacity-50 disabled:cursor-not-allowed"
								size="lg"
							>
								{isSubmitting ? (
									<>
										<Loader2 className="w-5 h-5 animate-spin" />
										Sending...
									</>
								) : isSubmitted ? (
									<>
										<CheckCircle2 className="w-5 h-5" />
										Sent!
									</>
								) : (
									<>
										<Send className="w-5 h-5" />
										Send TODO
									</>
								)}
							</Button>

							{/* Ticket Preview Buttons */}
							{formData.todo && (
								<div className="flex gap-2 pt-2">
									<Button
										type="button"
										variant="outline"
										onClick={openTicket}
										disabled={!formData.todo.trim()}
										className="flex-1"
									>
										<Printer className="w-4 h-4" />
										Preview Ticket
									</Button>
									<Button
										type="button"
										variant="outline"
										onClick={copyTicketUrl}
										disabled={!formData.todo.trim()}
									>
										<Copy className="w-4 h-4" />
									</Button>
								</div>
							)}
						</form>
					</CardContent>
				</Card>

				{/* API Info */}
				<Card className="mt-6 border-dashed border">
					<CardHeader className="pb-3">
						<CardTitle className="text-lg flex items-center gap-2">
							<Code2 className="w-5 h-5" />
							Use the API directly
						</CardTitle>
						<CardDescription>
							You can also send TODOs programmatically
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<code className="text-sm font-mono">
									POST /api/todos
								</code>
								<Button
									variant="outline"
									size="sm"
									onClick={() => {
										const curlCommand = `curl -X POST ${window.location.origin}/api/todos \\
  -H "Content-Type: application/json" \\
  -d '{
    "importance": 3,
    "todo": "Review the new feature",
    "description": "Check the implementation and provide feedback",
    "dueDate": "tomorrow at 5pm",
    "labels": ["work", "code-review"],
    "from": "API User"
  }'`;
										navigator.clipboard.writeText(curlCommand);
										toast.success("cURL command copied to clipboard!");
									}}
								>
									<Copy className="w-4 h-4" />
									Copy cURL
								</Button>
							</div>
							<pre className="p-4 rounded-lg overflow-x-auto text-xs border">
								<code>
{`curl -X POST ${window.location.origin}/api/todos \\
  -H "Content-Type: application/json" \\
  -d '{
    "importance": 3,
    "todo": "Review the new feature",
    "description": "Check the implementation and provide feedback",
    "dueDate": "tomorrow at 5pm",
    "labels": ["work", "code-review"],
    "from": "API User"
  }'`}
								</code>
							</pre>
							<p className="text-xs text-muted-foreground">
								Due dates support natural language like "tomorrow", "next monday at 2pm", "in 3 days"
							</p>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

export default App;
