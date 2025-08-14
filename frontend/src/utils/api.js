export const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:5000'

export async function classifyConversation(conversation) {
    const res = await fetch(`${API_BASE}/classify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ conversation })
    })
    const data = await res.json()
    if (!res.ok) {
        throw new Error(data.error || 'Error processing conversation')
    }
    return data
}