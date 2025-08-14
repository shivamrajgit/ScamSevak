import React from 'react'

export default function MessageBubble({ who, text }) {
    const isCaller = who === 'Caller'
    return (
        <div className={`flex ${isCaller ? 'justify-start' : 'justify-end'} my-1`}>
            <div className={`${isCaller ? 'bg-white border' : 'bg-indigo-600 text-white'} p-3 rounded-lg max-w-[80%]`}>
                <div className="text-xs opacity-70 mb-1">{who}</div>
                <div className="text-sm break-words">{text}</div>
            </div>
        </div>
    )
}