'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSocket } from '@/hooks/useSocket'
import { useWebRTC } from '@/hooks/useWebRTC'
import { useUser } from '@/hooks/useUser'
import {
 FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash, FaPhone, FaDesktop, FaComments,
 FaUserMd, FaUser, FaWifi, FaClock, FaPaperPlane, FaExpand, FaCompress, FaRecordVinyl,
 FaNotesMedical, FaPrescriptionBottleAlt, FaFileDownload, FaArrowLeft, FaSync
} from 'react-icons/fa'

type UserType = 'doctor' | 'patient'

interface Participant {
 socketId: string
 userId: string
 userName: string
 userType: UserType
}

interface ChatMessage {
 id: string
 socketId: string
 userName: string
 message: string
 timestamp: number | string
}

interface DestroyablePeer { destroy?: () => void }
interface PeerWrapper { peer?: DestroyablePeer }

interface UseWebRTCReturn {
 peers: PeerWrapper[]
 remoteStreams: Map<string, MediaStream>
 chatMessages: ChatMessage[]
 roomParticipants: Participant[]
 isScreenSharing: boolean
 sendChatMessage: (text: string) => void
 toggleVideo: (enabled: boolean) => void
 toggleAudio: (enabled: boolean) => void
 startScreenShare: () => Promise<void>
 stopScreenShare: () => void
}

interface VideoGridProps {
 localStream: MediaStream | null
 remoteStreams: Map<string, MediaStream>
 participants: Participant[]
 localUserName: string
 localUserType: UserType
}

const VideoGrid: React.FC<VideoGridProps> = ({
 localStream,
 remoteStreams,
 participants,
 localUserName,
 localUserType, // may remain unused
}) => {
 const localVideoRef = useRef<HTMLVideoElement>(null)
 const remoteVideoRefs = useRef<Map<string, HTMLVideoElement>>(new Map())

 useEffect(() => {
 if (localVideoRef.current && localStream) {
 localVideoRef.current.srcObject = localStream
 }
 }, [localStream])

 useEffect(() => {
 remoteStreams.forEach((stream, socketId) => {
 const videoElement = remoteVideoRefs.current.get(socketId)
 if (videoElement) videoElement.srcObject = stream
 })
 }, [remoteStreams])

 const totalParticipants = remoteStreams.size + 1
 const gridCols = totalParticipants <= 1 ? 1 : totalParticipants <= 4 ? 2 : 3

 return (
 <div className={`grid gap-4 h-full p-4 ${gridCols === 1 ? 'grid-cols-1' : gridCols === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
 <div className="relative bg-gray-900 rounded-lg overflow-hidden">
 <video ref={localVideoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
 <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1 rounded-full">
 <span className="text-white text-sm font-medium flex items-center gap-2">
 <FaUserMd /> Dr. {localUserName} (You)
 </span>
 </div>
 <div className="absolute top-4 right-4"><FaWifi className="text-green-400" /></div>
 </div>

 {Array.from(remoteStreams.entries()).map(([socketId]) => {
 const participant = participants.find(p => p.socketId === socketId)
 return (
 <div key={socketId} className="relative bg-gray-900 rounded-lg overflow-hidden">
 <video
 ref={(el) => { if (el) remoteVideoRefs.current.set(socketId, el) }}
 autoPlay playsInline className="w-full h-full object-cover"
 />
 <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1 rounded-full">
 <span className="text-white text-sm font-medium flex items-center gap-2">
 {participant?.userType === 'patient' ? <FaUser /> : <FaUserMd />}
 {participant?.userName || 'Unknown'}
 </span>
 </div>
 <div className="absolute top-4 right-4"><FaWifi className="text-green-400" /></div>
 </div>
 )
 })}
 </div>
 )
}

interface DoctorInfo { id: string; name: string; type: 'doctor' }
interface ConsultationData { patientId: string; patientName: string; [k: string]: unknown }

export default function DoctorVideoCall() {
 const params = useParams()
 const router = useRouter()
 const roomId = params.roomId as string
 
 const { socket, connected } = useSocket()
 const [localStream, setLocalStream] = useState<MediaStream | null>(null)
 const [isVideoEnabled, setIsVideoEnabled] = useState(true)
 const [isAudioEnabled, setIsAudioEnabled] = useState(true)
 const [showChat, setShowChat] = useState(false)
 const [showNotes, setShowNotes] = useState(false)
 const [callDuration, setCallDuration] = useState(0)
 const [newMessage, setNewMessage] = useState('')
 const [isFullscreen, setIsFullscreen] = useState(false)
 const [isRecording, setIsRecording] = useState(false)
 const [consultationNotes, setConsultationNotes] = useState('')
 const [consultationData, setConsultationData] = useState<ConsultationData | null>(null)
 const [mediaError, setMediaError] = useState<string>('')

 const streamCleanupRef = useRef<() => void>(() => {})

 const { user: authUser, loading: userLoading } = useUser()
 const [doctorInfo, setDoctorInfo] = useState<DoctorInfo>({ id: '', name: '', type: 'doctor' })

 useEffect(() => {
 if (userLoading) return
 try {
 if (authUser) {
 if (authUser.userType === 'doctor' && authUser.id) {
 setDoctorInfo({ id: authUser.id, name: `${authUser.firstName ?? ''} ${authUser.lastName ?? ''}`.trim(), type: 'doctor' })
 } else {
 alert('Please login as a doctor to start consultations')
 router.push('/login')
 }
 } else {
 alert('Please login to start the consultation')
 router.push('/login')
 }
 const storedConsultation = localStorage.getItem(`consultation_${roomId}`)
 if (storedConsultation) setConsultationData(JSON.parse(storedConsultation) as ConsultationData)
 } catch {
 // Corrupted localStorage
 router.push('/login')
 }
 }, [roomId, router, authUser, userLoading])

 const {
 peers,
 remoteStreams,
 chatMessages,
 roomParticipants,
 isScreenSharing,
 sendChatMessage,
 toggleVideo,
 toggleAudio,
 startScreenShare,
 stopScreenShare
 } = useWebRTC({
 socket,
 roomId,
 userId: doctorInfo.id,
 userName: doctorInfo.name,
 userType: doctorInfo.type,
 localStream
 }) as unknown as UseWebRTCReturn

 const cleanupMediaStream = () => {
 if (localStream) {
 localStream.getTracks().forEach(track => { track.stop(); track.enabled = false })
 setLocalStream(null)
 }
 }
 streamCleanupRef.current = cleanupMediaStream

 useEffect(() => {
 if (!doctorInfo.id) return
 let mounted = true
 let currentStream: MediaStream | null = null

 const initMediaStream = async () => {
 try {
 const devices = await navigator.mediaDevices.enumerateDevices()
 const hasVideo = devices.some(d => d.kind === 'videoinput')
 const hasAudio = devices.some(d => d.kind === 'audioinput')
 if (!hasVideo) throw new Error('No camera found. Please connect a camera and refresh.')
 if (!hasAudio) throw new Error('No microphone found. Please connect a microphone and refresh.')

 if (localStream) localStream.getTracks().forEach(t => t.stop())
 await new Promise(r => setTimeout(r, 500))

 const stream = await navigator.mediaDevices.getUserMedia({
 video: { width: { ideal: 1280 }, height: { ideal: 720 } },
 audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
 })
 if (mounted) {
 currentStream = stream
 setLocalStream(stream)
 setMediaError('')
 } else {
 stream.getTracks().forEach(t => t.stop())
 }
 } catch (error) {
 let errorMessage = 'Media access error'
 if (typeof error === 'object' && error) {
 const err = error as { name?: string; message?: string }
 errorMessage =
 err.name === 'NotAllowedError' ? 'Camera and microphone access was denied. Please allow access and refresh.' :
 err.name === 'NotFoundError' ? 'Camera or microphone not found. Please check your devices and refresh.' :
 `Media access error: ${err.message ?? ''}`
 }
 setMediaError(errorMessage)
 alert(errorMessage)
 }
 }

 initMediaStream()
 return () => {
 mounted = false
 if (currentStream) currentStream.getTracks().forEach(track => { track.stop(); track.enabled = false })
 }
 }, [doctorInfo.id]) // keep warnings as requested

 useEffect(() => {
 const interval = setInterval(() => setCallDuration(prev => prev + 1), 1000)
 return () => clearInterval(interval)
 }, [])

 useEffect(() => {
 const handleBeforeUnload = () => { cleanupMediaStream() }
 window.addEventListener('beforeunload', handleBeforeUnload)
 return () => window.removeEventListener('beforeunload', handleBeforeUnload)
 }, [localStream]) // keep warning

 const formatDuration = (seconds: number) => {
 const h = Math.floor(seconds / 3600)
 const m = Math.floor((seconds % 3600) / 60)
 const s = seconds % 60
 return h > 0 ? `${h}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}` : `${m}:${s.toString().padStart(2,'0')}`
 }

 const handleToggleVideo = () => { const v = !isVideoEnabled; setIsVideoEnabled(v); toggleVideo(v) }
 const handleToggleAudio = () => { const v = !isAudioEnabled; setIsAudioEnabled(v); toggleAudio(v) }
 const handleScreenShare = async () => { isScreenSharing ? stopScreenShare() : await startScreenShare() }

 const handleSendMessage = (e: React.FormEvent) => {
 e.preventDefault()
 if (newMessage.trim()) { sendChatMessage(newMessage); setNewMessage('') }
 }

 const handleEndCall = () => {
 if (consultationNotes.trim()) {
 const notesData = {
 roomId,
 doctorId: doctorInfo.id,
 doctorName: doctorInfo.name,
 patientId: consultationData?.patientId,
 patientName: consultationData?.patientName,
 notes: consultationNotes,
 duration: callDuration,
 timestamp: new Date().toISOString()
 }
 try {
 const consultationHistory = JSON.parse(localStorage.getItem('consultationHistory') || '[]') as unknown[]
 consultationHistory.push(notesData)
 localStorage.setItem('consultationHistory', JSON.stringify(consultationHistory))
 } catch {
 // Corrupted localStorage — start fresh
 localStorage.setItem('consultationHistory', JSON.stringify([notesData]))
 }
 }

 cleanupMediaStream()
 peers.forEach((p) => { p.peer?.destroy?.() })
 if (socket) socket.emit('leave-room')
 setTimeout(() => { router.push('/doctor') }, 100)
 }

 const toggleFullscreen = () => {
 if (!document.fullscreenElement) { document.documentElement.requestFullscreen(); setIsFullscreen(true) }
 else { document.exitFullscreen(); setIsFullscreen(false) }
 }

 const handleCreatePrescription = () => {
 if (consultationNotes) localStorage.setItem(`consultation_notes_${roomId}`, consultationNotes)
 const patientId = consultationData?.patientId || roomParticipants[0]?.userId
 router.push(`/doctor/prescriptions/create/${patientId}?roomId=${roomId}`)
 }

 const handleSaveNotes = () => {
 const notesData = { roomId, doctorId: doctorInfo.id, doctorName: doctorInfo.name, notes: consultationNotes, timestamp: new Date().toISOString() }
 localStorage.setItem(`consultation_notes_${roomId}`, JSON.stringify(notesData))
 alert('Notes saved successfully!')
 }

 const retryMediaAccess = async () => {
 setMediaError('')
 cleanupMediaStream()
 await new Promise(r => setTimeout(r, 500))
 try {
 const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
 setLocalStream(stream)
 setMediaError('')
 } catch (error) {
 setMediaError(typeof error === 'object' && error && 'message' in error ? String((error as { message: unknown }).message) : 'An unknown error occurred')
 }
 }

 if (!connected || !doctorInfo.id) {
 return (
 <div className="min-h-screen bg-gray-900 flex items-center justify-center">
 <div className="text-center">
 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4" />
 <p className="text-white">Setting up consultation room...</p>
 <p className="text-gray-400 text-sm mt-2">Please ensure you&apos;re logged in as a doctor</p>
 </div>
 </div>
 )
 }

 if (mediaError) {
 return (
 <div className="min-h-screen bg-gray-900 flex items-center justify-center">
 <div className="text-center max-w-md">
 <div className="bg-red-500 text-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4"><FaVideoSlash className="text-2xl" /></div>
 <h2 className="text-white text-xl font-semibold mb-2">Media Access Error</h2>
 <p className="text-gray-400 mb-6">{mediaError}</p>
 <button onClick={retryMediaAccess} className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition flex items-center gap-2 mx-auto">
 <FaSync /> Retry Access
 </button>
 <button onClick={() => router.push('/doctor')} className="mt-4 text-gray-400 hover:text-white transition">Return to Dashboard</button>
 </div>
 </div>
 )
 }

 return (
 <div className="min-h-screen bg-gray-900 flex flex-col">
 {/* Header */}
 <div className="bg-gray-800 px-6 py-3 flex items-center justify-between">
 <div className="flex items-center space-x-4">
 <button onClick={() => router.push('/doctor')} className="text-gray-400 hover:text-white transition"><FaArrowLeft /></button>
 <FaUserMd className="text-blue-400 text-xl" />
 <div>
 <h1 className="text-white font-semibold">Video Consultation</h1>
 {consultationData && <p className="text-gray-400 text-sm">Patient: {consultationData.patientName}</p>}
 </div>
 </div>
 <div className="flex items-center space-x-6">
 <div className="flex items-center space-x-2"><FaClock className="text-gray-400" /><span className="text-white font-mono">{formatDuration(callDuration)}</span></div>
 <div className="flex items-center space-x-2"><FaUser className="text-gray-400" /><span className="text-white">{roomParticipants.length} participants</span></div>
 {isRecording && <div className="flex items-center space-x-2"><FaRecordVinyl className="text-red-500 animate-pulse" /><span className="text-red-500">Recording</span></div>}
 <button onClick={toggleFullscreen} className="text-gray-400 hover:text-white transition">{isFullscreen ? <FaCompress /> : <FaExpand />}</button>
 </div>
 </div>

 {/* Main */}
 <div className="flex-1 flex">
 <div className="flex-1 relative">
 <VideoGrid
 localStream={localStream}
 remoteStreams={remoteStreams}
 participants={roomParticipants}
 localUserName={doctorInfo.name}
 localUserType={doctorInfo.type}
 />
 </div>

 <div className="flex">
 {showChat && (
 <div className="w-80 bg-gray-800 flex flex-col">
 <div className="p-4 border-b border-gray-700"><h3 className="text-white font-semibold">Chat</h3></div>
 <div className="flex-1 overflow-y-auto p-4 space-y-3">
 {chatMessages.map((msg) => (
 <div key={msg.id} className={`flex ${msg.socketId === socket?.id ? 'justify-end' : 'justify-start'}`}>
 <div className={`max-w-xs px-4 py-2 rounded-lg ${msg.socketId === socket?.id ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'}`}>
 <p className="text-xs opacity-75 mb-1">{msg.userName}</p>
 <p className="text-sm">{msg.message}</p>
 <p className="text-xs opacity-50 mt-1">{new Date(msg.timestamp).toLocaleTimeString()}</p>
 </div>
 </div>
 ))}
 </div>
 <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-700">
 <div className="flex space-x-2">
 <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="Type a message..." className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
 <button type="submit" aria-label="Send message" className="bg-blue-600 text-white p-2 rounded-lg hover:bg-blue-700 transition"><FaPaperPlane /></button>
 </div>
 </form>
 </div>
 )}

 {showNotes && (
 <div className="w-80 bg-gray-800 flex flex-col">
 <div className="p-4 border-b border-gray-700"><h3 className="text-white font-semibold flex items-center gap-2"><FaNotesMedical /> Consultation Notes</h3></div>
 <div className="flex-1 p-4">
 <textarea value={consultationNotes} onChange={(e) => setConsultationNotes(e.target.value)} placeholder="Enter consultation notes, observations, diagnosis..." className="w-full h-full bg-gray-700 text-white p-3 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500" />
 </div>
 <div className="p-4 border-t border-gray-700 space-y-2">
 <button onClick={handleCreatePrescription} className="w-full bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition flex items-center justify-center gap-2"><FaPrescriptionBottleAlt /> Create Prescription</button>
 <button onClick={handleSaveNotes} className="w-full bg-gray-700 text-white py-2 rounded-lg hover:bg-gray-600 transition flex items-center justify-center gap-2"><FaFileDownload /> Save Notes</button>
 </div>
 </div>
 )}
 </div>
 </div>

 {/* Controls */}
 <div className="bg-gray-800 px-6 py-4">
 <div className="flex items-center justify-center space-x-4">
 <button onClick={handleToggleAudio} className={`p-4 rounded-full transition ${isAudioEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`}>{isAudioEnabled ? <FaMicrophone className="text-white text-xl" /> : <FaMicrophoneSlash className="text-white text-xl" />}</button>
 <button onClick={handleToggleVideo} className={`p-4 rounded-full transition ${isVideoEnabled ? 'bg-gray-700 hover:bg-gray-600' : 'bg-red-600 hover:bg-red-700'}`}>{isVideoEnabled ? <FaVideo className="text-white text-xl" /> : <FaVideoSlash className="text-white text-xl" />}</button>
 <button onClick={handleScreenShare} aria-label="Share screen" className={`p-4 rounded-full transition ${isScreenSharing ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'}`}><FaDesktop className="text-white text-xl" /></button>
 <button onClick={() => setShowChat(!showChat)} className={`p-4 rounded-full transition ${showChat ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-700 hover:bg-gray-600'}`}><FaComments className="text-white text-xl" /></button>
 <button onClick={() => setShowNotes(!showNotes)} className={`p-4 rounded-full transition ${showNotes ? 'bg-purple-600 hover:bg-purple-700' : 'bg-gray-700 hover:bg-gray-600'}`}><FaNotesMedical className="text-white text-xl" /></button>
 <button onClick={() => setIsRecording(!isRecording)} className={`p-4 rounded-full transition ${isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-gray-700 hover:bg-gray-600'}`}><FaRecordVinyl className="text-white text-xl" /></button>
 <button onClick={handleEndCall} className="p-4 rounded-full bg-red-600 hover:bg-red-700 transition ml-8">
 <FaPhone className="text-white text-xl" style={{ transform: 'rotate(135deg)' }} />
 </button>
 </div>
 </div>
 </div>
 )
}
