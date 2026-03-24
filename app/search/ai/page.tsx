'use client'

import { useState, useRef, useEffect } from 'react'
import { FaPaperPlane, FaRobot, FaUser, FaCopy, FaThumbsUp, FaThumbsDown, FaUserMd, FaAmbulance, FaShieldAlt, FaUserNurse, FaPills, FaFlask, FaLightbulb, FaExclamationTriangle } from 'react-icons/fa'

interface Message {
 id: string
 type: 'user' | 'assistant'
 content: string
 timestamp: Date
}

const initialMessages: Message[] = [
 {
 id: '1',
 type: 'assistant',
 content: `Hello! I'm your AI Medical Support Assistant. I'm here to help you with:

• **Emergency Procedures** - Steps to follow in medical emergencies
• **Booking Guidance** - How to book doctors, tests, or services
• **Insurance Information** - Understanding your coverage and claims
• **Medication Advice** - Information about medicines and prescriptions
• **Healthcare Navigation** - Finding the right services for your needs
• **Administrative Procedures** - Help with healthcare paperwork and processes

How can I assist you today?`,
 timestamp: new Date()
 }
]

const quickPrompts = [
 {
 icon: FaAmbulance,
 text: "Emergency procedure steps",
 prompt: "What are the steps I should follow in a medical emergency?"
 },
 {
 icon: FaUserMd,
 text: "How to book a doctor",
 prompt: "Can you guide me through the process of booking a doctor appointment?"
 },
 {
 icon: FaShieldAlt,
 text: "Insurance claim process",
 prompt: "How do I file a health insurance claim and what documents do I need?"
 },
 {
 icon: FaPills,
 text: "Medication guidance",
 prompt: "I need help understanding my prescription and how to take my medications properly."
 },
 {
 icon: FaFlask,
 text: "Lab test booking",
 prompt: "What's the process for booking lab tests and preparing for them?"
 },
 {
 icon: FaUserNurse,
 text: "When to call a nurse",
 prompt: "What symptoms or situations require calling a nurse for home care?"
 }
]


export default function AIMedicalChatbot() {
 const [messages, setMessages] = useState<Message[]>(initialMessages)
 const [inputMessage, setInputMessage] = useState('')
 const [isTyping, setIsTyping] = useState(false)
 const messagesEndRef = useRef<HTMLDivElement>(null)
 const inputRef = useRef<HTMLInputElement>(null)

 const scrollToBottom = () => {
 messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
 }

 useEffect(() => {
 scrollToBottom()
 }, [messages])

 const handleSendMessage = async () => {
 if (!inputMessage.trim()) return

 const userMessage: Message = {
 id: Date.now().toString(),
 type: 'user',
 content: inputMessage,
 timestamp: new Date()
 }

 const currentMessages = [...messages, userMessage]
 setMessages(currentMessages)
 setInputMessage('')
 setIsTyping(true)

 try {
 const history = currentMessages
 .slice(-20)
 .filter(m => m.id !== '1')
 .map(m => ({
 role: m.type === 'user' ? 'user' as const : 'assistant' as const,
 content: m.content,
 }))

 const res = await fetch('/api/ai/support', {
 method: 'POST',
 headers: { 'Content-Type': 'application/json' },
 body: JSON.stringify({ message: inputMessage, history }),
 })

 const json = await res.json()
 const responseText = res.ok && json.success
 ? json.data.response
 : 'Sorry, I could not process your request at this time. Please try again or contact support.'

 const aiResponse: Message = {
 id: (Date.now() + 1).toString(),
 type: 'assistant',
 content: responseText,
 timestamp: new Date()
 }

 setMessages(prev => [...prev, aiResponse])
 } catch {
 const errorResponse: Message = {
 id: (Date.now() + 1).toString(),
 type: 'assistant',
 content: 'Sorry, I am unable to connect to the AI service right now. Please try again later or call emergency services directly at 114 for urgent matters.',
 timestamp: new Date()
 }
 setMessages(prev => [...prev, errorResponse])
 } finally {
 setIsTyping(false)
 }
 }

 const handleQuickPrompt = (prompt: string) => {
 setInputMessage(prompt)
 inputRef.current?.focus()
 }

 const handleKeyPress = (e: React.KeyboardEvent) => {
 if (e.key === 'Enter' && !e.shiftKey) {
 e.preventDefault()
 handleSendMessage()
 }
 }

 return (
 <div className="min-h-screen to-black">
 <div className="container mx-auto px-4 py-8 max-w-4xl">
 <div className="text-center mb-8">
 <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
 <div className="flex items-center justify-center gap-3 mb-4">
 <div className=" p-3 rounded-full">
 <FaRobot className="text-2xl text-white" />
 </div>
 <h1 className="text-3xl font-bold text-white">AI Medical Support Assistant</h1>
 </div>
 <p className="text-blue-100 text-lg">
 Get instant guidance on medical procedures, emergency steps, booking services, and healthcare navigation
 </p>
 </div>
 </div>

 <div className="mb-6">
 <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
 <FaLightbulb className="text-yellow-400" />
 Quick Help Topics
 </h3>
 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
 {quickPrompts.map((prompt, index) => (
 <button
 key={index}
 onClick={() => handleQuickPrompt(prompt.prompt)}
 className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg p-3 text-white hover:bg-white/20 transition-all duration-200 text-left"
 >
 <div className="flex items-center gap-3">
 <prompt.icon className="text-blue-400 text-lg" />
 <span className="text-sm font-medium">{prompt.text}</span>
 </div>
 </button>
 ))}
 </div>
 </div>

 <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/20 overflow-hidden">
 <div className="h-96 md:h-[500px] overflow-y-auto p-4 space-y-4">
 {messages.map((message) => (
 <div
 key={message.id}
 className={`flex gap-3 ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
 >
 {message.type === 'assistant' && (
 <div className=" p-2 rounded-full self-start">
 <FaRobot className="text-white text-sm" />
 </div>
 )}
 
 <div className={`max-w-[80%] ${message.type === 'user' ? 'order-first' : ''}`}>
 <div
 className={`rounded-2xl p-4 ${
 message.type === 'user'
 ? ' text-white ml-auto'
 : 'bg-white/10 backdrop-blur-sm border border-white/20 text-white'
 }`}
 >
 <div className="prose prose-invert max-w-none">
 {message.content.split('\n').map((line, i) => {
 if (line.trim() === '') return <br key={i} />
 if (line.includes('**')) {
 const parts = line.split('**')
 return (
 <p key={i} className="mb-2">
 {parts.map((part, j) => 
 j % 2 === 1 ? <strong key={j}>{part}</strong> : part
 )}
 </p>
 )
 }
 
 if (line.trim().startsWith('•') || line.trim().startsWith('-')) {
 return (
 <div key={i} className="flex items-start gap-2 mb-1">
 <span className="text-blue-400 mt-1">•</span>
 <span>{line.replace(/^[•-]\s*/, '')}</span>
 </div>
 )
 }
 
 return <p key={i} className="mb-2">{line}</p>
 })}
 </div>
 </div>
 <div className="flex items-center gap-2 mt-2">
 <span className="text-xs text-white/60">
 {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
 </span>
 {message.type === 'assistant' && (
 <div className="flex gap-1">
 <button className="text-white/60 hover:text-green-400 transition-colors">
 <FaThumbsUp className="text-xs" />
 </button>
 <button className="text-white/60 hover:text-red-400 transition-colors">
 <FaThumbsDown className="text-xs" />
 </button>
 <button className="text-white/60 hover:text-blue-400 transition-colors">
 <FaCopy className="text-xs" />
 </button>
 </div>
 )}
 </div>
 </div>

 {message.type === 'user' && (
 <div className=" p-2 rounded-full self-start">
 <FaUser className="text-white text-sm" />
 </div>
 )}
 </div>
 ))}

 {isTyping && (
 <div className="flex gap-3 justify-start">
 <div className=" p-2 rounded-full">
 <FaRobot className="text-white text-sm" />
 </div>
 <div className="bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl p-4">
 <div className="flex gap-1">
 <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
 <span className="w-2 h-2 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
 <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
 </div>
 </div>
 </div>
 )}
 
 <div ref={messagesEndRef} />
 </div>

 <div className="border-t border-white/20 p-4">
 <div className="flex gap-3">
 <input
 ref={inputRef}
 type="text"
 value={inputMessage}
 onChange={(e) => setInputMessage(e.target.value)}
 onKeyPress={handleKeyPress}
 placeholder="Ask me about medical procedures, emergency steps, booking guidance, or any healthcare question..."
 className="flex-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl px-4 py-3 text-white placeholder-white/60 focus:outline-none focus:border-blue-400 transition-colors"
 />
 <button
 onClick={handleSendMessage}
 disabled={!inputMessage.trim() || isTyping}
 className=" disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-all duration-200"
 >
 <FaPaperPlane className="text-lg" />
 </button>
 </div>
 <div className="flex items-center gap-4 mt-3 text-xs text-white/60">
 <span>Press Enter to send, Shift+Enter for new line</span>
 <div className="flex items-center gap-1">
 <div className="w-2 h-2 bg-green-400 rounded-full"></div>
 <span>AI Assistant Online</span>
 </div>
 </div>
 </div>
 </div>

 <div className="mt-6 bg-yellow-900/20 border border-yellow-600/30 rounded-lg p-4">
 <div className="flex items-start gap-3">
 <FaExclamationTriangle className="text-yellow-400 text-lg mt-1" />
 <div>
 <h4 className="text-yellow-200 font-semibold mb-1">Medical Disclaimer</h4>
 <p className="text-yellow-100/80 text-sm">
 This AI assistant provides general information and guidance only. For medical emergencies, call 114 immediately. 
 Always consult qualified healthcare professionals for medical advice, diagnosis, or treatment decisions.
 </p>
 </div>
 </div>
 </div>
 </div>
 </div>
 )
}