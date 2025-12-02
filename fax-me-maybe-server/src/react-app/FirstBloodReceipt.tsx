import { useEffect, useState } from "react";

interface FirstBloodReceiptProps {
	username?: string;
	track?: string;
	challenge?: string;
	points?: string;
	category?: string;
}

function FirstBloodReceipt() {
	const [params, setParams] = useState<FirstBloodReceiptProps>({});

	useEffect(() => {
		// Parse URL parameters
		const urlParams = new URLSearchParams(window.location.search);

		setParams({
			username: urlParams.get("username") || "CyberNinja_2025",
			track: urlParams.get("track") || "Web Exploitation",
			challenge: urlParams.get("challenge") || "SQL Injection Master",
			points: urlParams.get("points") || "500",
			category: urlParams.get("category") || "Web",
		});

		// Add print styles optimized for thermal printer with monospace terminal font
		const style = document.createElement("style");
		style.textContent = `
			body {
				margin: 0 !important;
				padding: 0 !important;
				background: white !important;
				font-family: 'Courier New', 'Courier', 'Monaco', 'Menlo', 'Consolas', monospace;
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

	// Get current local time
	const getCurrentTime = () => {
		const now = new Date();
		return now.toLocaleString("en-US", {
			month: "short",
			day: "2-digit",
			year: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			second: "2-digit",
			hour12: false,
		});
	};

	return (
		<div className="w-full bg-white text-black border-4 border-black p-12" style={{
			maxWidth: "576px",
			fontFamily: "'Courier New', 'Courier', 'Monaco', monospace",
			fontSize: "16px",
			lineHeight: "1.5"
		}}>
			{/* Logo */}
			<div className="mb-6 text-center">
				<img
					src="https://i.imgur.com/0JLelri.png"
					alt="CTFAE"
					style={{ height: "80px", objectFit: "contain", margin: "0 auto" }}
				/>
			</div>


			{/* Title */}
			<div className="mb-2 text-center">
				<div className="text-3xl font-bold">
					&gt;&gt;&gt; FIRST BLOOD &lt;&lt;&lt;
				</div>
			</div>

			{/* Subtitle */}
			<div className="mb-6 text-center">
				<div className="text-lg">
					[ Achievement Receipt ]
				</div>
			</div>


			{/* Player Info */}
			{params.username && (
				<div className="mb-4">
					<div className="text-lg mb-1">
						$ PLAYER:
					</div>
					<div className="pl-4 text-2xl font-bold">
						└─ {params.username?.toUpperCase()}
					</div>
				</div>
			)}

			{/* Challenge Info */}
			{params.challenge && (
				<div className="mb-4">
					<div className="text-lg mb-1">
						$ CHALLENGE:
					</div>
					<div className="pl-4 text-2xl font-bold break-words">
						└─ {params.challenge?.toUpperCase()}
					</div>
				</div>
			)}

			{/* Category */}
			{params.category && (
				<div className="mb-4">
					<div className="text-lg mb-1">
						$ CATEGORY:
					</div>
					<div className="pl-4 text-2xl font-bold">
						└─ {params.category.toUpperCase()}
					</div>
				</div>
			)}

			{params.points && (
				<div className="mb-6">
					<div className="text-lg mb-1">
						$ POINTS:
					</div>
					<div className="pl-4 text-2xl font-bold">
						└─ +{params.points} PTS
					</div>
				</div>
			)}

			{/* Status Box */}
			<div className="mb-6">
				<pre className="text-sm" style={{ margin: 0 }}>
{`+----------------------------------------------------------+
| [+] STATUS: SUCCESS                                      |
| [i] DUBAI POLICE CTF 2025                                |
| [*] ${getCurrentTime()}                               |
+----------------------------------------------------------+`}
				</pre>
			</div>

		</div>
	);
}

export default FirstBloodReceipt;