import { useEffect, useState } from "react";
import { Flame, Calendar, User, Clock } from "lucide-react";

const IMPORTANCE_LEVELS = [
	{ value: 1, label: "Low", emoji: "🔥" },
	{ value: 2, label: "Medium", emoji: "🔥🔥" },
	{ value: 3, label: "High", emoji: "🔥🔥🔥" },
	{ value: 4, label: "Urgent", emoji: "🔥🔥🔥🔥" },
	{ value: 5, label: "Critical", emoji: "🔥🔥🔥🔥🔥" },
] as const;

interface TodoTicketProps {
	todo?: string;
	importance?: number;
	dueDate?: string;
	from?: string;
	timestamp?: string;
}

function TodoTicket() {
	const [params, setParams] = useState<TodoTicketProps>({});

	useEffect(() => {
		// Parse URL parameters
		const urlParams = new URLSearchParams(window.location.search);
		setParams({
			todo: urlParams.get("todo") || "No TODO specified",
			importance: parseInt(urlParams.get("importance") || "3"),
			dueDate: urlParams.get("dueDate") || undefined,
			from: urlParams.get("from") || undefined,
			timestamp: urlParams.get("timestamp") || new Date().toISOString(),
		});

		// Add print styles
		const style = document.createElement("style");
		style.textContent = `
			body {
				margin: 0 !important;
				padding: 0 !important;
				background: white !important;
			}
			html {
				margin: 0 !important;
				padding: 0 !important;
			}
			@media print {
				body {
					margin: 0;
					padding: 0;
					background: white !important;
				}
				@page {
					size: 576px auto;
					margin: 0;
				}
			}
		`;
		document.head.appendChild(style);

		return () => {
			document.head.removeChild(style);
		};
	}, []);

	const importanceLevel = IMPORTANCE_LEVELS.find(
		(level) => level.value === params.importance
	) || IMPORTANCE_LEVELS[2];

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

	return (
		<div className="w-full bg-white text-black border-4 border-black" style={{ maxWidth: "576px" }}>
				{/* Header */}
				<div className="border-b-4 border-black p-6 bg-gray-100">
					<div className="flex items-center justify-between mb-2">
						<div className="flex items-center gap-2">
							<Flame className="w-8 h-8" />
							<h1 className="text-3xl font-bold">FaxMeMaybe</h1>
						</div>
						<div className="text-right">
							<div className="text-xs font-mono text-gray-600">
								TODO TICKET
							</div>
						</div>
					</div>
				</div>

				{/* Importance Level */}
				<div className="border-b-4 border-black p-6 bg-gray-50">
					<div className="flex items-center justify-between">
						<div>
							<div className="text-xs font-bold text-gray-600 mb-1">
								IMPORTANCE LEVEL
							</div>
							<div className="flex items-center gap-2">
								<span className="text-3xl">{importanceLevel.emoji}</span>
								<span className="text-2xl font-bold">
									{importanceLevel.label}
								</span>
							</div>
						</div>
						<div className="text-right">
							<div className="text-4xl font-bold">
								{params.importance || 3}/5
							</div>
						</div>
					</div>
				</div>

				{/* TODO Content */}
				<div className="border-b-4 border-black p-6">
					<div className="text-xs font-bold text-gray-600 mb-2">
						TASK DESCRIPTION
					</div>
					<div className="text-lg font-medium leading-relaxed break-words">
						{params.todo}
					</div>
				</div>

				{/* Metadata */}
				<div className="border-b-4 border-black p-6 bg-gray-50 space-y-4">
					{params.dueDate && (
						<div className="flex items-start gap-3">
							<Calendar className="w-5 h-5 mt-0.5 flex-shrink-0" />
							<div>
								<div className="text-xs font-bold text-gray-600">
									DUE DATE
								</div>
								<div className="text-base font-medium">
									{formatDate(params.dueDate)}
								</div>
							</div>
						</div>
					)}

					{params.from && (
						<div className="flex items-start gap-3">
							<User className="w-5 h-5 mt-0.5 flex-shrink-0" />
							<div>
								<div className="text-xs font-bold text-gray-600">
									FROM
								</div>
								<div className="text-base font-medium break-words">
									{params.from}
								</div>
							</div>
						</div>
					)}

					{params.timestamp && (
						<div className="flex items-start gap-3">
							<Clock className="w-5 h-5 mt-0.5 flex-shrink-0" />
							<div>
								<div className="text-xs font-bold text-gray-600">
									CREATED
								</div>
								<div className="text-base font-medium">
									{formatTimestamp(params.timestamp)}
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="p-6 bg-gray-100">
					<div className="text-center">
						<div className="text-xs text-gray-600 font-mono">
							Generated by FaxMeMaybe
						</div>
						<div className="text-xs text-gray-500 font-mono mt-1">
							remind.deadpackets.pw
						</div>
					</div>
				</div>
			</div>
	);
}

export default TodoTicket;

