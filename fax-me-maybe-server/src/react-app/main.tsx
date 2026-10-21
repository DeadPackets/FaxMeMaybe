import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";
import TodoTicket from "./TodoTicket.tsx";
import { Toaster } from "@/components/ui/sonner";

// The ticket route stays light for the headless render; the form pulls in the date picker and label search
const App = lazy(() => import("./App.tsx"));
const FirstBloodReceipt = lazy(() => import("./FirstBloodReceipt.tsx"));

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<BrowserRouter>
			<Suspense>
				<Routes>
					<Route path="/" element={<App />} />
					<Route path="/todo-ticket" element={<TodoTicket />} />
					<Route path="/first-blood-receipt" element={<FirstBloodReceipt />} />
					<Route path="*" element={<Navigate to="/" replace />} />
				</Routes>
			</Suspense>
		</BrowserRouter>
		<Toaster />
	</StrictMode>,
);
