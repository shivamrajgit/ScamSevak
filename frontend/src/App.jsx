import React from 'react'
import ScamMeter from './components/ScamMeter.jsx'
import MessageBubble from './components/MessageBubble.jsx'
import useCallManager from './hooks/useCallManager.js'

export default function App() {
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
    handleCopyReply
  } = useCallManager()

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-4xl bg-white rounded-2xl shadow-lg p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 flex flex-col">
          <header className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-semibold">ScamGuard</h1>
              <p className="text-sm text-gray-500">Real-time conversation security assistant</p>
            </div>
            <div className="space-x-2">
              <button
                onClick={handleStartStop}
                className={`px-4 py-2 rounded-md text-white ${callActive ? 'bg-red-500' : 'bg-green-600'}`}>
                {callActive ? 'End Call' : 'Start Call'}
              </button>
              <button onClick={handleEndCall} className="px-4 py-2 rounded-md bg-gray-200 text-gray-800">Reset</button>
            </div>
          </header>

          <div className="flex-1 border rounded-lg p-4 overflow-auto bg-slate-50" ref={transcriptRef}>
            {messages.length === 0 ? (
              <div className="text-center text-gray-400 py-10">No transcript yet. Click start to begin.</div>
            ) : (
              messages.map((m, idx) => <MessageBubble key={idx} who={m.who} text={m.text} />)
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
              <div className="break-all text-xs mt-1">{import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'}/classify</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}