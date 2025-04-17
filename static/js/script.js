let recognizing = false;
let finalTranscript = '';
let fullConversation = '';
let speakerIndex = 1;

const startBtn = document.getElementById('startBtn');
const transcriptEl = document.getElementById('transcript');
const scamProbEl = document.getElementById('scam-prob');

const recognition = new (window.SpeechRecognition || window.webkitSpeechRecognition)();
recognition.continuous = true;
recognition.interimResults = false;

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
        }
    }
};

// Start/Stop listening functionality
startBtn.addEventListener('click', () => {
    if (!recognizing) {
        recognition.start();
        startBtn.textContent = 'Stop Listening';
    } else {
        recognition.stop();
        startBtn.textContent = 'Start Listening';
        
        // Reset everything when stopping
        fullConversation = '';
        transcriptEl.innerText = '';  // Clear transcript
        scamProbEl.innerText = '0';  // Reset scam probability
        speakerIndex = 1;  // Reset speaker to Speaker 1
        console.log('Conversation cleared!');
    }
    recognizing = !recognizing;
});
