import { useState, FormEvent, ChangeEvent } from "react";
import { Loader2, Send, Flame, CheckCircle2, Calendar, User, Copy, Code2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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

	const selectedLevel = IMPORTANCE_LEVELS.find((level) => level.value === formData.importance);

	return (
		<div className="min-h-screen flex items-center justify-center p-4">
			<div className="w-full max-w-2xl">
				<div className="text-center mb-8">
					<div className="inline-flex items-center justify-center mb-4">
						<Flame className="w-12 h-12 mr-2" />
						<h1 className="text-5xl font-bold">FaxMeMaybe</h1>
					</div>
					<p className="text-lg">
						Send me a TODO, I'll get to it... eventually.
					</p>
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
							<div className="space-y-3">
								<Label htmlFor="importance" className="text-base">
									Importance Level
								</Label>
								<div className="grid grid-cols-5 gap-2">
									{IMPORTANCE_LEVELS.map((level) => (
										<button
											key={level.value}
											type="button"
											onClick={() => setFormData({ ...formData, importance: level.value })}
											className={`
												relative p-3 rounded-lg border-2 transition-all duration-200
												${formData.importance === level.value ? "shadow-md scale-105" : ""}
											`}
											title={`${level.label}: ${level.description}`}
										>
											<div className="text-2xl mb-1">{level.emoji}</div>
											<div className="text-xs font-medium">{level.label}</div>
										</button>
									))}
								</div>
								{selectedLevel && (
									<p className="text-sm flex items-center gap-2">
										<Flame className="w-4 h-4" />
										{selectedLevel.description}
									</p>
								)}
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

