# Zenith

Zenith is a browser-based, agent-only coding editor built for absolute safety and autonomy. It is designed to provision secure developer sandboxes (via Daytona or E2B) and allows users to interact entirely via prompts using the Agent Client Protocol (ACP).

The UI is inspired by Zed and Google Jules, providing an intelligent, agent-first development workflow with file trees, read-only code diff views, and real-time chat with coding agents like Goose.

## Architecture

- **Frontend:** Built with [Vinext](https://github.com/cloudflare/vinext) (Next.js on Vite) for ultra-fast HMR and React Server Components support.
- **Backend:** A Golang HTTP/WebSocket server that manages sandbox provisioning and securely proxies the Agent Client Protocol (ACP) connection from the browser to the sandbox.
- **Sandbox:** Integrated with Daytona (currently mocked) to spin up isolated developer environments and inject ACP agents (e.g., Goose) directly into the workspace.

## Running Locally (Docker Compose)

The easiest way to run both the frontend and backend is using Docker Compose.

1. Clone the repository.
2. Run the following command:

\`\`\`bash
docker compose up --build
\`\`\`

3. Open your browser and navigate to \`http://localhost:3000\`.
4. The backend API runs on \`http://localhost:8080\`.

## Running Manually

If you prefer to run the services manually:

### Backend (Go)

\`\`\`bash
cd backend
go run main.go
\`\`\`

The backend will start on \`http://localhost:8080\`.

### Frontend (Vinext)

\`\`\`bash
cd frontend
npm install
npm run dev:vinext
\`\`\`

The frontend will start on \`http://localhost:3001\`.

## Current Status

This is an MVP implementation. The UI layout is functional, but the Daytona Sandbox and Goose ACP server start sequences are mocked for demonstration purposes unless Daytona and Goose are actually installed on the host system.
