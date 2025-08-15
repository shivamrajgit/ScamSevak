// App.jsx (replace the existing file)
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
    handleEndCall,
    handleCopyReply,
    handleClassify,
    fullConversation
  } = useCallManager(user)

  // Sidebar / summaries state
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [summaries, setSummaries] = useState([]) // {id, summary, createdAt}
  const [selectedSummary, setSelectedSummary] = useState(null) // null => Home (live)

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
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-6xl bg-white rounded-2xl shadow-lg p-6 grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* LEFT SIDEBAR (timestamps + Home) */}
        <div className={`col-span-1 p-2`}>
          <div className="border rounded-lg bg-white sticky top-6 h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-3 border-b">
              <h4 className="font-semibold">Conversations</h4>
              <button
                onClick={() => setSidebarOpen(v => !v)}
                className="px-2 py-1 text-xs rounded bg-gray-100"
                title={sidebarOpen ? 'Collapse' : 'Open'}
              >
                {sidebarOpen ? '«' : '»'}
              </button>
            </div>

            {sidebarOpen ? (
              <div className="overflow-auto p-2">
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
                        <div className="text-xs text-gray-500 truncate" style={{ maxWidth: 220 }}>
                          {s.summary ? (s.summary.slice(0, 90) + (s.summary.length > 90 ? '…' : '')) : '—'}
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-xs text-gray-400">Collapsed</div>
            )}

            <div className="p-3 border-t text-xs text-gray-500">
              {/* Optionally: refresh button */}
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
          </div>
        </div>

        {/* MAIN area (transcript or selected summary) */}
        <div className="md:col-span-2 flex flex-col">
          <header className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-semibold">ScamSevak</h1>
              <p className="text-sm text-gray-500">Real-time conversation security assistant</p>
            </div>
            <div className="space-x-2">
              <button
                onClick={handleStartStop}
                className={`px-4 py-2 rounded-md text-white ${callActive ? 'bg-red-500' : 'bg-green-600'}`}>
                {callActive ? 'End Call' : 'Start Call'}
              </button>
              <button onClick={handleEndCall} className="px-4 py-2 rounded-md bg-gray-200 text-gray-800">Reset</button>
              {user && !user.guest ? (
                <button
                  onClick={onLogout}
                  className="px-4 py-2 rounded-md bg-yellow-400 text-black"
                >
                  Logout
                </button>
              ) : (
                <button
                  onClick={onLogout}
                  className="px-4 py-2 rounded-md bg-blue-400 text-black"
                >
                  Login
                </button>
              )}
            </div>
          </header>

          <div className="flex-1 border rounded-lg p-4 overflow-auto bg-slate-50" ref={transcriptRef}>
            {/* If a summary is selected, show it. Otherwise show live messages (Home) */}
            {selectedSummary ? (
              <div>
                <div className="mb-3">
                  <div className="text-sm text-gray-500">Summary from</div>
                  <div className="text-lg font-medium">{fmt(selectedSummary.createdAt)}</div>
                </div>
                <div className="p-4 bg-white rounded border">
                  <pre className="whitespace-pre-wrap text-sm">{selectedSummary.summary}</pre>
                </div>
              </div>
            ) : (
              messages.length === 0 ? (
                <div className="text-center text-gray-400 py-10">No transcript yet. Click start to begin.</div>
              ) : (
                messages.map((m, idx) => <MessageBubble key={idx} who={m.who} text={m.text} />)
              )
            )}
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg bg-white">
              <ScamMeter level={scamLevel} />
            </div>

            <div className="p-4 border rounded-lg bg-white flex flex-col">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium">Suggested Reply</h3>
                <button onClick={handleCopyReply} className="text-xs px-2 py-1 rounded bg-indigo-50 text-indigo-700">Copy</button>
              </div>
              <textarea readOnly value={suggestedReply} rows={4} className="w-full resize-none p-2 border rounded text-sm bg-gray-50" />
            </div>
          </div>

          {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
        </div>

        {/* RIGHT sidebar (Session Info) - unchanged except column index */}
        <aside className="md:col-span-1">
          <div className="p-4 border rounded-lg bg-white sticky top-6">
            <h4 className="font-semibold mb-2">Session Info</h4>
            <dl className="text-sm text-gray-600">
              <div className="mb-2">
                <dt className="font-medium">Recognition</dt>
                <dd>{recognitionReady ? 'Ready' : 'Initializing...'}</dd>
              </div>
              <div className="mb-2">
                <dt className="font-medium">Listening</dt>
                <dd>{recognizing ? 'Yes' : 'No'}</dd>
              </div>
              <div className="mb-2">
                <dt className="font-medium">Speaker</dt>
                <dd>{currentSpeakerState}</dd>
              </div>
              <div className="mb-2">
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
      </div>
    </div>
  )
}