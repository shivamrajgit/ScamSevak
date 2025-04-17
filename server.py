from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch.nn.functional as F
import torch
import os

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)  # Allow CORS for frontend requests

# Load the scam classifier model
model_name = "BothBosu/bert-agent-scam-classifier-v1.0"
tokenizer = AutoTokenizer.from_pretrained(model_name)
model = AutoModelForSequenceClassification.from_pretrained(model_name)

@app.route('/')
def index():
    # Serve the HTML page
    return render_template('index.html')

@app.route('/classify', methods=['POST'])
def classify():
    data = request.get_json()
    conversation = data.get("conversation", "")

    # Replace 'Speaker 1' with 'Caller' and 'Speaker 2' with 'Receiver'
    conversation = conversation.replace("Speaker 1:", "Receiver:").replace("Speaker 2:", "Caller:")

    if not conversation.strip():
        return jsonify({"error": "Empty conversation"}), 400
    print("Input:", conversation,"\n")
    inputs = tokenizer(conversation, return_tensors="pt", truncation=True, padding=True, max_length=512)

    with torch.no_grad():
        outputs = model(**inputs)
        probs = F.softmax(outputs.logits, dim=1)
        
        non_scam_prob = probs[0][0].item()  # Probability of 'non-scam'
        scam_prob = probs[0][1].item()  # Probability of 'scam'

        print(f"Non-scam Probability: {non_scam_prob}, Scam Probability: {scam_prob}")

    return jsonify({"scam_probability": round(scam_prob, 4), "non_scam_probability": round(non_scam_prob, 4)})


if __name__ == '__main__':
    # Ensure you have 'templates' and 'static' folders set up in the right place
    app.run(debug=True)
