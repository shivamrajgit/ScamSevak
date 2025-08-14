import React from 'react'

const confidenceColors = {
    "Very High": "bg-red-500 text-white",
    "High": "bg-orange-400 text-white",
    "Not Clear": "bg-yellow-400 text-black",
    "Low": "bg-lime-500 text-white",
    "Very Low": "bg-green-500 text-white",
    "Insufficient Data": "bg-gray-300 text-black",
    "Processing Error": "bg-red-700 text-white"
}

export default function ScamMeter({ level }) {
    const cls = confidenceColors[level] || "bg-gray-200 text-black"
    return (
        <div className="w-full">
            <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Scam Confidence</span>
                <span className="text-sm">{level || 'Not analyzed yet'}</span>
            </div>
            <div className="w-full h-4 rounded-md bg-gray-200 overflow-hidden">
                <div className={`h-full transition-all duration-300 ${cls}`} style={{ width: level ? '100%' : '0%' }} />
            </div>
        </div>
    )
}