"use client";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-center items-center min-h-[calc(100vh-64px)] flex-col space-y-6">
        <h1 className="text-4xl font-bold mb-4">Welcome to WordDash!</h1>
        <p className="text-lg mb-6">
          Test your typing speed against opponents in real-time!
        </p>
        <div className="flex flex-col space-y-4">
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
            onClick={() => router.push("/random")}
          >
            Start a Random Game
          </button>
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
            onClick={() => router.push("/create")}
          >
            Create a Private Game
          </button>
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition"
            onClick={() => router.push("/join")}
          >
            Join a Private Game
          </button>
        </div>
      </div>
    </div>
  );
}
