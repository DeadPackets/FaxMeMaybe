import { useEffect, useState, useCallback } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Flame, Calendar, User, CheckCircle2, Loader2, AlertCircle, Home, Tag, FileText, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

const IMPORTANCE_LEVELS = [
	{ value: 1, label: "Low", count: 1 },
	{ value: 2, label: "Medium", count: 2 },
	{ value: 3, label: "High", count: 3 },
	{ value: 4, label: "Urgent", count: 4 },
	{ value: 5, label: "Critical", count: 5 },
] as const;

interface TodoLabel {
	id: string;
	name: string;
	color: string;
}

interface Todo {
	id: string;
	todoist_id: string;
	todo: string;
	description?: string;
	importance: number;
	source: string;
	duedate?: string;
	from?: string;
	created_at: string;
	completed: boolean;
	completed_at?: string;
	labels: TodoLabel[];
	url?: string;
}

function ViewTodo() {
	const [searchParams] = useSearchParams();
	const todoId = searchParams.get("id");

	const [todo, setTodo] = useState<Todo | null>(null);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [isMarkingComplete, setIsMarkingComplete] = useState(false);

	const fetchTodo = useCallback(async () => {
		if (!todoId) return;

		try {
			setIsLoading(true);
			setError(null);

			const response = await fetch(`/api/todos/${todoId}`);
			const data = await response.json();

			if (response.ok && data.success) {
				setTodo(data.todo);
			} else {
				setError(data.error || "Failed to fetch TODO");
			}
		} catch (err) {
			console.error("Error fetching TODO:", err);
			setError("Failed to fetch TODO. Please try again.");
		} finally {
			setIsLoading(false);
		}
	}, [todoId]);

	useEffect(() => {
		if (!todoId) {
			setError("No TODO ID provided");
			setIsLoading(false);
			return;
		}

		fetchTodo();
	}, [todoId, fetchTodo]);

	const handleMarkComplete = async () => {
		if (!todoId || !todo) return;

		try {
			setIsMarkingComplete(true);

			const response = await fetch(`/api/todos/${todoId}/complete`);
			const data = await response.json();

			if (response.ok && data.success) {
				toast.success("TODO marked as complete! 🎉");
				// Refresh the todo to show updated status
				await fetchTodo();
			} else {
				toast.error(data.error || "Failed to mark TODO as complete");
			}
		} catch (err) {
			console.error("Error marking TODO as complete:", err);
			toast.error("Failed to mark TODO as complete. Please try again.");
		} finally {
			setIsMarkingComplete(false);
		}
	};

	const formatDate = (dateString?: string) => {
		if (!dateString) return null;
		try {
			const date = new Date(dateString);
			return date.toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
				year: "numeric",
			});
		} catch {
			return dateString;
		}
	};

	const formatTimestamp = (dateString?: string) => {
		if (!dateString) return null;
		try {
			const date = new Date(dateString);
			return date.toLocaleString("en-US", {
				month: "short",
				day: "numeric",
				year: "numeric",
				hour: "2-digit",
				minute: "2-digit",
			});
		} catch {
			return dateString;
		}
	};

	if (isLoading) {
		return (
			<div className="min-h-screen flex items-center justify-center p-4">
				<Card className="w-full max-w-2xl">
					<CardContent className="flex flex-col items-center justify-center py-16">
						<Loader2 className="w-12 h-12 animate-spin mb-4" />
						<p className="text-lg text-muted-foreground">Loading TODO...</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (error || !todo) {
		return (
			<div className="min-h-screen flex items-center justify-center p-4">
				<Card className="w-full max-w-2xl">
					<CardContent className="py-8">
						<Alert variant="destructive">
							<AlertCircle className="h-4 w-4" />
							<AlertTitle>Error</AlertTitle>
							<AlertDescription>
								{error || "TODO not found"}
							</AlertDescription>
						</Alert>
						<div className="mt-6 flex justify-center">
							<Link to="/">
								<Button variant="outline">
									<Home className="w-4 h-4 mr-2" />
									Go Home
								</Button>
							</Link>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	const importanceLevel = IMPORTANCE_LEVELS.find(
		(level) => level.value === todo.importance
	) || IMPORTANCE_LEVELS[2];

	const isCompleted = todo.completed === true;

	return (
		<div className="min-h-screen flex items-center justify-center p-4">
			<div className="w-full max-w-2xl">
				<div className="flex justify-between items-center mb-6">
					<Link to="/">
						<Button variant="outline" size="sm">
							<Home className="w-4 h-4 mr-2" />
							Home
						</Button>
					</Link>
					{isCompleted && (
						<div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20">
							<CheckCircle2 className="w-5 h-5 text-green-500" />
							<span className="font-semibold text-green-500">Completed</span>
						</div>
					)}
				</div>

				<Card className="shadow-xl border">
					<CardHeader>
						<div className="flex items-center justify-between">
							<div>
								<CardTitle className="text-3xl mb-2">TODO Details</CardTitle>
								<CardDescription>
									Created {formatTimestamp(todo.created_at)}
								</CardDescription>
							</div>
							<div className="flex items-center gap-2">
								{Array.from({ length: importanceLevel.count }).map((_, i) => (
									<Flame key={i} className="w-8 h-8" strokeWidth={2} fill="currentColor" />
								))}
							</div>
						</div>
					</CardHeader>
					<CardContent className="space-y-6">
						{/* Importance Level Badge */}
						<div>
							<div className="inline-flex items-center px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
								<span className="font-bold text-lg uppercase tracking-wide">
									{importanceLevel.label}
								</span>
							</div>
						</div>

						{/* TODO Content */}
						<div className="py-4">
							<h2 className="text-4xl font-bold leading-tight break-words">
								{todo.todo}
							</h2>
						</div>

						{/* Description */}
						{todo.description && (
							<div className="py-2">
								<div className="flex items-start gap-3">
									<FileText className="w-5 h-5 mt-1 text-muted-foreground" />
									<div className="flex-1">
										<p className="text-sm text-muted-foreground mb-1">Description</p>
										<p className="text-base whitespace-pre-wrap">{todo.description}</p>
									</div>
								</div>
							</div>
						)}

						{/* Labels */}
						{todo.labels && todo.labels.length > 0 && (
							<div className="flex items-start gap-3">
								<Tag className="w-5 h-5 mt-1 text-muted-foreground" />
								<div className="flex-1">
									<p className="text-sm text-muted-foreground mb-2">Labels</p>
									<div className="flex flex-wrap gap-2">
										{todo.labels.map((label) => (
											<Badge
												key={label.id}
												variant="secondary"
												style={{
													backgroundColor: `${label.color}20`,
													borderColor: label.color,
													color: label.color,
												}}
												className="border"
											>
												{label.name}
											</Badge>
										))}
									</div>
								</div>
							</div>
						)}

						{/* Due Date */}
						{todo.duedate && (
							<div className="flex items-center gap-3 text-lg">
								<Calendar className="w-6 h-6" />
								<div>
									<span className="text-muted-foreground">Due:</span>{" "}
									<span className="font-semibold">{formatDate(todo.duedate)}</span>
								</div>
							</div>
						)}

						{/* From */}
						{todo.from && (
							<div className="flex items-center gap-3 text-lg">
								<User className="w-6 h-6" />
								<div>
									<span className="text-muted-foreground">From:</span>{" "}
									<span className="font-semibold">{todo.from}</span>
								</div>
							</div>
						)}

						{/* Completion Status */}
						{isCompleted && todo.completed_at && (
							<Alert className="bg-green-500/5 border-green-500/20">
								<CheckCircle2 className="h-4 w-4 text-green-500" />
								<AlertTitle className="text-green-500">Completed</AlertTitle>
								<AlertDescription>
									Marked as complete on {formatTimestamp(todo.completed_at)}
								</AlertDescription>
							</Alert>
						)}

						{/* Mark Complete Button */}
						{!isCompleted && (
							<div className="pt-4">
								<Button
									onClick={handleMarkComplete}
									disabled={isMarkingComplete}
									size="lg"
									className="w-full text-lg"
								>
									{isMarkingComplete ? (
										<>
											<Loader2 className="w-5 h-5 mr-2 animate-spin" />
											Marking as Complete...
										</>
									) : (
										<>
											<CheckCircle2 className="w-5 h-5 mr-2" />
											Mark as Complete
										</>
									)}
								</Button>
							</div>
						)}

						{/* Source Badge */}
						<div className="pt-4 border-t flex items-center justify-between">
							<p className="text-sm text-muted-foreground">
								Source: <span className="font-medium">{todo.source}</span>
							</p>
							<div className="flex items-center gap-3">
								{todo.url && (
									<a
										href={todo.url}
										target="_blank"
										rel="noopener noreferrer"
										className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
									>
										<ExternalLink className="w-3 h-3" />
										Open in Todoist
									</a>
								)}
								<span className="text-xs text-muted-foreground">
									Powered by Todoist
								</span>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

export default ViewTodo;

