import React, { useEffect, useState } from 'react'
import ScamMeter from './components/ScamMeter.jsx'
import MessageBubble from './components/MessageBubble.jsx'
import useCallManager from './hooks/useCallManager.js'
import axios from 'axios'

export default function App({ user, onLogout }) {
  const {
    recognitionReady,
    recognizing,
    messages,
    currentSpeakerState,
    callActive,
    scamLevel,
    suggestedReply,
    error,
    transcriptRef,
    handleStartStop,
    handleReset,
    handleCopyReply,
    handleClassify,
    fullConversation
  } = useCallManager(user)

  // Conversations tab state (visual only)
  const [leftOpen, setLeftOpen] = useState(true)
  const [summaries, setSummaries] = useState([]) // {id, summary, createdAt}
  const [selectedSummary, setSelectedSummary] = useState(null) // null => Home (live)

  // Auto-scroll transcript when messages change during an active call (visual only)
  useEffect(() => {
    try {
      const el = transcriptRef?.current
      if (!el) return
      // Only auto-scroll when a call is active to avoid forcing scroll when reviewing past conversations
      if (callActive) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    } catch (e) { }
  }, [messages.length, transcriptRef, callActive])

  // Fetch summaries when user logs in (non-guest)
  useEffect(() => {
    let mounted = true
    async function loadSummaries() {
      if (!user || user.guest) {
        setSummaries([])
        return
      }

      const AUTH_API = import.meta.env.VITE_AUTH_API || 'http://127.0.0.1:8000/api'
      const authBase = AUTH_API.replace(/\/$/, '')
      try {
        const res = await axios.get(`${authBase}/summaries`, {
          headers: { Authorization: `Bearer ${user.token}` }
        })
        if (!mounted) return
        setSummaries(res.data.summaries || [])
      } catch (err) {
        console.error('Failed to fetch summaries:', err)
        setSummaries([])
      }
    }
    loadSummaries()
    return () => { mounted = false }
  }, [user])

  // Helper to format timestamp
  const fmt = (iso) => {
    try {
      return new Date(iso).toLocaleString()
    } catch (e) {
      return iso
    }
  }

  // When user selects a summary from sidebar
  const handleSelectSummary = (summaryObj) => {
    setSelectedSummary(summaryObj || null) // null -> Home
  }

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f6f7fb,white)] flex items-start justify-center p-6 relative">

      {/* LEFT Conversations tab (fixed outside main card) */}
      <aside
        className="fixed top-16 left-6 h-[78vh] w-72 rounded-lg shadow-lg bg-white border overflow-hidden z-40"
        style={{
          transform: leftOpen ? 'translateX(0)' : 'translateX(-110%)',
          transition: 'transform 360ms cubic-bezier(.2,.9,.2,1)'
        }}
        aria-hidden={!leftOpen}
      >
        <div className="flex items-center justify-between p-3 border-b">
          <h4 className="font-semibold text-sm">Conversations</h4>
          <button
            onClick={() => setLeftOpen(v => !v)}
            className="px-2 py-1 text-xs rounded bg-gray-100"
            title={leftOpen ? 'Hide conversations' : 'Show conversations'}
            aria-expanded={leftOpen}
          >
            {leftOpen ? 'Hide' : 'Show'}
          </button>
        </div>

        <div className="overflow-auto p-2 h-full">
          <ul className="space-y-2">
            <li>
              <button
                onClick={() => handleSelectSummary(null)}
                className={`w-full text-left px-3 py-2 rounded ${selectedSummary === null ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}
              >
                Home
              </button>
            </li>

            {summaries.length === 0 ? (
              <li className="px-3 text-sm text-gray-400">No summaries saved</li>
            ) : summaries.map(s => (
              <li key={s.id}>
                <button
                  onClick={() => handleSelectSummary(s)}
                  className={`w-full text-left px-3 py-2 rounded ${selectedSummary && selectedSummary.id === s.id ? 'bg-indigo-50' : 'hover:bg-gray-50'}`}
                  title={fmt(s.createdAt)}
                >
                  <div className="text-sm font-medium">{fmt(s.createdAt)}</div>
                  <div className="text-xs text-gray-500 truncate" style={{ maxWidth: 240 }}>
                    {s.summary ? (s.summary.slice(0, 90) + (s.summary.length > 90 ? '…' : '')) : '—'}
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="p-3 border-t text-xs text-gray-500 flex items-center justify-between">
          <button
            onClick={async () => {
              if (!user || user.guest) return
              const AUTH_API = import.meta.env.VITE_AUTH_API || 'http://127.0.0.1:8000/api'
              const authBase = AUTH_API.replace(/\/$/, '')
              try {
                const res = await axios.get(`${authBase}/summaries`, { headers: { Authorization: `Bearer ${user.token}` } })
                setSummaries(res.data.summaries || [])
              } catch (err) {
                console.error('refresh summaries failed', err)
              }
            }}
            className="px-3 py-1 rounded bg-gray-100"
          >
            Refresh
          </button>
        </div>
      </aside>

      {/* LEFT handle visible when closed */}
      {!leftOpen && (
        <div className="fixed top-1/2 left-0 transform -translate-y-1/2 z-50">
          <button
            onClick={() => setLeftOpen(true)}
            aria-label="Open conversations"
            className="w-10 h-28 rounded-r-md bg-gray-50 border-l border-gray-200 shadow-sm flex items-center justify-center"
            title="Open conversations"
          >
            <span style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)', fontSize: 13, fontWeight: 500 }}>Conversations</span>
          </button>
        </div>
      )}

      {/* RIGHT Session Info (fixed, no animations, remains visible) */}
      <aside className="fixed top-16 right-6 h-[42vh] w-72 rounded-lg shadow-lg bg-white border overflow-hidden z-30">
        <div className="p-4 text-sm text-gray-700">
          <h4 className="font-semibold mb-2">Session Info</h4>
          <dl>
            <div className="mb-3">
              <dt className="font-medium">Recognition</dt>
              <dd>{recognitionReady ? 'Ready' : 'Initializing...'}</dd>
            </div>
            <div className="mb-3">
              <dt className="font-medium">Listening</dt>
              <dd>{recognizing ? 'Yes' : 'No'}</dd>
            </div>
            <div className="mb-3">
              <dt className="font-medium">Speaker</dt>
              <dd>{currentSpeakerState}</dd>
            </div>
            <div className="mb-3">
              <dt className="font-medium">Conversation length</dt>
              <dd>{messages.length} messages</dd>
            </div>
          </dl>

          <div className="mt-4 text-xs text-gray-500">
            This UI sends the full conversation to your backend at
            <div className="break-all text-xs mt-1">{import.meta.env.VITE_PY_API_URL || 'http://127.0.0.1:5000'}/classify</div>
          </div>
        </div>
      </aside>

      {/* MAIN calling card (fixed to viewport) */}
      <main
        className="fixed z-10 w-full max-w-4xl rounded-2xl shadow-xl p-6"
        style={{
          top: '8vh',
          left: '50%',
          transform: 'translateX(-50%)',
          height: '76vh',
          background: 'linear-gradient(180deg, rgba(255,255,255,0.95), rgba(246,247,251,0.98))',
          border: '1px solid rgba(15,23,42,0.04)',
          transition: 'transform 260ms ease, box-shadow 260ms ease'
        }}
      >
        {/* layout grid: header, transcript (scrollable), footer */}
        <div className="h-full flex flex-col" style={{ gap: 16 }}>

          {/* HEADER (fixed within card) */}
          <div className="flex items-center justify-between" style={{ flex: '0 0 auto' }}>
            <div>
              <h1 className="text-2xl font-semibold">ScamSevak</h1>
              <p className="text-sm text-gray-500">Real-time conversation security assistant</p>
            </div>

            <div className="space-x-3 flex items-center">
              <button
                onClick={handleStartStop}
                className={`px-4 py-2 rounded-md text-white shadow-sm transform transition-all duration-200 ${callActive ? 'bg-red-600 hover:scale-[1.03]' : 'bg-green-600 hover:scale-[1.03]'}`}
                aria-pressed={callActive}
              >
                {callActive ? 'End Call' : 'Start Call'}
              </button>

              <button onClick={handleReset} className="px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200 transition">Reset</button>

              {user && !user.guest ? (
                <button
                  onClick={onLogout}
                  className="px-4 py-2 rounded-md bg-yellow-400 text-black hover:brightness-95 transition"
                >
                  Logout
                </button>
              ) : (
                <button
                  onClick={onLogout}
                  className="px-4 py-2 rounded-md bg-blue-400 text-black hover:brightness-95 transition"
                >
                  Login
                </button>
              )}
            </div>
          </div>

          {/* TRANSCRIPT (scrollable area) */}
          <div className="flex-1 overflow-auto border rounded-lg p-4 bg-gradient-to-b from-white to-slate-50" ref={transcriptRef}>
            {selectedSummary ? (
              <div>
                <div className="mb-3">
                  <div className="text-sm text-gray-500">Summary from</div>
                  <div className="text-lg font-medium">{fmt(selectedSummary.createdAt)}</div>
                </div>
                <div className="p-4 bg-white rounded border shadow-sm">
                  <pre className="whitespace-pre-wrap text-sm">{selectedSummary.summary}</pre>
                </div>
              </div>
            ) : (
              messages.length === 0 ? (
                <div className="text-center text-gray-400 py-10">No transcript yet. Click start to begin.</div>
              ) : (
                <div className="space-y-3">
                  {messages.map((m, idx) => (
                    <div key={idx} style={{ animation: `fadeUp ${280 + idx * 30}ms cubic-bezier(.2,.9,.2,1) both` }}>
                      <MessageBubble who={m.who} text={m.text} />
                    </div>
                  ))}
                </div>
              )
            )}
          </div>

          {/* FOOTER (fixed within card) */}
          <div className="flex-0 flex flex-col md:flex-row gap-4 mt-3" style={{ flex: '0 0 auto' }}>
            <div className="flex-1 p-4 border rounded-lg bg-white shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium">Scam Meter</h3>
                <div className="text-xs text-gray-500">Level: {scamLevel}</div>
              </div>
              <div className="rounded-md p-3" style={{ boxShadow: 'inset 0 0 0 1px rgba(2,6,23,0.03)', borderRadius: 12 }}>
                <ScamMeter level={scamLevel} />
              </div>
            </div>

            <div className="flex-1 p-4 border rounded-lg bg-white shadow-sm flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium">Suggested Reply</h3>
                <button onClick={handleCopyReply} className="text-xs px-2 py-1 rounded bg-indigo-50 text-indigo-700 transition">Copy</button>
              </div>
              <textarea readOnly value={suggestedReply} rows={4} className="w-full resize-none p-2 border rounded text-sm bg-gray-50" />
            </div>
          </div>

          {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
        </div>
      </main>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        button:focus, textarea:focus, input:focus { outline: none; box-shadow: 0 6px 18px rgba(2,6,23,0.06); }
        @media (max-width: 1024px) {
          aside.fixed { display: none }
          main { position: static; width: calc(100% - 32px); transform: none; height: auto }
        }
      `}</style>
    </div>
  )
}