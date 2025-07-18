from flask import Flask, request, jsonify, render_template
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
import torch.nn.functional as F
from flask_cors import CORS
from dotenv import load_dotenv
import os
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnableLambda
from langchain_google_genai import ChatGoogleGenerativeAI

load_dotenv()

SCAM_MODEL_NAME = "BothBosu/bert-agent-scam-classifier-v1.0"
SCAM_TOKENIZER = AutoTokenizer.from_pretrained(SCAM_MODEL_NAME)
SCAM_MODEL = AutoModelForSequenceClassification.from_pretrained(SCAM_MODEL_NAME)


def get_scam_probability(conversation: str) -> float:
    """
    Calculates the scam probability for a given conversation using the pre-loaded model.
    """
    scam_inputs = SCAM_TOKENIZER(conversation, return_tensors="pt", truncation=True, padding=True, max_length=512)
    with torch.no_grad():
        scam_outputs = SCAM_MODEL(**scam_inputs)
        scam_probs = F.softmax(scam_outputs.logits, dim=1)
        scam_prob = scam_probs[0][1].item()
    return scam_prob


def create_reply_generation_chain():
    """
    Creates a LangChain chain for generating a suggested reply using Google Gemini.
    """
    prompt_template = """
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
    prompt = PromptTemplate(
        template=prompt_template,
        input_variables=["conversation"]
    )

    llm = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash", 
        temperature=0.7,
        max_output_tokens=50
    )

    chain = prompt | llm | StrOutputParser()
    return chain


app = Flask(__name__, static_folder='static', template_folder='templates')
CORS(app)

scam_classification_chain = RunnableLambda(get_scam_probability)
reply_generation_chain = create_reply_generation_chain()

@app.route('/')
def index():
    """Serves the main HTML page."""
    return render_template('index.html')

@app.route('/classify', methods=['POST'])
def classify():
    """
    Classifies a conversation as scam or not and suggests a reply if uncertain.
    """
    data = request.get_json()
    conversation = data.get("conversation", "")

    if not conversation.strip():
        return jsonify({"error": "Empty conversation"}), 400

    turns = [turn for turn in conversation.strip().split('\n') if turn.strip()]
    if len(turns) < 4:
        return jsonify({
            "scam_probability": 0.0,
            "non_scam_probability": 1.0,
            "suggested_reply": "Add more conversation to start scam detection. At least 2 Caller-Receiver cycles are needed."
        })

    caller_conversation = "\n".join([turn for turn in turns if turn.lower().startswith('caller:')])

    print("Caller conversation for scam detection:\n", caller_conversation)

    try:
        scam_prob = scam_classification_chain.invoke(caller_conversation)
        non_scam_prob = 1.0 - scam_prob
    except (ValueError, TypeError) as e:
        print(f"Error parsing scam probability: {e}")
        return jsonify({"error": "Could not determine scam probability from model output."}), 500
    except Exception as e:
        print(f"Scam classification invocation error: {e}")
        return jsonify({"error": f"Error during scam classification: {str(e)}"}), 500

    if scam_prob < 0.4:
        suggested_reply = "No Reply needed, it's likely a non-scam conversation."
    elif scam_prob > 0.65:
        suggested_reply = "No Reply needed, it's likely a scam."
    else:
        try:
            raw_reply = reply_generation_chain.invoke({"conversation": conversation})
            cleaned_reply = raw_reply.strip().replace("\n", " ").strip()
            suggested_reply = cleaned_reply if cleaned_reply else "Sorry, couldn't generate a reply."
        except Exception as e:
            suggested_reply = f"Error generating reply: {str(e)}"
            print(f"LangChain invocation error: {e}")

    return jsonify({
        "scam_probability": round(scam_prob, 4),
        "non_scam_probability": round(non_scam_prob, 4),
        "suggested_reply": suggested_reply
    })

if __name__ == '__main__':
    app.run(debug=True)