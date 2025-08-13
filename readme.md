# ScamGuard: AI-Powered Real-time Scam Detection

An intelligent real-time conversation security assistant that uses advanced AI to detect scam calls and provide smart responses to help users navigate suspicious conversations.

## 🚀 Features

- **Real-time Scam Detection**: Analyzes live conversations using Google Gemini LLM through LangGraph workflows
- **Intelligent Classification**: Categorizes conversations into 5 confidence levels (Very High, High, Not Clear, Low, Very Low)
- **Smart Reply Generation**: Automatically suggests responses when confidence is uncertain to help gather more information
- **Conversation Summarization**: Focuses on caller behavior and tracks conversation flow
- **Voice Recognition**: Live speech-to-text transcription for real-time analysis
- **Visual Indicators**: Color-coded confidence levels for instant threat assessment

## 🏗️ Architecture

The application uses a sophisticated LangGraph-based workflow powered by Google Gemini:

### Workflow Steps:
1. **Input Validation**: Ensures at least 2 back-and-forth conversation cycles
2. **Conversation Summarizer**: Analyzes and summarizes the conversation focusing on caller behavior
3. **Classifier & Replier**: Determines scam likelihood and generates helpful responses when needed
4. **Structured Output**: Returns results using Pydantic schemas for consistency

### Technology Stack:
- **Backend**: Flask (Python)
- **AI/ML**: Google Gemini 2.0 Flash, LangGraph, LangChain
- **Frontend**: HTML5, CSS3, JavaScript
- **Speech Recognition**: Web Speech API
- **Data Validation**: Pydantic

## 📋 Prerequisites

- Python 3.8+
- Google AI API Key (for Gemini)
- Modern web browser with microphone access

## 🛠️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd Transcript
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables**
   Create a `.env` file in the root directory:
   ```env
   GOOGLE_API_KEY=your_google_api_key_here
   ```

4. **Run the application**
   ```bash
   python server.py
   ```

5. **Access the application**
   Open your browser and navigate to `http://127.0.0.1:5000`

## 🎯 Usage

### Web Interface
1. Click "Start Listening" to begin voice recognition
2. Have a conversation (the system will alternate between "Caller" and "Receiver")
3. View real-time scam confidence levels and suggested replies
4. Use suggested replies to challenge suspicious callers

### API Testing
You can test the API using PowerShell commands:

```powershell
# Test suspicious conversation
$body = @{ conversation = "Caller: Hello, this is John from your bank's security department. We've detected suspicious activity.`nReceiver: What kind of activity?`nCaller: Someone tried to withdraw money. I need your account number and PIN immediately.`nReceiver: Shouldn't you already have that information?" } | ConvertTo-Json
Invoke-RestMethod -Uri "http://127.0.0.1:5000/classify" -Method Post -Body $body -ContentType "application/json"
```

## 🔍 API Endpoints

### POST `/classify`
Analyzes a conversation for scam indicators.

**Request Body:**
```json
{
  "conversation": "Caller: Hello...\nReceiver: Hi..."
}
```

**Response:**
```json
{
  "confidence_level": "High",
  "suggested_reply": "Can you provide your employee ID and department?"
}
```

## 🎨 Confidence Levels

- **🔴 Very High**: Clear scam indicators - immediate action recommended
- **🟠 High**: Strong scam indicators with some uncertainty
- **🟡 Not Clear**: Insufficient information - suggested reply provided
- **🟢 Low**: Unlikely to be scam but minor concerns
- **🟢 Very Low**: Clearly legitimate conversation

## 📁 Project Structure

```
ScamGuard/
├── server.py              # Main Flask application with LangGraph workflow
├── templates/
│   └── index.html         # Web interface
├── static/
│   ├── css/
│   │   └── style.css      # Styling
│   └── js/
│       └── script.js      # Frontend logic
├── .env                   # Environment variables
├── reference.txt          # Architecture specification
└── README.md             # Project documentation
```

## 🔒 Security Features

- No storage of conversation data
- Local processing with secure API calls
- No transmission of personal information
- Privacy-focused design

## 🚧 Development

The application follows the architecture specified in `reference.txt` and uses:
- LangGraph for workflow orchestration
- Pydantic for data validation
- Google Gemini for natural language understanding
- Structured prompting for consistent results

## 📝 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## ⚠️ Disclaimer

This tool is designed to assist in identifying potential scam calls but should not be the sole method of protection. Always exercise caution and verify caller identity through official channels.
