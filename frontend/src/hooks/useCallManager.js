import { useEffect, useRef, useState } from 'react'
import { classifyConversation as classifyAPI, API_BASE } from '../utils/api.js'

export default function useCallManager() {
    const [recognizing, setRecognizing] = useState(false)
    const [recognitionReady, setRecognitionReady] = useState(false)
    const [messages, setMessages] = useState([]) // {who, text}
    const [currentSpeakerState, setCurrentSpeakerState] = useState('Receiver')
    const currentSpeakerRef = useRef('Receiver')

    const [fullConversation, setFullConversation] = useState('')
    const [scamLevel, setScamLevel] = useState('Not analyzed yet')
    const [suggestedReply, setSuggestedReply] = useState('No reply suggested.')
    const [error, setError] = useState(null)
    const [callActive, setCallActive] = useState(false)

    const transcriptRef = useRef(null)
    const recognitionRef = useRef(null)
    const silenceTimerRef = useRef(null)
    const callActiveRef = useRef(callActive)

    useEffect(() => { callActiveRef.current = callActive }, [callActive])
    useEffect(() => { currentSpeakerRef.current = currentSpeakerState }, [currentSpeakerState])

    useEffect(() => {
        const t = setTimeout(() => setRecognitionReady(true), 700)
        return () => clearTimeout(t)
    }, [])

    useEffect(() => {
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
            if (callActiveRef.current) {
                try {
                    recognition.start()
                } catch (e) {
                    console.warn('Could not auto-restart recognition:', e)
                    setRecognizing(false)
                }
            } else {
                setRecognizing(false)
            }
        }

        const SILENCE_MS = 1200

        recognition.onresult = async (event) => {
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    const text = event.results[i][0].transcript.trim()
                    addMessage(currentSpeakerRef.current, text)

                    if (silenceTimerRef.current) {
                        clearTimeout(silenceTimerRef.current)
                        silenceTimerRef.current = null
                    }

                    silenceTimerRef.current = setTimeout(() => {
                        setCurrentSpeakerState(prev => prev === 'Caller' ? 'Receiver' : 'Caller')
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
    }, [])

    useEffect(() => {
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
            const data = await classifyAPI(conversation)

            if (data && data.confidence_level) {
                setScamLevel(data.confidence_level)
            }
            if (data && data.suggested_reply) {
                setSuggestedReply(data.suggested_reply)
            } else if (data && data.error) {
                setSuggestedReply(`Error: ${data.error}`)
            }
        } catch (e) {
            console.error(e)
            setScamLevel('Processing Error')
            setSuggestedReply('Could not reach classification server.')
        }
    }

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
            setError(null)
            setCallActive(true)
            setCurrentSpeakerState('Receiver')
            try {
                r.start()
                setRecognizing(true)
            } catch (e) {
                console.error('Start failed:', e)
                setError('Failed to start speech recognition.')
                setCallActive(false)
            }
        } else {
            handleEndCall()
        }
    }

    const handleEndCall = () => {
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
        setCurrentSpeakerState('Receiver')
        setError(null)
    }

    const handleCopyReply = async () => {
        try {
            await navigator.clipboard.writeText(suggestedReply || '')
        } catch (e) {
            console.error(e)
        }
    }

    return {
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
    }
}