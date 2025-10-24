import { useEffect, useState } from "react";
import { Flame, Calendar, User } from "lucide-react";

const IMPORTANCE_LEVELS = [
	{ value: 1, label: "Low", count: 1 },
	{ value: 2, label: "Medium", count: 2 },
	{ value: 3, label: "High", count: 3 },
	{ value: 4, label: "Urgent", count: 4 },
	{ value: 5, label: "Critical", count: 5 },
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
		<div className="w-full bg-white text-black border-4 border-black p-12" style={{
			maxWidth: "576px",
		}}>
			{/* 1. Importance Icons (Flame) */}
			<div className="text-center mb-6">
				<div className="flex justify-center items-center gap-2">
					{Array.from({ length: importanceLevel.count }).map((_, i) => (
						<Flame key={i} className="w-16 h-16" strokeWidth={2} fill="currentColor" />
					))}
				</div>
			</div>

			{/* 2. Importance Label */}
			<div className="text-center mb-8">
				<div className="text-2xl font-bold uppercase tracking-wider">
					{importanceLevel.label}
				</div>
			</div>

			{/* 3. Separator */}
			<div className="border-t border-gray-950 mb-10"></div>

			{/* 4. TODO Content */}
			<div className="text-center mb-10">
				<div className="text-5xl font-bold leading-tight break-words">
					{params.todo}
				</div>
			</div>

			{/* 5. Due Date Subtext */}
			{params.dueDate && (
				<div className="text-center mb-4">
					<div className="flex justify-center items-center gap-3">
						<Calendar className="w-8 h-8" strokeWidth={2} />
						<div className="text-2xl font-semibold">
							Due: {formatDate(params.dueDate)}
						</div>
					</div>
				</div>
			)}

			{/* 6. Author/From Subtext */}
			{params.from && (
				<div className="text-center mb-10">
					<div className="flex justify-center items-center gap-3">
						<User className="w-8 h-8" strokeWidth={2} />
						<div className="text-2xl font-semibold break-words">
							From: {params.from}
						</div>
					</div>
				</div>
			)}

			{/* 7. Separator */}
			<div className="border-t border-gray-950 mt-10 mb-6"></div>

			{/* 8. Footer with timestamp and branding */}
			<div className="text-center text-lg font-medium">
				{formatTimestamp(params.timestamp)} • Powered by FaxMeMaybe
			</div>
		</div>
	);
}

export default TodoTicket;

