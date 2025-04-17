let recognizing = false;
let finalTranscript = '';
let fullConversation = '';
let speakerIndex = 1;
let recognitionReady = false;

const startBtn = document.getElementById('startBtn');
const transcriptEl = document.getElementById('transcript');
const scamProbEl = document.getElementById('scam-prob');
const suggestedReplyEl = document.getElementById('suggested-reply');

const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.continuous = true;
recognition.interimResults = false;

// Set when the engine is ready
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


recognition.onresult = async (event) => {
    for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
            const text = event.results[i][0].transcript.trim();
            const labeled = `Speaker ${speakerIndex}: ${text}`;
            fullConversation += labeled + '\n';
            transcriptEl.innerText = fullConversation;

            // Alternate speakers
            speakerIndex = speakerIndex === 1 ? 2 : 1;

            // Send to backend
            const response = await fetch('/classify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ conversation: fullConversation })
            });

            const data = await response.json();
            if (data.scam_probability !== undefined) {
                scamProbEl.innerText = data.scam_probability;
            } else {
                console.log('Classification error:', data.error);
            }
            if (data.suggested_reply) {
                suggestedReplyEl.innerText = data.suggested_reply; // Update the suggested reply
            } else {
                console.log('Error in getting reply:', data.error);
            }
        }
    }
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
        // Reset everything
        fullConversation = '';
        transcriptEl.innerText = '';
        scamProbEl.innerText = '0';
        speakerIndex = 1;
    }
    recognizing = !recognizing;
});

recognition.onresult = async (event) => {
    for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
            const text = event.results[i][0].transcript.trim();
            const labeled = `Speaker ${speakerIndex}: ${text}`;
            fullConversation += labeled + '\n';
            transcriptEl.innerText = fullConversation;

            // Alternate speakers
            speakerIndex = speakerIndex === 1 ? 2 : 1;

            // Send to backend
            const response = await fetch('http://127.0.0.1:5000/classify', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ conversation: fullConversation })
            });

            const data = await response.json();
            if (data.scam_probability !== undefined) {
                scamProbEl.innerText = `Scam Probability: ${data.scam_probability}`;
            }
            if (data.suggested_reply) {
                suggestedReplyEl.innerText = `Suggested Reply: ${data.suggested_reply}`;
            } else {
                console.log('Error in getting reply:', data.error);
            }
        }
    }
};


window.addEventListener('DOMContentLoaded', () => {
    // Wait a moment before allowing recognition
    setTimeout(() => {
        recognitionReady = true;
        console.log("Speech recognition engine ready.");
    }, 1000);
});
