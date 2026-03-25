package main

import (
	"encoding/json"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/user/zenith-backend/sandbox"
)

type Session struct {
	ID        string    `json:"id"`
	Project   string    `json:"project"`
	Status    string    `json:"status"`
	AgentURL  string    `json:"agentUrl"`
	SandboxIP string    `json:"-"` // Internal use
	CreatedAt time.Time `json:"createdAt"`
}

type SessionManager struct {
	sessions map[string]*Session
	mu       sync.RWMutex
	daytona  *sandbox.DaytonaService
}

func NewSessionManager() *SessionManager {
	return &SessionManager{
		sessions: make(map[string]*Session),
		daytona:  sandbox.NewDaytonaService(),
	}
}

func (sm *SessionManager) CreateSession(id, projectRepo string) (*Session, error) {
	sm.mu.Lock()
	defer sm.mu.Unlock()

	// Provision sandbox
	// Run this asynchronously or mock it if Daytona isn't installed in this environment
	go func() {
		log.Printf("Starting Daytona workspace for %s...", projectRepo)
		time.Sleep(2 * time.Second) // Simulate provisioning time

		err := sm.daytona.Create(id, projectRepo)
		if err != nil {
			log.Printf("Error creating sandbox: %v", err)
		}

		// Try to start the Goose ACP server in the background
		_, err = sm.daytona.Execute(id, "nohup goose-acp-server --host 0.0.0.0 --port 8080 > /tmp/goose.log 2>&1 &")
		if err != nil {
			log.Printf("Error executing goose-acp-server (mocked if not found): %v", err)
		}

		log.Printf("Goose ACP Server start attempt finished for workspace %s", id)

		// Update status
		sm.mu.Lock()
		if s, ok := sm.sessions[id]; ok {
			s.Status = "running"
			s.SandboxIP = "127.0.0.1" // Mock IP
		}
		sm.mu.Unlock()
	}()

	agentURL := "ws://localhost:8080/api/sessions/" + id + "/ws"

	session := &Session{
		ID:        id,
		Project:   projectRepo,
		Status:    "provisioning",
		AgentURL:  agentURL,
		CreatedAt: time.Now(),
	}
	sm.sessions[id] = session
	return session, nil
}

func (sm *SessionManager) GetSessions() []*Session {
	sm.mu.RLock()
	defer sm.mu.RUnlock()

	var list []*Session
	for _, s := range sm.sessions {
		list = append(list, s)
	}
	return list
}

func main() {
	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)

	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000", "http://localhost:5173", "http://localhost:3001"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token"},
		ExposedHeaders:   []string{"Link"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	sm := NewSessionManager()

	r.Get("/api/sessions", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(sm.GetSessions())
	})

	r.Post("/api/sessions", func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Project string `json:"project"` // URL of the repo
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		sessionID := "sess-" + time.Now().Format("20060102150405")
		session, err := sm.CreateSession(sessionID, req.Project)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(session)
	})

	// Add WebSocket / HTTP proxy handler here
	r.HandleFunc("/api/sessions/{id}/ws", func(w http.ResponseWriter, r *http.Request) {
		id := chi.URLParam(r, "id")

		sm.mu.RLock()
		session, ok := sm.sessions[id]
		sm.mu.RUnlock()

		if !ok || session.Status != "running" {
			http.Error(w, "Session not ready", http.StatusServiceUnavailable)
			return
		}

		// Connect to goose-acp-server running in the sandbox on port 8080
		// We use httputil.ReverseProxy for HTTP/WS
		targetURL, _ := url.Parse("http://" + session.SandboxIP + ":8080")

		log.Printf("Proxying ACP request to %s", targetURL)

		proxy := httputil.NewSingleHostReverseProxy(targetURL)

		// Update the headers to allow for websocket upgrade
		r.URL.Path = "/" // Proxy to root of ACP server

		proxy.ServeHTTP(w, r)
	})

	log.Println("Backend server starting on :8080")
	if err := http.ListenAndServe(":8080", r); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
