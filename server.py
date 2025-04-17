from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
import torch.nn.functional as F
import requests
import os

from dotenv import load_dotenv
import os

load_dotenv() 

HF_TOKEN = os.getenv("HF_TOKEN")


app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

# Load the scam classifier model
scam_model_name = "BothBosu/bert-agent-scam-classifier-v1.0"
scam_tokenizer = AutoTokenizer.from_pretrained(scam_model_name)
scam_model = AutoModelForSequenceClassification.from_pretrained(scam_model_name)



# Hugging Face Inference API settings
HF_API_URL = "https://api-inference.huggingface.co/models/mistralai/Mixtral-8x7B-Instruct-v0.1"
HF_API_KEY =  os.getenv("HF_TOKEN")
hf_headers = {"Authorization": f"Bearer {HF_API_KEY}"}

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/classify', methods=['POST'])
def classify():
    data = request.get_json()
    conversation = data.get("conversation", "")

    # Replace speaker tags
    conversation = conversation.replace("Speaker 1:", "Receiver:").replace("Speaker 2:", "Caller:")

    if not conversation.strip():
        return jsonify({"error": "Empty conversation"}), 400

    print("Input conversation:", conversation)

    # Run scam classifier
    scam_inputs = scam_tokenizer(conversation, return_tensors="pt", truncation=True, padding=True, max_length=512)
    with torch.no_grad():
        scam_outputs = scam_model(**scam_inputs)
        scam_probs = F.softmax(scam_outputs.logits, dim=1)
        scam_prob = scam_probs[0][1].item()
        non_scam_prob = scam_probs[0][0].item()

    # Prompt for reply generation
    if scam_prob < 0.4:
        suggested_reply = "No Reply needed, it's likely a non-scam conversation."
    elif scam_prob > 0.65:
        suggested_reply = "No Reply needed, it's likely a scam."
    else:
        hf_prompt = f"""
        You are the Receiver in the following conversation:

        {conversation}

        Your goal is to politely and subtly challenge the Caller to help detect a potential scam.

        Ask a question that:
        - Requests specific info a real bank agent should know (e.g., last 4 digits of account).
        - Does NOT reveal any personal information.
        - Prompts the caller to prove their authenticity.

        Only output the reply sentence. Do NOT repeat the conversation.

        Reply:
        """
        try:
            hf_response = requests.post(
                HF_API_URL,
                headers=hf_headers,
                json={
                    "inputs": hf_prompt,
                    "parameters": {
                        "max_new_tokens": 50,  # Limit the response length
                        "temperature": 0.7,
                        "do_sample": True,
                        "top_p": 0.9,
                        "return_full_text": False
                    }
                }
            )

            hf_response.raise_for_status()  # Raise error if the API call fails

            # Get the reply from the response
            # suggested_reply = hf_response.json().get("generated_text", "Sorry, couldn't generate a reply.")
            response_data = hf_response.json()
            if isinstance(response_data, list):

                # Handle the list (usually we want the first item in the list)
                raw_reply = response_data[0].get("generated_text", "Sorry, couldn't generate a reply.")
                cleaned_reply = raw_reply.strip().replace('\n', ' ').strip()
                suggested_reply = cleaned_reply if cleaned_reply else "Sorry, couldn't generate a reply."
            else:
                suggested_reply = "Unexpected response format."
        except Exception as e:
            suggested_reply = f"Error generating reply: {str(e)}"
            print("Hugging Face API error:", e)
    return jsonify({
        "scam_probability": round(scam_prob, 4),
        "non_scam_probability": round(non_scam_prob, 4),
        "suggested_reply": suggested_reply
    })

if __name__ == '__main__':
    app.run(debug=True)
