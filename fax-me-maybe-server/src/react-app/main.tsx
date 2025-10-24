import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
import TodoTicket from "./TodoTicket.tsx";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

createRoot(document.getElementById("root")!).render(
	<StrictMode>
		<ThemeProvider defaultTheme="dark" storageKey="faxmemaybe-theme">
			<BrowserRouter>
				<Routes>
					<Route path="/" element={<App />} />
					<Route path="/todo-ticket" element={<TodoTicket />} />
				</Routes>
			</BrowserRouter>
			<Toaster />
		</ThemeProvider>
	</StrictMode>,
);
