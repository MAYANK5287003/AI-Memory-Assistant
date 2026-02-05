"use client";

import { useState } from "react";

export default function Home() {
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("");

  async function saveMemory() {
    if (!text.trim() && !file) {
      setStatus("Please add text or upload a file");
      return;
    }

    // Text memory will go to backend (already works)
    if (text.trim()) {
      try {
        const res = await fetch("http://127.0.0.1:8000/memory", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
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

   // File upload
    if (file) {
      const formData = new FormData();
      formData.append("file", file);

      try {
        const res = await fetch("http://127.0.0.1:8000/upload", {
          method: "POST",
          body: formData,
        });

        if (res.ok) {
          setStatus("File uploaded successfully ✅");
          setFile(null);
        } else {
          setStatus("File upload failed ❌");
        }
      } catch {
        setStatus("Backend not reachable ❌");
      }
    }

  }

  return (
    <main style={{ padding: "30px", maxWidth: "700px", margin: "auto" }}>
      <h1>AI Memory Assistant</h1>

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

      <p>{status}</p>
    </main>
  );
}
