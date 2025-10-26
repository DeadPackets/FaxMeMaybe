import { useEffect, useState } from "react";

interface FirstBloodReceiptProps {
	username?: string;
	track?: string;
	challenge?: string;
	points?: string;
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
		<div className="w-full bg-white text-black p-8" style={{
			maxWidth: "576px",
			fontFamily: "'Courier New', 'Courier', 'Monaco', monospace",
			fontSize: "14px",
			lineHeight: "1.4"
		}}>
			{/* Logo */}
			<div className="mb-4" style={{ paddingLeft: "120px" }}>
				<img
					src="https://i.imgur.com/0JLelri.png"
					alt="CTFAE"
					style={{ height: "40px", objectFit: "contain" }}
				/>
			</div>

			{/* ASCII Header and Title */}
			<div className="mb-6">
				<pre style={{ margin: 0, fontSize: "11px", lineHeight: "1.2" }}>
{`/==============================================\\`}
				</pre>
			</div>

			{/* Title */}
			<div className="mb-2" style={{ paddingLeft: "20px" }}>
				<div className="text-2xl font-bold">
					&gt;&gt;&gt; FIRST BLOOD &lt;&lt;&lt;
				</div>
			</div>

			{/* Subtitle */}
			<div className="mb-6" style={{ paddingLeft: "50px" }}>
				<div className="text-base">
					[ Achievement Receipt ]
				</div>
			</div>

			{/* Separator */}
			<div className="mb-6">
				<pre style={{ margin: 0, fontSize: "11px", lineHeight: "1.2" }}>
{`- - - - - - - - - - - - - - - - - - - - - - - -`}
				</pre>
			</div>

			{/* Player Info */}
			{params.username && (
				<div className="mb-4">
					<div className="text-xs mb-1">
						$ PLAYER:
					</div>
					<div className="pl-4 text-base font-bold">
						└─ {params.username}
					</div>
				</div>
			)}

			{/* Challenge Info */}
			{params.challenge && (
				<div className="mb-4">
					<div className="text-xs mb-1">
						$ CHALLENGE:
					</div>
					<div className="pl-4 text-base font-bold break-words">
						└─ {params.challenge}
					</div>
				</div>
			)}

			{/* CTF and Points Grid */}
			<div className="mb-4">
				<div className="text-xs mb-1">
					$ CTF_NAME:
				</div>
				<div className="pl-4 text-base font-bold">
					└─ Dubai Police CTF 2025
				</div>
			</div>

			{params.points && (
				<div className="mb-6">
					<div className="text-xs mb-1">
						$ POINTS:
					</div>
					<div className="pl-4 text-lg font-bold">
						└─ +{params.points} PTS
					</div>
				</div>
			)}

			{/* Status Box */}
			<div className="mb-6">
				<pre className="text-xs" style={{ margin: 0 }}>
{`+-------------------------------------------+
| [+] STATUS: SUCCESS                       |
| [i] The first to solve this challenge! 	|
+-------------------------------------------+`}
				</pre>
			</div>

			{/* Footer and Bottom Border */}
			<div>
				<pre style={{ margin: 0, fontSize: "11px", lineHeight: "1.2" }}>
{`- - - - - - - - - - - - - - - - - - - - - - - -

     Generated: ${getCurrentTime()}

\\==============================================/`}
				</pre>
			</div>
		</div>
	);
}

export default FirstBloodReceipt;
