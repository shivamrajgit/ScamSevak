from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM, AutoModelForSequenceClassification
import torch
import torch.nn.functional as F
import os

app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)  # Allow CORS for frontend requests

# Load the scam classifier model
scam_model_name = "BothBosu/bert-agent-scam-classifier-v1.0"
scam_tokenizer = AutoTokenizer.from_pretrained(scam_model_name)
scam_model = AutoModelForSequenceClassification.from_pretrained(scam_model_name)

# Load the FLAN-T5 model for reply suggestion
flan_model_name = "google/flan-t5-small"  # You can use "flan-t5-base" if needed
flan_tokenizer = AutoTokenizer.from_pretrained(flan_model_name)
flan_model = AutoModelForSeq2SeqLM.from_pretrained(flan_model_name)

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

    # Scam classification
    scam_inputs = scam_tokenizer(conversation, return_tensors="pt", truncation=True, padding=True, max_length=512)
    with torch.no_grad():
        scam_outputs = scam_model(**scam_inputs)
        scam_probs = F.softmax(scam_outputs.logits, dim=1)
        scam_prob = scam_probs[0][1].item()  # Probability of 'scam'
        non_scam_prob = scam_probs[0][0].item() # Probability of 'non-scam'

    # FLAN-T5 reply suggestion
    reply_input = f"Given the following conversation: {conversation}\nSuggest a natural and engaging reply to continue the conversation."
    reply_inputs = flan_tokenizer(reply_input, return_tensors="pt", truncation=True, padding=True, max_length=512)
    
    with torch.no_grad():
        reply_outputs = flan_model.generate(
            reply_inputs['input_ids'],
            max_length=100,  # Limit the length of the response
            num_beams=3,    # Use beam search for better quality
            no_repeat_ngram_size=2,  # Prevent repetition of n-grams
            early_stopping=True
        )

        
    suggested_reply = flan_tokenizer.decode(reply_outputs[0], skip_special_tokens=True)
    print("Generated Reply:", suggested_reply)
    return jsonify({
        "scam_probability": round(scam_prob, 4),
        "non_scam_probability": round(non_scam_prob, 4),
        "suggested_reply": suggested_reply
    })

if __name__ == '__main__':
    app.run(debug=True)
