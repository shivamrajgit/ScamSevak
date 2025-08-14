from typing import TypedDict, Optional
from pydantic import BaseModel, Field
from typing_extensions import Literal

# Pydantic Models for structured output
class ScamClassification(BaseModel):
    """Classification result with confidence level and optional reply."""
    confidence_level: Literal["Very High", "High", "Not Clear", "Low", "Very Low"] = Field(
        description="Confidence level of scam detection"
    )
    suggested_reply: Optional[str] = Field(
        default=None, 
        description="Suggested reply when confidence is 'Not Clear' or 'High'"
    )

# State management for LangGraph
class ConversationState(TypedDict):
    conversation: str
    summary: str
    classification: Optional[ScamClassification]
    cycles_count: int