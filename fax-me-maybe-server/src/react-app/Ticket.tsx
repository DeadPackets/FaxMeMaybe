import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import QRCode from "qrcode";

export const IMPORTANCE_LEVELS = [
	{ value: 1, label: "Low", hint: "When you have time" },
	{ value: 2, label: "Medium", hint: "This week would be nice" },
	{ value: 3, label: "High", hint: "Pretty important" },
	{ value: 4, label: "Urgent", hint: "Need this soon" },
	{ value: 5, label: "Critical", hint: "Drop everything" },
] as const;

export interface TicketProps {
	id?: string;
	todo: string;
	importance: number;
	dueDate?: string;
	from?: string;
	labels?: string[];
	createdAt: string;
	qrUrl?: string;
	onQrLoad?: () => void;
}

// Todoist due dates are YYYY-MM-DD[THH:MM]; form previews can hold natural language like "tomorrow"
function formatDue(due: string) {
	const m = due.match(/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/);
	if (!m) return due.toUpperCase();
	const day = new Date(+m[1], +m[2] - 1, +m[3])
		.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })
		.replace(",", "")
		.toUpperCase();
	return m[4] ? `${day} ${m[4]}:${m[5]}` : day;
}

function formatCreated(iso: string) {
	const date = new Date(iso);
	if (isNaN(date.getTime())) return "";
	return date
		.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
		.replace(",", "")
		.toUpperCase();
}

export function Ticket({ id, todo, importance, dueDate, from, labels, createdAt, qrUrl, onQrLoad }: TicketProps) {
	const [qr, setQr] = useState<{ src: string; modules: number } | null>(null);
	const level = IMPORTANCE_LEVELS.find((l) => l.value === importance) ?? IMPORTANCE_LEVELS[2];
	const slip = id ? `#${id.slice(0, 4).toUpperCase()}` : "PREVIEW";
	const lines = [
		["DUE", dueDate && formatDue(dueDate)],
		["FROM", from?.toUpperCase()],
		["TAGS", labels?.join(", ").toUpperCase()],
	].filter(([, value]) => value);

	useEffect(() => {
		if (!qrUrl) return;
		const modules = QRCode.create(qrUrl, { errorCorrectionLevel: "M" }).modules.size;
		QRCode.toString(qrUrl, { type: "svg", margin: 0, errorCorrectionLevel: "M" })
			.then((svg) => setQr({ src: `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`, modules }))
			.catch((err) => console.error("Error generating QR code:", err));
	}, [qrUrl]);

	return (
		<div className="ticket font-sans">
			<div className="ticket-body">
				<div className="ticket-brand">
					<span>FAXMEMAYBE</span>
					<span>{slip}</span>
				</div>
				<div className="ticket-rule" />
				<div className="ticket-flames" role="img" aria-label={`Importance ${level.value} of 5`}>
					{IMPORTANCE_LEVELS.map((l) => (
						<Flame key={l.value} strokeWidth={2} fill={l.value <= level.value ? "currentColor" : "none"} />
					))}
				</div>
				<div className="ticket-level">{level.label.toUpperCase()}</div>
				<div className="ticket-rule" />
				<p className="ticket-todo">{todo}</p>
				<div className="ticket-rule" />
				{lines.length > 0 && (
					<>
						{lines.map(([key, value]) => (
							<div key={key} className="ticket-line">
								<span>{key}</span>
								<span className="dots" />
								<span className="value">{value}</span>
							</div>
						))}
						<div className="ticket-rule" />
					</>
				)}
				<div className="ticket-done">
					{qr ? (
						// 5 px per module keeps every module on whole printer dots
						<img src={qr.src} alt="QR code that opens this task in Todoist" style={{ width: qr.modules * 5, maxWidth: "34cqw" }} onLoad={onQrLoad} />
					) : (
						<div className="qr-slot" aria-hidden="true">QR</div>
					)}
					<p>
						Scan it when it's done.
						<small>Opens the task in Todoist</small>
					</p>
				</div>
				<div className="ticket-tear">TEAR HERE</div>
				<div className="ticket-foot">
					<span>{formatCreated(createdAt)}</span>
					<span>REMIND.DEADPACKETS.PW</span>
				</div>
			</div>
		</div>
	);
}
