"use client";

import { useState } from "react";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState("");

  async function askQuestion() {
    if (!query.trim()) {
      setStatus("Please enter a question");
      return;
    }

    setStatus("Thinking...");
    setAnswer("");

    try {
      const res = await fetch(
        `http://127.0.0.1:8000/search?query=${encodeURIComponent(query)}`
      );

      const data = await res.json();

      if (res.ok) {
        setAnswer(data.best_match);
        setStatus("Answer found ✅");
      } else {
        setStatus("Failed to get answer ❌");
      }
    } catch (err) {
      setStatus("Backend not reachable ❌");
    }
  }

  return (
    <main style={{ padding: "30px", maxWidth: "700px", margin: "auto" }}>
      <h1>Ask AI Memory</h1>

      <input
        type="text"
        style={{ width: "100%", padding: "10px" }}
        placeholder="Ask a question..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <br /><br />

      <button
        style={{ padding: "10px 20px" }}
        onClick={askQuestion}
      >
        Ask
      </button>

      <p>{status}</p>

      {answer && (
        <div style={{ marginTop: "20px", padding: "15px", border: "1px solid #ccc" }}>
          <strong>Answer:</strong>
          <p>{answer}</p>
        </div>
      )}
    </main>
  );
}
