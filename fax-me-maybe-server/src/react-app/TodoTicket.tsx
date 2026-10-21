import { useEffect, useState } from "react";
import { Ticket } from "./Ticket";

// Render target for the worker's headless browser: exactly 576 px, the width of 80 mm thermal paper
function TodoTicket() {
	const params = new URLSearchParams(window.location.search);
	const qrUrl = params.get("qr") || undefined;
	const [fontsReady, setFontsReady] = useState(false);
	const [qrReady, setQrReady] = useState(!qrUrl);

	useEffect(() => {
		document.fonts.ready.then(() => setFontsReady(true));
	}, []);

	return (
		<div style={{ width: 576 }} data-ticket-ready={fontsReady && qrReady ? "" : undefined}>
			<Ticket
				id={params.get("id") || undefined}
				todo={params.get("todo") || "No TODO specified"}
				importance={Number(params.get("importance")) || 3}
				dueDate={params.get("dueDate") || undefined}
				from={params.get("from") || undefined}
				labels={params.get("labels")?.split(",").filter((l) => l.trim())}
				createdAt={params.get("created_at") || new Date().toISOString()}
				qrUrl={qrUrl}
				onQrLoad={() => setQrReady(true)}
			/>
		</div>
	);
}

export default TodoTicket;
