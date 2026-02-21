**🧠 Personal AI Memory Assistant**
A Multi-Modal Personal Intelligence System

A local-first AI memory system that understands documents, images, and faces using semantic search, OCR, and face recognition.
Instead of storing files by date or folder, this system retrieves information based on meaning, context, and identity.

**🚀 Features**

✅ Text Memory System with Semantic Search
✅ Layout-Aware OCR for Images and PDFs
✅ Face Recognition with Clustering
✅ Smart Query Router (Text / OCR / Face)
✅ Evidence-Based Answers (Grounded Results)
✅ Local Storage – Privacy Focused
✅ Fast Vector Search using FAISS

**🏗️ System Architecture**

The system follows a multi-modal local AI architecture:

Frontend: TypeScript (Next.js)

Backend: FastAPI (Python)

Vector Engine: FAISS

AI Modules:

Sentence Embeddings

OCR (Tesseract)

FaceNet + MTCNN

Storage: SQLite + Local Filesystem

⚙️ Tech Stack
Backend

Python

FastAPI

SQLAlchemy

NumPy

FAISS

AI / ML

PyTorch

facenet-pytorch

MTCNN

Tesseract OCR

PyMuPDF

Frontend

TypeScript

Next.js

React

Database

SQLite

****🧩 Project Modules**
**📝 Text Memory System****

Semantic search using embeddings

Evidence-grounded retrieval

📄 OCR & PDF Intelligence

Layout-aware OCR pipeline

Structured block segmentation

**👤 Face Memory System**

Face detection and embedding

DBSCAN clustering

Label-based face search

**🧠 Smart Query Router**

Automatically routes queries:

Text Search

OCR Retrieval

Face Recognition

**💻 Installation**
**1️⃣ Clone Repository**
git clone https://github.com/your-username/ai-memory-assistant.git
cd ai-memory-assistant
**2️⃣ Backend Setup**
pip install -r requirements.txt
uvicorn main:app --reload
**3️⃣ Frontend Setup**
npm install
npm run dev
**▶️ Usage**

Upload documents or images

System extracts text using OCR / PDF parser

Embeddings generated and stored in FAISS

Ask natural language queries

AI returns evidence-based results

**📊 Key Concepts Used**

Sentence Embeddings

Cosine Similarity

Vector Normalization

FAISS Indexing

Clustering (DBSCAN)

Multimodal Retrieval

**🔒 Design Philosophy**

This project follows a Local-First AI approach:

No cloud dependency

No external vector database

Full user data ownership

Offline capability

**👥 Contributors**
**🔹 Sparsh Garg**

Database Design

Text Memory System

OCR Pipeline

PDF Intelligence

Evidence-Based Answers

**🔹 Mayank Chauhan**

Face Recognition Module

Smart Query Router

**🤖 AI-Assisted Development**

Frontend implementation support

Documentation assistance

**📚 References**

FAISS – Facebook AI Research

FaceNet Paper

FastAPI Documentation

PyTorch Documentation

Tesseract OCR

**🔮 Future Scope**

Image Captioning Search

Multi-User Support

GPU Optimization

Cloud Optional Mode

**⭐ License**

This project is created for academic and research purposes.
