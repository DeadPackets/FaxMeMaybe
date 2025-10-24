import { useState, FormEvent, ChangeEvent, useEffect } from "react";
import { Loader2, Send, Flame, CheckCircle2, Calendar, User, Copy, Code2, Sun, Moon, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "@/components/theme-provider";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

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
		dueDate: "",
		from: "",
	});
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [isSubmitted, setIsSubmitted] = useState(false);
	const [todoCount, setTodoCount] = useState<number | null>(null);
	const [isLoadingCount, setIsLoadingCount] = useState(true);

	// Fetch TODO count on component mount
	useEffect(() => {
		fetchTodoCount();
	}, []);

	const fetchTodoCount = async () => {
		try {
			setIsLoadingCount(true);
			const response = await fetch("/api/todos/count");
			const data = await response.json();
			if (response.ok && data.success) {
				setTodoCount(data.count);
			}
		} catch (error) {
			console.error("Error fetching TODO count:", error);
		} finally {
			setIsLoadingCount(false);
		}
	};

	const handleSubmit = async (e: FormEvent) => {
		e.preventDefault();

		if (!formData.todo.trim()) {
			toast.error("Please enter a TODO");
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
					dueDate: formData.dueDate || undefined,
					from: formData.from || undefined,
				}),
			});

			const data = await response.json();

			if (response.ok) {
				toast.success(data.message || "TODO sent successfully!");
				setIsSubmitted(true);

				// Refresh the count
				fetchTodoCount();

				// Reset form after 2 seconds
				setTimeout(() => {
					setFormData({
						importance: 3,
						todo: "",
						dueDate: "",
						from: "",
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
		params.set("timestamp", new Date().toISOString());

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
				<div className="flex justify-end mb-4">
					<ModeToggle />
				</div>
				<div className="text-center mb-8">
					<div className="inline-flex items-center justify-center mb-4">
						<Flame className="w-12 h-12 mr-2" />
						<h1 className="text-5xl font-bold">FaxMeMaybe</h1>
					</div>
					<p className="text-lg">
						Send me a TODO, I'll get to it... eventually.
					</p>

					{/* Stats Counter */}
					<div className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-full bg-muted/50 border">
						<CheckCircle2 className="w-5 h-5 text-green-500" />
						<div className="text-sm">
							<span className="font-bold text-2xl">
								{isLoadingCount ? (
									<Loader2 className="w-6 h-6 animate-spin inline" />
								) : (
									todoCount?.toLocaleString() || "0"
								)}
							</span>
							<span className="ml-2 text-muted-foreground">
								TODOs sent so far
							</span>
						</div>
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
								<Label htmlFor="todo" className="text-base">
									What needs to be done? <span>*</span>
								</Label>
								<Textarea
									id="todo"
									placeholder="Describe the task or request..."
									value={formData.todo}
									onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, todo: e.target.value })}
									required
									rows={4}
									className="resize-none"
								/>
							</div>

							{/* Due Date */}
							<div className="space-y-2">
								<Label htmlFor="dueDate" className="text-base flex items-center gap-2">
									<Calendar className="w-4 h-4" />
									Due Date <span className="text-xs">(optional)</span>
								</Label>
								<Input
									id="dueDate"
									type="date"
									value={formData.dueDate}
									onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, dueDate: e.target.value })}
								/>
							</div>

							{/* From */}
							<div className="space-y-2">
								<Label htmlFor="from" className="text-base flex items-center gap-2">
									<User className="w-4 h-4" />
									From <span className="text-xs">(optional)</span>
								</Label>
								<Input
									id="from"
									placeholder="Your name or email"
									value={formData.from}
									onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({ ...formData, from: e.target.value })}
								/>
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
    "dueDate": "2025-10-30",
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
    "dueDate": "2025-10-30",
    "from": "API User"
  }'`}
								</code>
							</pre>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

export default App;

