from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse, FileResponse
from dotenv import load_dotenv
import os

from app.core.workflow import create_scam_detection_workflow, count_conversation_cycles
from app.models import ConversationState, ScamClassification

load_dotenv()

router = APIRouter()

# Initialize the workflow once (same as Flask global)
scam_detection_workflow = create_scam_detection_workflow()

@router.post("/classify")
async def classify(request: Request):
    """
    Classifies a conversation as scam or not using the same LangGraph workflow.
    This mirrors the original Flask endpoint (status codes & JSON shapes preserved).
    """
    try:
        data = await request.json()
    except Exception:
        return JSONResponse(content={"error": "Invalid JSON"}, status_code=400)

    conversation = data.get("conversation", "")

    if not isinstance(conversation, str) or not conversation.strip():
        return JSONResponse(content={"error": "Empty conversation"}, status_code=400)

    cycles_count = count_conversation_cycles(conversation)

    if cycles_count < 2:
        return JSONResponse(content={
            "confidence_level": "Insufficient Data",
            "suggested_reply": "Add more conversation to start scam detection. At least 2 Caller-Receiver cycles are needed."
        })

    # Prepare state for the workflow
    initial_state = ConversationState(
        conversation=conversation,
        summary="",
        classification=None,
        cycles_count=cycles_count
    )

    try:
        result = scam_detection_workflow.invoke(initial_state)
        
        if result["classification"]:
            classification = result["classification"]
            response_data = {
                "confidence_level": classification.confidence_level,
                "suggested_reply": classification.suggested_reply or "No reply needed.",
                "summary": result["summary"] or "No summary available."
            }
        else:
            response_data = {
                "confidence_level": "Processing Error",
                "suggested_reply": "Could not process the conversation.",
                "summary": "No summary available."
            }
            
        return JSONResponse(content=response_data)
        
    except Exception as e:
        print(f"Workflow execution error: {e}")
        return JSONResponse(content={
            "error": f"Error during scam detection workflow: {str(e)}"
        }, status_code=500)


@router.get("/")
async def root():
    # Serve the index.html if present - same behavior as Flask's render_template('index.html')
    index_path = os.path.join(os.getcwd(), "templates", "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path, media_type="text/html")
    return JSONResponse(content={"message": "Index not found. Place your index.html in templates/"}, status_code=404)