import React, { useEffect, useRef, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'

const confidenceColors = {
  "Very High": "bg-red-500 text-white",
  "High": "bg-orange-400 text-white",
  "Not Clear": "bg-yellow-400 text-black",
  "Low": "bg-lime-500 text-white",
  "Very Low": "bg-green-500 text-white",
  "Insufficient Data": "bg-gray-300 text-black",
  "Processing Error": "bg-red-700 text-white"
}

function ScamMeter({ level }) {
  const cls = confidenceColors[level] || "bg-gray-200 text-black"
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">Scam Confidence</span>
        <span className="text-sm">{level || 'Not analyzed yet'}</span>
      </div>
      <div className="w-full h-4 rounded-md bg-gray-200 overflow-hidden">
        <div className={`h-full transition-all duration-300 ${cls}`} style={{ width: level ? '100%' : '0%' }} />
      </div>
    </div>
  )
}

function MessageBubble({ who, text }) {
  const isCaller = who === 'Caller'
  return (
    <div className={`flex ${isCaller ? 'justify-start' : 'justify-end'} my-1`}>
      <div className={`${isCaller ? 'bg-white border' : 'bg-indigo-600 text-white'} p-3 rounded-lg max-w-[80%]`}>
        <div className="text-xs opacity-70 mb-1">{who}</div>
        <div className="text-sm break-words">{text}</div>
      </div>
    </div>
  )
}

export default function App() {
  const [recognizing, setRecognizing] = useState(false)
  const [recognitionReady, setRecognitionReady] = useState(false)
  const [messages, setMessages] = useState([]) // {who, text}
  // Use a ref to ensure onresult reads the latest speaker (fixes stale-closure bug)
  const [currentSpeakerState, setCurrentSpeakerState] = useState('Receiver')
  const currentSpeakerRef = useRef('Receiver')
  // wrapper setter to keep state and ref in sync
  const setCurrentSpeaker = (value) => {
    if (typeof value === 'function') {
      setCurrentSpeakerState(prev => {
        const next = value(prev)
        currentSpeakerRef.current = next
        return next
      })
    } else {
      setCurrentSpeakerState(value)
      currentSpeakerRef.current = value
    }
  }

  const [fullConversation, setFullConversation] = useState('')
  const [scamLevel, setScamLevel] = useState('Not analyzed yet')
  const [suggestedReply, setSuggestedReply] = useState('No reply suggested.')
  const [error, setError] = useState(null)
  const [callActive, setCallActive] = useState(false)

  const transcriptRef = useRef(null)
  const recognitionRef = useRef(null)
  const silenceTimerRef = useRef(null)
  const callActiveRef = useRef(callActive)

  // keep refs in sync
  useEffect(() => { callActiveRef.current = callActive }, [callActive])
  useEffect(() => { currentSpeakerRef.current = currentSpeakerState }, [currentSpeakerState])

  useEffect(() => {
    // initial readiness timeout to mirror previous behavior.
    const t = setTimeout(() => setRecognitionReady(true), 700)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    // scroll to bottom when messages update
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight
    }
  }, [messages])

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      setError('SpeechRecognition API not supported in this browser.')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onstart = () => {
      setRecognizing(true)
    }
    recognition.onerror = (ev) => {
      console.error('Speech recognition error:', ev)
      setError(ev.error || 'Speech recognition error')
      setRecognizing(false)
    }
    recognition.onend = () => {
      // If call is still active, restart recognition to emulate continuous call listening.
      if (callActiveRef.current) {
        try {
          recognition.start()
        } catch (e) {
          // In some browsers calling start immediately may throw; set recognizing false and let user restart if needed.
          console.warn('Could not auto-restart recognition:', e)
          setRecognizing(false)
        }
      } else {
        setRecognizing(false)
      }
    }

    // SILENCE_MS defines how long we wait after a final transcript before switching the speaker (i.e. "pause")
    const SILENCE_MS = 1200

    recognition.onresult = async (event) => {
      // each final result is considered one utterance from the currentSpeakerRef (latest value)
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          const text = event.results[i][0].transcript.trim()
          // use the ref to get the latest speaker
          addMessage(currentSpeakerRef.current, text)

          // reset any existing silence timer
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current)
            silenceTimerRef.current = null
          }

          // After a pause of SILENCE_MS, flip speaker so the next utterance is attributed to the other party.
          silenceTimerRef.current = setTimeout(() => {
            setCurrentSpeaker(prev => prev === 'Caller' ? 'Receiver' : 'Caller')
            silenceTimerRef.current = null
          }, SILENCE_MS)
        }
      }
    }

    recognitionRef.current = recognition
    return () => {
      try { recognition.stop() } catch (e) { }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
        silenceTimerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // NOTE: keep empty deps so handlers are created once; we read speaker via ref

  useEffect(() => {
    // whenever fullConversation changes, call classify if not empty
    if (!fullConversation.trim()) return
    classifyConversation(fullConversation)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fullConversation])

  const addMessage = (who, text) => {
    setMessages(prev => [...prev, { who, text }])
    setFullConversation(prev => (prev ? prev + `\n` : '') + `${who}: ${text}`)
  }

  const classifyConversation = async (conversation) => {
    try {
      const res = await fetch(`${API_BASE}/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation })
      })
      const data = await res.json()
      if (!res.ok) {
        setScamLevel('Processing Error')
        setSuggestedReply(data.error || 'Error processing conversation.')
        return
      }
      if (data.confidence_level) {
        setScamLevel(data.confidence_level)
      }
      if (data.suggested_reply) {
        setSuggestedReply(data.suggested_reply)
      } else if (data.error) {
        setSuggestedReply(`Error: ${data.error}`)
      }
    } catch (e) {
      console.error(e)
      setScamLevel('Processing Error')
      setSuggestedReply('Could not reach classification server.')
    }
  }

  // Updated: start/stop now acts like a call button. Start begins a call (receiver starts speaking by default),
  // and clicking again will end the call. Recognition auto-restarts during the call so user doesn't need to repeatedly click.
  const handleStartStop = () => {
    if (!recognitionReady) {
      setError('Speech recognition not ready yet.')
      return
    }
    const r = recognitionRef.current
    if (!r) {
      setError('Speech recognition not available.')
      return
    }

    if (!callActive) {
      // start call
      setError(null)
      setCallActive(true)
      setCurrentSpeaker('Receiver') // receiver always starts by default
      try {
        r.start()
        setRecognizing(true)
      } catch (e) {
        console.error('Start failed:', e)
        setError('Failed to start speech recognition.')
        setCallActive(false)
      }
    } else {
      // end call (toggle off)
      handleEndCall()
    }
  }

  const handleEndCall = () => {
    // stop recognition and reset conversation (end call)
    const r = recognitionRef.current
    try { r && r.stop() } catch (e) { }
    setCallActive(false)
    setRecognizing(false)
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }
    setMessages([])
    setFullConversation('')
    setScamLevel('Not analyzed yet')
    setSuggestedReply('No reply suggested.')
    setCurrentSpeaker('Receiver')
    setError(null)
  }

  const handleCopyReply = async () => {
    try {
      await navigator.clipboard.writeText(suggestedReply || '')
    } catch (e) {
      console.error(e)
    }
  }

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
                className={`px-4 py-2 rounded-md text-white ${callActive ? 'bg-red-500' : 'bg-green-600'}`}
              >
                {callActive ? 'End Call' : 'Start Call'}
              </button>
              <button
                onClick={handleEndCall}
                className="px-4 py-2 rounded-md bg-gray-200 text-gray-800"
              >
                Reset
              </button>
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
                <button
                  onClick={handleCopyReply}
                  className="text-xs px-2 py-1 rounded bg-indigo-50 text-indigo-700"
                >
                  Copy
                </button>
              </div>
              <textarea
                readOnly
                value={suggestedReply}
                rows={4}
                className="w-full resize-none p-2 border rounded text-sm bg-gray-50"
              />
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
              This UI sends the full conversation to your Flask backend at
              <div className="break-all text-xs mt-1">{API_BASE}/classify</div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
