# All workflow logic copied verbatim from your Flask server.
# I did not change logic — only placed into a module.

from typing import TypedDict, Optional
from pydantic import BaseModel, Field
from typing_extensions import Literal
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import PydanticOutputParser
from langchain_google_genai import ChatGoogleGenerativeAI
from langgraph.graph import StateGraph, END

# Re-declare local types to avoid circular imports; real models live in app.models
from app.models import ScamClassification, ConversationState

def count_conversation_cycles(conversation: str) -> int:
    """Count the number of back-and-forth cycles in the conversation."""
    lines = [line.strip() for line in conversation.strip().split('\n') if line.strip()]
    caller_lines = [line for line in lines if line.lower().startswith('caller:')]
    receiver_lines = [line for line in lines if line.lower().startswith('receiver:')]
    return min(len(caller_lines), len(receiver_lines))

def conversation_summarizer_node(state: ConversationState) -> ConversationState:
    """Node 1: Summarize the conversation focusing on the caller side."""
    conversation = state["conversation"]
    
    prompt_template = """
    You are a professional call summarizer. Your task is to summarize this phone conversation, with a primary focus on what the Caller said or asked.

    Conversation:
    {conversation}

    Guidelines:
    - Focus on the Caller's perspective, intentions, and key points.
    - Omit personal credentials, sensitive details, filler words, and irrelevant small talk.
    - Keep the summary concise but include all important context so it remains self-contained.
    - The final sentence of the summary must explicitly state the Caller's most recent reply or question (i.e., the current point in the conversation).
    
    Summary:
    """
    
    prompt = PromptTemplate(
        template=prompt_template,
        input_variables=["conversation"]
    )
    
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash", 
        temperature=0.3,
        max_output_tokens=300
    )
    
    chain = prompt | llm
    summary = chain.invoke({"conversation": conversation}).content
    
    state["summary"] = summary
    return state

def classifier_and_replier_node(state: ConversationState) -> ConversationState:
    """Node 2: Classify the conversation and generate reply if needed."""
    summary = state["summary"]
    
    prompt_template = """
    You are a scam call detection expert. Based on the conversation summary below, classify the scam likelihood into one of the five confidence levels.

    Conversation Summary:
    {summary}

    Confidence Levels:
    - Very High: Obvious scam (urgent threats, suspicious requests, impersonation)
    - High: Strong scam signs, but some uncertainty
    - Not Clear: Insufficient evidence, needs more probing
    - Low: Probably legitimate, but minor concerns
    - Very Low: Clearly legitimate

    Rules:
    - If classification is "High" or "Not Clear", also suggest ONE short, polite probing reply that could help confirm legitimacy (do not reveal personal information).
    - Keep the reply natural and under 15 words.

    Respond in this JSON format:
    {format_instructions}
    """
    
    parser = PydanticOutputParser(pydantic_object=ScamClassification)
    
    prompt = PromptTemplate(
        template=prompt_template,
        input_variables=["summary"],
        partial_variables={"format_instructions": parser.get_format_instructions()}
    )
    
    llm = ChatGoogleGenerativeAI(
        model="gemini-2.0-flash", 
        temperature=0.4,
        max_output_tokens=200
    )
    
    chain = prompt | llm | parser
    classification = chain.invoke({"summary": summary})
    
    state["classification"] = classification
    return state

def should_process_conversation(state: ConversationState) -> str:
    """Decision node: Check if conversation has enough cycles."""
    if state["cycles_count"] >= 2:
        return "summarize"
    else:
        return "insufficient_data"

# Create the LangGraph workflow
def create_scam_detection_workflow():
    """Create the LangGraph workflow for scam detection."""
    workflow = StateGraph(ConversationState)
    
    # Add nodes
    workflow.add_node("summarize", conversation_summarizer_node)
    workflow.add_node("classify", classifier_and_replier_node)
    
    # Add edges
    workflow.set_conditional_entry_point(
        should_process_conversation,
        {
            "summarize": "summarize",
            "insufficient_data": END
        }
    )
    
    workflow.add_edge("summarize", "classify")
    workflow.add_edge("classify", END)
    
    return workflow.compile()