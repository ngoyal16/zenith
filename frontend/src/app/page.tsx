'use client';

import { useState, useEffect } from 'react';

export default function Home() {
  const [prompt, setPrompt] = useState('');
  const [session, setSession] = useState<any>(null);
  const [messages, setMessages] = useState<{role: string, text: string}[]>([]);

  useEffect(() => {
    // Optionally fetch active sessions or auto-create a mock one for demo
    const initSession = async () => {
      try {
        const res = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project: 'https://github.com/cloudflare/vinext' })
        });
        const data = await res.json();
        setSession(data);

        setMessages([
          { role: 'system', text: `Session ${data.id} initialized. Agent status: ${data.status}` }
        ]);
      } catch (err) {
        console.error("Failed to init session", err);
        setMessages([{ role: 'system', text: 'Failed to connect to backend.'}]);
      }
    };

    initSession();
  }, []);

  const handleSend = async () => {
    if (!prompt.trim() || !session || session.status !== 'running') return;

    // Add user message
    setMessages(prev => [...prev, { role: 'user', text: prompt }]);
    setPrompt('');

    // Attempt to connect to backend proxy, fail gracefully for demo
    try {
      // In a real implementation this would establish the SSE/WebSocket via ACP
      const res = await fetch(`/api/sessions/${session.id}/ws`, {
        method: 'POST', // or however the ACP server initiates a turn
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "prompt/turn",
          params: { prompt }
        })
      });

      if (!res.ok) throw new Error('Proxy returned error');
    } catch (err) {
      console.warn("ACP proxy connection failed (expected if Goose is not installed locally). Proceeding with simulated response.", err);
      // Fallback to simulated response for MVP demo
      setTimeout(() => {
        setMessages(prev => [...prev, {
          role: 'agent',
          text: 'I have received your request. I cannot reach the Goose ACP proxy right now (is daytona + goose installed?). This is a simulated response.'
        }]);
      }, 1000);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-neutral-900 text-white overflow-hidden">
      {/* Sidebar - File Tree */}
      <div className="w-64 border-r border-neutral-700 bg-neutral-800 p-4 flex flex-col">
        <h2 className="text-sm font-semibold text-neutral-400 mb-4 uppercase tracking-wider">Explorer</h2>
        <div className="flex-1 overflow-y-auto space-y-2 text-sm text-neutral-300">
          <div className="hover:text-white cursor-pointer">📁 src</div>
          <div className="ml-4 hover:text-white cursor-pointer bg-neutral-700 rounded px-1">📄 main.go</div>
          <div className="ml-4 hover:text-white cursor-pointer">📄 go.mod</div>
          <div className="hover:text-white cursor-pointer">📁 pkg</div>
          <div className="hover:text-white cursor-pointer">📄 README.md</div>
        </div>
      </div>

      {/* Main Content - Code View / Diff */}
      <div className="flex-1 flex flex-col bg-neutral-900">
        <div className="flex items-center px-4 py-2 border-b border-neutral-700 bg-neutral-800 text-sm text-neutral-400 font-mono">
          <span>src/main.go</span>
          <span className="ml-4 px-2 py-0.5 bg-blue-900 text-blue-300 rounded text-xs">Read-Only</span>
        </div>
        <div className="flex-1 p-4 overflow-y-auto font-mono text-sm">
          <pre className="text-neutral-300">
{`package main

import "fmt"

func main() {
    fmt.Println("Hello, Zenith!")
}
`}
          </pre>
        </div>
      </div>

      {/* Right Sidebar - Agent Chat & Prompt */}
      <div className="w-96 border-l border-neutral-700 bg-neutral-800 flex flex-col">
        <div className="p-4 border-b border-neutral-700 flex justify-between items-center">
          <h2 className="text-sm font-semibold text-neutral-400 uppercase tracking-wider">Agent Chat</h2>
          {session && (
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${session.status === 'running' ? 'bg-green-500' : 'bg-yellow-500 animate-pulse'}`}></span>
              <span className="text-xs text-neutral-400">{session.status}</span>
            </div>
          )}
        </div>

        {/* Chat History */}
        <div className="flex-1 p-4 overflow-y-auto space-y-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`p-3 rounded-lg text-sm ${
              msg.role === 'user' ? 'bg-neutral-700 text-neutral-200' :
              msg.role === 'system' ? 'bg-neutral-800 text-neutral-400 text-xs italic' :
              'bg-neutral-900 text-neutral-300 border border-neutral-700'
            }`}>
              {msg.role !== 'system' && (
                <p className={`font-semibold mb-1 ${msg.role === 'user' ? 'text-blue-400' : 'text-green-400'}`}>
                  {msg.role === 'user' ? 'You' : 'Agent'}
                </p>
              )}
              <p>{msg.text}</p>

              {msg.role === 'agent' && (
                <div className="mt-2 text-xs bg-neutral-800 p-2 rounded flex justify-between items-center">
                  <span className="text-neutral-500">Diff available</span>
                  <button className="px-2 py-1 bg-green-900/50 hover:bg-green-800/50 text-green-400 rounded transition-colors">Approve</button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Prompt Input */}
        <div className="p-4 border-t border-neutral-700 bg-neutral-800">
          <textarea
            className="w-full h-24 bg-neutral-900 text-neutral-200 border border-neutral-700 rounded-lg p-3 text-sm focus:outline-none focus:border-blue-500 resize-none"
            placeholder="Ask the agent to modify code..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <button
            onClick={handleSend}
            disabled={!session || session.status !== 'running'}
            className="mt-2 w-full bg-blue-600 hover:bg-blue-500 disabled:bg-blue-900 disabled:text-neutral-500 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Send to Agent
          </button>
        </div>
      </div>
    </div>
  );
}
