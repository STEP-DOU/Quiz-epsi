import { Outlet } from "react-router-dom";
import NavBar from "./components/NavBar";

export default function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-5xl mx-auto p-4">
        <Outlet />
      </main>
    </div>
  );
}
