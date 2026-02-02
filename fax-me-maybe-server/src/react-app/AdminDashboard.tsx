import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
	Loader2,
	CheckCircle2,
	XCircle,
	Trash2,
	Calendar,
	User,
	Flame,
	Home,
	BarChart3,
	RefreshCw,
	LogOut,
	Sun,
	Moon,
	ExternalLink,
	Tag,
	FileText
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTheme } from "@/components/theme-provider";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

function ModeToggle() {
	const { setTheme } = useTheme();

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
	);
}

// Updated interface to match Todoist data structure
interface Todo {
	id: string;
	todoistId: string;
	content: string;
	description: string;
	importance: number;
	labels: string[];
	dueDate?: string;
	dueString?: string;
	from?: string;
	source?: string;
	completed: boolean;
	completedAt?: string;
	createdAt: string;
	url: string;
}

interface Stats {
	total: number;
	completed: number;
	pending: number;
	byImportance: Record<number, number>;
	bySource: Record<string, number>;
	byLabel: Record<string, number>;
}

const IMPORTANCE_LEVELS = [
	{ value: 1, label: "Low", emoji: "🔥" },
	{ value: 2, label: "Medium", emoji: "🔥🔥" },
	{ value: 3, label: "High", emoji: "🔥🔥🔥" },
	{ value: 4, label: "Urgent", emoji: "🔥🔥🔥🔥" },
	{ value: 5, label: "Critical", emoji: "🔥🔥🔥🔥🔥" },
] as const;

function AdminDashboard() {
	const navigate = useNavigate();
	const [apiKey, setApiKey] = useState("");
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [isAuthenticating, setIsAuthenticating] = useState(false);
	const [todos, setTodos] = useState<Todo[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [stats, setStats] = useState<Stats>({
		total: 0,
		completed: 0,
		pending: 0,
		byImportance: {},
		bySource: {},
		byLabel: {},
	});
	const [activeTab, setActiveTab] = useState<"all" | "pending" | "completed">("all");

	const testApiKey = useCallback(async (key: string) => {
		setIsAuthenticating(true);
		try {
			const response = await fetch("/api/todos?limit=1", {
				headers: {
					"X-API-KEY": key,
				},
			});

			if (response.ok) {
				setIsAuthenticated(true);
				localStorage.setItem("faxmemaybe_api_key", key);
				fetchTodos(key);
			} else {
				setIsAuthenticated(false);
				localStorage.removeItem("faxmemaybe_api_key");
				toast.error("Invalid API key");
			}
		} catch (error) {
			console.error("Error testing API key:", error);
			toast.error("Failed to authenticate");
		} finally {
			setIsAuthenticating(false);
		}
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	// Check if API key is stored in localStorage
	useEffect(() => {
		const storedApiKey = localStorage.getItem("faxmemaybe_api_key");
		if (storedApiKey) {
			setApiKey(storedApiKey);
			testApiKey(storedApiKey);
		}
	}, [testApiKey]);

	const handleLogin = (e: React.FormEvent) => {
		e.preventDefault();
		if (!apiKey.trim()) {
			toast.error("Please enter an API key");
			return;
		}
		testApiKey(apiKey.trim());
	};

	const handleLogout = () => {
		setIsAuthenticated(false);
		setApiKey("");
		localStorage.removeItem("faxmemaybe_api_key");
		setTodos([]);
		toast.success("Logged out successfully");
	};

	const fetchTodos = async (key?: string) => {
		const currentApiKey = key || apiKey;
		if (!currentApiKey) return;

		setIsLoading(true);
		try {
			const response = await fetch("/api/todos?limit=1000", {
				headers: {
					"X-API-KEY": currentApiKey,
				},
			});

			if (response.ok) {
				const data = await response.json();
				setTodos(data.todos || []);
				calculateStats(data.todos || []);
			} else {
				toast.error("Failed to fetch TODOs");
			}
		} catch (error) {
			console.error("Error fetching TODOs:", error);
			toast.error("Failed to fetch TODOs");
		} finally {
			setIsLoading(false);
		}
	};

	const calculateStats = (todoList: Todo[]) => {
		const total = todoList.length;
		const completed = todoList.filter(t => t.completed).length;
		const pending = total - completed;

		const byImportance: Record<number, number> = {};
		const bySource: Record<string, number> = {};
		const byLabel: Record<string, number> = {};

		todoList.forEach(todo => {
			byImportance[todo.importance] = (byImportance[todo.importance] || 0) + 1;
			if (todo.source) {
				bySource[todo.source] = (bySource[todo.source] || 0) + 1;
			}
			todo.labels?.forEach(label => {
				byLabel[label] = (byLabel[label] || 0) + 1;
			});
		});

		setStats({ total, completed, pending, byImportance, bySource, byLabel });
	};

	const toggleComplete = async (todo: Todo) => {
		try {
			const endpoint = todo.completed
				? `/api/todos/${todo.id}/incomplete`
				: `/api/todos/${todo.id}/complete`;

			const method = todo.completed ? "PATCH" : "GET";

			const response = await fetch(endpoint, {
				method,
				headers: {
					"X-API-KEY": apiKey,
				},
			});

			if (response.ok) {
				toast.success(todo.completed ? "Marked as incomplete" : "Marked as complete");
				fetchTodos();
			} else {
				toast.error("Failed to update TODO");
			}
		} catch (error) {
			console.error("Error updating TODO:", error);
			toast.error("Failed to update TODO");
		}
	};

	const deleteTodo = async (id: string) => {
		if (!confirm("Are you sure you want to delete this TODO?")) return;

		try {
			const response = await fetch(`/api/todos/${id}`, {
				method: "DELETE",
				headers: {
					"X-API-KEY": apiKey,
				},
			});

			if (response.ok) {
				toast.success("TODO deleted successfully");
				fetchTodos();
			} else {
				toast.error("Failed to delete TODO");
			}
		} catch (error) {
			console.error("Error deleting TODO:", error);
			toast.error("Failed to delete TODO");
		}
	};

	const formatDate = (dateString?: string) => {
		if (!dateString) return "N/A";
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

	const formatDateTime = (dateString?: string) => {
		if (!dateString) return "N/A";
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

	const getImportanceLabel = (importance: number) => {
		return IMPORTANCE_LEVELS.find(l => l.value === importance) || IMPORTANCE_LEVELS[2];
	};

	const filteredTodos = todos.filter(todo => {
		if (activeTab === "pending") return !todo.completed;
		if (activeTab === "completed") return todo.completed;
		return true;
	});

	// Login screen
	if (!isAuthenticated) {
		return (
			<div className="min-h-screen flex items-center justify-center p-4">
				<Card className="w-full max-w-md">
					<CardHeader>
						<CardTitle className="text-2xl">Admin Login</CardTitle>
						<CardDescription>
							Enter your API key to access the admin dashboard
						</CardDescription>
					</CardHeader>
					<CardContent>
						<form onSubmit={handleLogin} className="space-y-4">
							<div className="space-y-2">
								<Label htmlFor="apiKey">API Key</Label>
								<Input
									id="apiKey"
									type="password"
									placeholder="Enter your API key"
									value={apiKey}
									onChange={(e) => setApiKey(e.target.value)}
									disabled={isAuthenticating}
								/>
							</div>
							<Button
								type="submit"
								className="w-full"
								disabled={isAuthenticating}
							>
								{isAuthenticating ? (
									<>
										<Loader2 className="w-4 h-4 animate-spin mr-2" />
										Authenticating...
									</>
								) : (
									"Login"
								)}
							</Button>
							<Button
								type="button"
								variant="outline"
								className="w-full"
								onClick={() => navigate("/")}
							>
								<Home className="w-4 h-4 mr-2" />
								Back to Home
							</Button>
						</form>
					</CardContent>
				</Card>
			</div>
		);
	}

	// Admin Dashboard
	return (
		<div className="min-h-screen p-4 md:p-8">
			<div className="max-w-7xl mx-auto space-y-6">
				{/* Header */}
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-4xl font-bold">Admin Dashboard</h1>
						<div className="flex items-center gap-2 mt-2">
							<p className="text-muted-foreground">
								Manage and monitor your TODOs
							</p>
							<Badge variant="secondary">Powered by Todoist</Badge>
						</div>
					</div>
					<div className="flex gap-2">
						<ModeToggle />
						<Button
							variant="outline"
							onClick={() => navigate("/")}
						>
							<Home className="w-4 h-4 mr-2" />
							Home
						</Button>
						<Button
							variant="outline"
							onClick={() => fetchTodos()}
							disabled={isLoading}
						>
							<RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
							Refresh
						</Button>
						<Button
							variant="outline"
							onClick={handleLogout}
						>
							<LogOut className="w-4 h-4 mr-2" />
							Logout
						</Button>
					</div>
				</div>

				{/* Stats Cards */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium text-muted-foreground">
								Total TODOs
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-3xl font-bold">{stats.total}</div>
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium text-muted-foreground">
								Completed
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-3xl font-bold text-green-600 dark:text-green-500">
								{stats.completed}
							</div>
							{stats.total > 0 && (
								<p className="text-xs text-muted-foreground mt-1">
									{Math.round((stats.completed / stats.total) * 100)}% completion rate
								</p>
							)}
						</CardContent>
					</Card>
					<Card>
						<CardHeader className="pb-2">
							<CardTitle className="text-sm font-medium text-muted-foreground">
								Pending
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="text-3xl font-bold text-orange-600 dark:text-orange-500">
								{stats.pending}
							</div>
						</CardContent>
					</Card>
				</div>

				{/* Breakdown Stats */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<BarChart3 className="w-5 h-5" />
								By Importance Level
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-2">
								{IMPORTANCE_LEVELS.map(level => (
									<div key={level.value} className="flex items-center justify-between">
										<div className="flex items-center gap-2">
											<span>{level.emoji}</span>
											<span className="font-medium">{level.label}</span>
										</div>
										<Badge variant="secondary">
											{stats.byImportance[level.value] || 0}
										</Badge>
									</div>
								))}
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<BarChart3 className="w-5 h-5" />
								By Source
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-2">
								{Object.keys(stats.bySource).length === 0 ? (
									<p className="text-sm text-muted-foreground">No source data</p>
								) : (
									Object.entries(stats.bySource).map(([source, count]) => (
										<div key={source} className="flex items-center justify-between">
											<span className="font-medium capitalize">{source}</span>
											<Badge variant="secondary">{count}</Badge>
										</div>
									))
								)}
							</div>
						</CardContent>
					</Card>
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Tag className="w-5 h-5" />
								By Label
							</CardTitle>
						</CardHeader>
						<CardContent>
							<div className="space-y-2">
								{Object.keys(stats.byLabel).length === 0 ? (
									<p className="text-sm text-muted-foreground">No labels used</p>
								) : (
									Object.entries(stats.byLabel)
										.sort((a, b) => b[1] - a[1])
										.slice(0, 5)
										.map(([label, count]) => (
											<div key={label} className="flex items-center justify-between">
												<span className="font-medium">{label}</span>
												<Badge variant="secondary">{count}</Badge>
											</div>
										))
								)}
							</div>
						</CardContent>
					</Card>
				</div>

				{/* TODOs Table */}
				<Card>
					<CardHeader>
						<CardTitle>All TODOs</CardTitle>
						<CardDescription>
							View and manage all submitted TODOs (synced from Todoist)
						</CardDescription>
					</CardHeader>
					<CardContent>
						<Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
							<TabsList className="mb-4">
								<TabsTrigger value="all">All ({stats.total})</TabsTrigger>
								<TabsTrigger value="pending">Pending ({stats.pending})</TabsTrigger>
								<TabsTrigger value="completed">Completed ({stats.completed})</TabsTrigger>
							</TabsList>

							<TabsContent value={activeTab} className="mt-0">
								{isLoading ? (
									<div className="flex items-center justify-center py-8">
										<Loader2 className="w-8 h-8 animate-spin" />
									</div>
								) : filteredTodos.length === 0 ? (
									<Alert>
										<AlertDescription>
											No TODOs found in this category.
										</AlertDescription>
									</Alert>
								) : (
									<div className="overflow-x-auto">
										<Table>
											<TableHeader>
												<TableRow>
													<TableHead>TODO</TableHead>
													<TableHead>Importance</TableHead>
													<TableHead>Labels</TableHead>
													<TableHead>From</TableHead>
													<TableHead>Due Date</TableHead>
													<TableHead>Created</TableHead>
													<TableHead>Status</TableHead>
													<TableHead className="text-right">Actions</TableHead>
												</TableRow>
											</TableHeader>
											<TableBody>
												{filteredTodos.map((todo) => (
													<TableRow key={todo.id}>
														<TableCell className="font-medium max-w-xs">
															<div className="space-y-1">
																<div className="truncate">{todo.content}</div>
																{todo.description && (
																	<TooltipProvider>
																		<Tooltip>
																			<TooltipTrigger asChild>
																				<div className="flex items-center gap-1 text-xs text-muted-foreground cursor-help">
																					<FileText className="w-3 h-3" />
																					<span className="truncate max-w-[150px]">{todo.description}</span>
																				</div>
																			</TooltipTrigger>
																			<TooltipContent className="max-w-sm">
																				<p>{todo.description}</p>
																			</TooltipContent>
																		</Tooltip>
																	</TooltipProvider>
																)}
															</div>
														</TableCell>
														<TableCell>
															<div className="flex items-center gap-2">
																<Flame className="w-4 h-4" />
																<span>{getImportanceLabel(todo.importance).label}</span>
															</div>
														</TableCell>
														<TableCell>
															{todo.labels && todo.labels.length > 0 ? (
																<div className="flex flex-wrap gap-1">
																	{todo.labels.slice(0, 2).map(label => (
																		<Badge key={label} variant="outline" className="text-xs">
																			{label}
																		</Badge>
																	))}
																	{todo.labels.length > 2 && (
																		<Badge variant="outline" className="text-xs">
																			+{todo.labels.length - 2}
																		</Badge>
																	)}
																</div>
															) : (
																<span className="text-muted-foreground">-</span>
															)}
														</TableCell>
														<TableCell>
															{todo.from ? (
																<div className="flex items-center gap-1">
																	<User className="w-3 h-3" />
																	<span className="text-sm">{todo.from}</span>
																</div>
															) : (
																<span className="text-muted-foreground">-</span>
															)}
														</TableCell>
														<TableCell>
															{todo.dueDate || todo.dueString ? (
																<div className="flex items-center gap-1">
																	<Calendar className="w-3 h-3" />
																	<span className="text-sm">
																		{todo.dueString || formatDate(todo.dueDate)}
																	</span>
																</div>
															) : (
																<span className="text-muted-foreground">-</span>
															)}
														</TableCell>
														<TableCell className="text-sm text-muted-foreground">
															{formatDateTime(todo.createdAt)}
														</TableCell>
														<TableCell>
															{todo.completed ? (
																<Badge variant="default" className="bg-green-600">
																	<CheckCircle2 className="w-3 h-3 mr-1" />
																	Complete
																</Badge>
															) : (
																<Badge variant="secondary">
																	<XCircle className="w-3 h-3 mr-1" />
																	Pending
																</Badge>
															)}
														</TableCell>
														<TableCell className="text-right">
															<div className="flex items-center justify-end gap-2">
																{todo.url && (
																	<TooltipProvider>
																		<Tooltip>
																			<TooltipTrigger asChild>
																				<Button
																					variant="ghost"
																					size="sm"
																					onClick={() => window.open(todo.url, '_blank')}
																				>
																					<ExternalLink className="w-4 h-4" />
																				</Button>
																			</TooltipTrigger>
																			<TooltipContent>
																				<p>Open in Todoist</p>
																			</TooltipContent>
																		</Tooltip>
																	</TooltipProvider>
																)}
																<Button
																	variant="ghost"
																	size="sm"
																	onClick={() => toggleComplete(todo)}
																>
																	{todo.completed ? (
																		<XCircle className="w-4 h-4" />
																	) : (
																		<CheckCircle2 className="w-4 h-4" />
																	)}
																</Button>
																<Button
																	variant="ghost"
																	size="sm"
																	onClick={() => deleteTodo(todo.id)}
																	className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
																>
																	<Trash2 className="w-4 h-4" />
																</Button>
															</div>
														</TableCell>
													</TableRow>
												))}
											</TableBody>
										</Table>
									</div>
								)}
							</TabsContent>
						</Tabs>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

export default AdminDashboard;
