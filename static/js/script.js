let recognizing = false;
let finalTranscript = '';
let fullConversation = '';
let currentSpeaker = 'Receiver';
let recognitionReady = false;

const startBtn = document.getElementById('startBtn');
const transcriptEl = document.getElementById('transcript');
const scamProbEl = document.getElementById('scam-prob');
const suggestedReplyEl = document.getElementById('suggested-reply');

const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.continuous = true;
recognition.interimResults = false;

recognition.onstart = () => {
    console.log("Speech recognition started.");
    recognizing = true;
    startBtn.textContent = 'Stop Listening';
};

recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
    recognizing = false;
    startBtn.textContent = 'Start Listening';
};

recognition.onend = () => {
    console.log("Speech recognition stopped.");
    recognizing = false;
    startBtn.textContent = 'Start Listening';
};

startBtn.addEventListener('click', () => {
    if (!recognitionReady) {
        console.warn("Speech recognition engine not ready yet. Please wait a moment.");
        return;
    }

    if (!recognizing) {
        try {
            recognition.start();
            startBtn.textContent = 'Stop Listening';
        } catch (err) {
            console.error("Recognition start failed:", err);
        }
    } else {
        recognition.stop();
        startBtn.textContent = 'Start Listening';
        fullConversation = '';
        transcriptEl.innerText = '';
        scamProbEl.innerText = '0';
        currentSpeaker = 'Receiver';
    }
    recognizing = !recognizing;
});

recognition.onresult = async (event) => {
    for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
            const text = event.results[i][0].transcript.trim();
            
            const messageEl = document.createElement('div');
            messageEl.classList.add('message', currentSpeaker.toLowerCase());
            messageEl.innerText = text;
            transcriptEl.appendChild(messageEl);
            transcriptEl.scrollTop = transcriptEl.scrollHeight;

            fullConversation += `${currentSpeaker}: ${text}\n`;

            currentSpeaker = currentSpeaker === 'Caller' ? 'Receiver' : 'Caller';

            const response = await fetch('http://127.0.0.1:5000/classify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ conversation: fullConversation })
            });

            const data = await response.json();
            if (data.scam_probability !== undefined) {
                scamProbEl.innerText = `${(data.scam_probability * 100).toFixed(2)}%`;
            }
            if (data.suggested_reply) {
                suggestedReplyEl.innerText = data.suggested_reply;
            }
            else {
                suggestedReplyEl.innerText = 'No reply suggested yet.';
                console.log('Error in getting reply:', data.error);
            }
        }
    }
};


window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        recognitionReady = true;
        console.log("Speech recognition engine ready.");
    }, 1000);
});