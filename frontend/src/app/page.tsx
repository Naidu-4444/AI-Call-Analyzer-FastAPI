"use client";

import { useState, useRef } from "react";

interface AnalysisResult {
  task_id: string;
  status: string;
  transcript?: string;
  sentiment?: string;
  summary?: string;
}

export default function HomePage() {
  const [taskId, setTaskId] = useState<string | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      setError(null);
    }
  };

  const startAnalysis = async () => {
    if (!selectedFile) {
      setError("Please select an audio file first.");
      return;
    }

    setIsLoading(true);
    setResult(null);
    setError(null);
    setTaskId(null);
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/analyze-call`,
        {
          method: "POST",
          body: formData,
        }
      );
      if (!res.ok) throw new Error("Failed to start analysis");

      const data = await res.json();
      setTaskId(data.task_id);
      pollForResult(data.task_id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "An unknown error occurred"
      );
      setIsLoading(false);
    }
  };

  const pollForResult = (currentTaskId: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/results/${currentTaskId}`
        );
        const data: AnalysisResult = await res.json();

        if (data.status === "completed") {
          setResult(data);
          setIsLoading(false);
          clearInterval(interval);
        } else if (data.status === "not_found") {
          throw new Error("Task not found. Please try again.");
        }
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "An unknown error occurred"
        );
        setIsLoading(false);
        clearInterval(interval);
      }
    }, 3000);
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-12 bg-gray-50">
      <div className="z-10 w-full max-w-5xl items-center justify-between font-mono text-sm">
        <h1 className="text-4xl font-bold text-center text-gray-800">
          AI Call Insights
        </h1>
        <p className="text-center text-gray-500 mt-2">
          Upload your own audio file to get an AI-powered analysis.
        </p>
      </div>
      <div className="mt-12 flex flex-col items-center gap-4">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="audio/*"
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="px-6 py-3 bg-white text-gray-700 border border-gray-300 font-semibold rounded-lg shadow-sm hover:bg-gray-100 transition-colors"
        >
          {selectedFile ? "Change File" : "Choose an Audio File"}
        </button>

        {selectedFile && (
          <p className="text-gray-600">Selected: {selectedFile.name}</p>
        )}

        <button
          onClick={startAnalysis}
          disabled={isLoading || !selectedFile}
          className="px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
        >
          {isLoading ? `Analyzing... (Task ID: ${taskId})` : "Analyze Call"}
        </button>
      </div>

      {error && <p className="mt-6 text-red-500">Error: {error}</p>}

      {result && result.status === "completed" && (
        <div className="mt-10 w-full max-w-4xl p-6 bg-white rounded-lg shadow-lg animate-fade-in">
          <h2 className="text-2xl font-bold mb-4 text-gray-800">
            Analysis Complete
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-700">Sentiment</h3>
              <p
                className={`text-xl font-bold ${
                  result.sentiment === "POSITIVE"
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {result.sentiment}
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-700">Summary</h3>
              <p className="text-gray-600 italic">"{result.summary}"</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-700">
                Full Transcript
              </h3>
              <p className="text-gray-800 bg-gray-100 p-4 rounded-md whitespace-pre-wrap">
                {result.transcript}
              </p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
