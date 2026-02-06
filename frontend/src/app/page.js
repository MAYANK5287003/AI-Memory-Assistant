"use client";

import { useState } from "react";

export default function Home() {
  // ---------- Memory ----------
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");

  // ---------- Query ----------
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState("");
  const [evidence, setEvidence] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ---------- Face Memory ----------
  const [faceFile, setFaceFile] = useState(null);
  const [showLabelBox, setShowLabelBox] = useState(false);
  const [labelName, setLabelName] = useState("");
  const [pendingClusterId, setPendingClusterId] = useState(null);
  const [faceResults, setFaceResults] = useState([]);


  const BACKEND_URL = "http://127.0.0.1:8000";

  // ==========================
  // SAVE MEMORY
  // ==========================
  async function saveMemory() {
    setStatus("");
    setError("");

    if (!text.trim() && !file) {
      setStatus("Please add text or upload a file");
      return;
    }

    // ---- Text memory ----
    if (text.trim()) {
      try {
        const res = await fetch(`${BACKEND_URL}/memory`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: text }),
        });

        if (res.ok) {
          setStatus("Text memory saved ✅");
          setText("");
        } else {
          setStatus("Failed to save text ❌");
        }
      } catch {
        setStatus("Backend not reachable ❌");
      }
    }

    // ---- File upload ----
    if (file) {
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch(`${BACKEND_URL}/upload`, {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          setStatus(`File uploaded ✅ (${data.chunks_added ?? "?"} chunks)`);
          setFile(null);
        } else {
          setStatus("File upload failed ❌");
        }
      } catch {
        setStatus("Backend not reachable ❌");
      }
    }
  }
  async function uploadFace() {
    if (!faceFile) return;

    const formData = new FormData();
    formData.append("file", faceFile);

    try {
      const res = await fetch(`${BACKEND_URL}/face/upload`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (data.unmatched) {
        setPendingClusterId(data.cluster_id);
        setShowLabelBox(true);
      } else {
        alert("Face matched existing person ✅");
      }

      setFaceFile(null);
    } catch {
      alert("Face upload failed ❌");
    }
  }
  async function labelFace() {
    if (!labelName.trim()) return;

    await fetch(`${BACKEND_URL}/face/label`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        cluster_id: pendingClusterId,
        label: labelName,
      }),
    });

    setShowLabelBox(false);
    setLabelName("");
    setPendingClusterId(null);

    alert("Person labeled successfully ✅");
  }



  // ==========================
  // ASK QUESTION
  // ==========================
  async function searchByLabel() {
    if (!query.trim()) return;

    const res = await fetch(
      `${BACKEND_URL}/face/search-by-label?label=${query}`
    );
    const data = await res.json();

    setFaceResults(data.images || []);
  }

  async function askQuestion() {
    if (!query.trim()) return;

    setLoading(true);
    setAnswer("");
    setEvidence(null);
    setError("");

    try {
      const res = await fetch(`${BACKEND_URL}/smart-query`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });

      if (!res.ok) {
        throw new Error("Query failed");
      }

      const data = await res.json();

      setAnswer(data.answer || "No answer found.");
      setEvidence(data.evidence || null);
    } catch {
      setError("Backend not reachable ❌");
    } finally {
      setLoading(false);
    }
  }

  // ==========================
  // UI
  // ==========================
  return (
    <main style={{ padding: "30px", maxWidth: "720px", margin: "auto" }}>
      <h1>🧠 AI Memory Assistant</h1>

      {/* -------- ADD MEMORY -------- */}
      <h3>Add Text Memory</h3>
      <textarea
        rows="6"
        style={{ width: "100%", padding: "10px" }}
        placeholder="Write something you want AI to remember..."
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <br /><br />

      <h3>Upload File (PDF / Image / Excel)</h3>
      <input
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls"
        onChange={(e) => setFile(e.target.files[0])}
      />

      <br /><br />

      <button
        style={{ padding: "10px 20px" }}
        onClick={saveMemory}
      >
        Save Memory
      </button>

      {status && <p>{status}</p>}

      <hr style={{ margin: "40px 0" }} />
      <hr />

      <h3>Add Face Memory</h3>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFaceFile(e.target.files[0])}
      />

      <br /><br />

      <button onClick={uploadFace}>Upload Face</button>

      {showLabelBox && (
        <div style={{ marginTop: "15px" }}>
          <p>New face detected. Enter name:</p>
          <input
            value={labelName}
            onChange={(e) => setLabelName(e.target.value)}
          />
          <button onClick={labelFace}>Save Label</button>
        </div>
      )}


      {/* -------- ASK QUESTION -------- */}
      <h3>Ask a Question</h3>
      <input
        type="text"
        style={{ width: "100%", padding: "10px" }}
        placeholder="Ask something from your memory..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      <br /><br />

      <button
        style={{ padding: "10px 20px" }}
        onClick={askQuestion}
        disabled={loading}
      >
        Ask
      </button>
      <button
        style={{ padding: "10px 20px", marginLeft: "10px" }}
        onClick={searchByLabel}
        >
          Search Face
        </button>


      <br /><br />

      {loading && <p>🤔 Thinking...</p>}
      {error && <p style={{ color: "red" }}>{error}</p>}

      {!loading && answer && (
        <div
          style={{
            background: "#111",
            padding: "16px",
            borderRadius: "6px",
            color: "#fff",
          }}
        >
          <strong>Answer:</strong>
          <p style={{ marginTop: "10px" }}>{answer}</p>
          {evidence && (
          <div
            style={{
              marginTop: "15px",
              paddingTop: "10px",
              borderTop: "1px solid #333",
              fontSize: "14px",
            }}
          >
            <strong>Evidence:</strong>

            {/* IMAGE */}
            {evidence.file_type === "image" && (
              <div style={{ marginTop: "10px" }}>
                <img
                  src={evidence.file_url}
                  alt="Evidence"
                  style={{
                    maxWidth: "100%",
                    borderRadius: "6px",
                    cursor: "pointer",
                    border: "1px solid #444",
                  }}
                  onClick={() => window.open(evidence.file_url, "_blank")}
                />
              </div>
            )}

            {/* PDF */}
            {evidence.file_type === "pdf" && (
              <p style={{ marginTop: "10px" }}>
                📄{" "}
                <a
                  href={evidence.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "#4ea1ff" }}
                >
                  Open PDF
                </a>
              </p>
            )}

            {/* EXCEL */}
            {evidence.file_type === "excel" && (
              <p style={{ marginTop: "10px" }}>
                📊{" "}
                <a
                  href={evidence.file_url}
                  download
                  style={{ color: "#4ea1ff" }}
                >
                  Download Excel
                </a>
              </p>
            )}
          </div>
        )}
        </div>
      )}
      {faceResults.length > 0 && (
        <div style={{ marginTop: "20px" }}>
          <h4>Photos found:</h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
            {faceResults.map((img, i) => (
              <img
                key={i}
                src={img}
                style={{ width: "100%", borderRadius: "6px" }}
                onClick={() => window.open(img, "_blank")}
              />
            ))}
          </div>
        </div>
      )}

    </main>
  );
}
