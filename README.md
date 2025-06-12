<h1 align="center"> <br> <a href="https://openpecha.org"><img src="https://avatars.githubusercontent.com/u/82142807?s=400&u=19e108a15566f3a1449bafb03b8dd706a72aebcd&v=4" alt="OpenPecha" width="150"></a> <br> </h1> <h3 align="center">Pecha Tool Sync Editor</h3>

## Description

Pecha Tool Sync Editor is an advanced annotation and collaborative editing platform built for working with Tibetan texts in the PechaData format. This tool is built with a modern stack using React (frontend) and Express (backend), and powered by the Quill editor for rich text editing with real-time collaboration and syncing capabilities.

It allows multiple users to:

Upload and edit pecha text documents

Collaboratively annotate, comment, and suggest edits

Synchronize two related texts side-by-side (e.g., source and translation)

Track changes and sync annotations across versions using the STAM (Stand-off Text Annotation Model)

This is the second version of the existing Pecha toolkit, redesigned for better performance, usability, and collaborative workflows.

## Features

🔄 Two-panel text sync for parallel text editing (source & translation)

🧑‍🤝‍🧑 Collaborative editing with multiple users working in real-time

📝 Quill-based rich text editing experience

📄 Upload and edit custom text files (pechas)

💬 Inline comments and suggestions

🚀 Powered by React, Express, and WebSockets for real-time updates

## Tech Stack

Frontend: React, Quill.js

Backend: Node.js, Express

Real-time: WebSockets / Socket.IO

Quickstart
To get started with the toolkit, we recommend following this documentation.

# Getting Started with Vite ⚡

[Vite](https://vitejs.dev/) is a lightning-fast build tool and development server for modern web projects.

## 🚀 Quick Start

### 1. Prerequisites

Make sure you have **Node.js** installed (version 14.18+, 16+ recommended):

### 2. Environment Setup

Before running the application, set up environment variables:

1. **Backend Environment**

   ```bash
   cd backend
   cp .env.example .env
   # Edit .env with your configuration values
   ```

2. **Frontend Environment**
   ```bash
   cd frontend
   cp .env.example .env
   # Edit .env with your configuration values
   ```

Make sure to configure all required variables in both `.env` files before proceeding.

### 3. Backend Setup

1. cd backend
2. npm install
3. npm run dev

### 4. Frontend Setup

1. cd frontend
2. npm install
3. npm run dev

## API Documentation

For local development, API docs are available at:
`http://localhost:9000/docs`
