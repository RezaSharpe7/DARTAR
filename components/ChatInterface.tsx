import React, { useState, useRef, useEffect } from 'react';
import { Send, Camera, Mic, Image as ImageIcon, Loader2, StopCircle, Trash2, FileText, FileSpreadsheet } from 'lucide-react';
import { Message } from '../types';
import { sendMessageToGemini, AttachmentData } from '../services/geminiService';

const ChatInterface: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'model',
      text: 'Hello! I am DARTA. Send me your sales, receipt photos, voice notes, or upload documents (PDF, CSV).',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Attachments
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<{ name: string; content: string; type: string; url?: string } | null>(null);
  
  // Audio state
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Audio Recording Handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(audioBlob);
        setAudioBlob(audioBlob);
        setAudioUrl(url);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      
      // Clear other inputs
      setSelectedImage(null);
      setSelectedDoc(null);
      setInputText('');
    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Could not access microphone. Please allow permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const clearAudio = () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setIsRecording(false);
  };

  const clearImage = () => {
    setSelectedImage(null);
    if (imageInputRef.current) imageInputRef.current.value = '';
  };

  const clearDoc = () => {
    setSelectedDoc(null);
    if (docInputRef.current) docInputRef.current.value = '';
  };

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };
  
  const blobToText = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsText(blob);
    });
  };

  const handleSend = async () => {
    if ((!inputText.trim() && !selectedImage && !audioBlob && !selectedDoc) || isLoading) return;

    let attachmentData: AttachmentData | undefined;
    let attachmentForDisplay: { type: 'image' | 'audio' | 'document', url: string, name?: string }[] | undefined;

    // Prepare attachment
    if (selectedImage) {
      attachmentData = { type: 'image', content: selectedImage, mimeType: 'image/jpeg' };
      attachmentForDisplay = [{ type: 'image', url: selectedImage }];
    } else if (audioBlob && audioBlob.size > 0) {
      try {
        const base64Audio = await blobToBase64(audioBlob);
        const mimeType = audioBlob.type || 'audio/webm';
        attachmentData = { type: 'audio', content: base64Audio, mimeType };
        attachmentForDisplay = [{ type: 'audio', url: audioUrl! }];
      } catch (e) {
        console.error("Failed to process audio blob", e);
        return;
      }
    } else if (selectedDoc) {
      // Document
      attachmentData = { 
        type: 'document', 
        content: selectedDoc.content, 
        mimeType: selectedDoc.type,
        name: selectedDoc.name 
      };
      attachmentForDisplay = [{ 
        type: 'document', 
        url: selectedDoc.url || '', 
        name: selectedDoc.name 
      }];
    }

    // Default text if sending media/doc without text
    let textToSend = inputText.trim();
    if (!textToSend) {
      if (attachmentData?.type === 'audio') {
        textToSend = "Please transcribe this audio and confirm the details.";
      } else if (attachmentData?.type === 'image') {
        textToSend = "Please analyze this image for business data (receipt, stock, or sale) and extract the details.";
      } else if (attachmentData?.type === 'document') {
        textToSend = `Please analyze this document (${attachmentData.name}) and extract insights about sales, expenses, or stock.`;
      }
    }

    if (!textToSend && !attachmentData) return;

    const userMsgId = Date.now().toString();
    const newUserMessage: Message = {
      id: userMsgId,
      role: 'user',
      text: inputText,
      timestamp: new Date(),
      attachments: attachmentForDisplay,
    };

    setMessages((prev) => [...prev, newUserMessage]);
    
    // Clear all inputs
    setInputText('');
    clearImage();
    clearAudio();
    clearDoc();
    setIsLoading(true);

    try {
      // Call service
      const responseData = await sendMessageToGemini(textToSend, attachmentData);
      
      const botMsgId = (Date.now() + 1).toString();
      const newBotMessage: Message = {
        id: botMsgId,
        role: 'model',
        text: responseData.text,
        timestamp: new Date(),
        attachments: responseData.images 
          ? responseData.images.map(url => ({ type: 'image', url })) 
          : undefined
      };
      
      setMessages((prev) => [...prev, newBotMessage]);
    } catch (error) {
      console.error("Failed to send message", error);
      setMessages((prev) => [...prev, {
        id: Date.now().toString(),
        role: 'model',
        text: "Sorry, I had trouble sending that message.",
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        // Clear conflicting inputs
        clearAudio(); 
        clearDoc();
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDocSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const isPdf = file.type === 'application/pdf';
      const isText = file.type === 'text/plain' || file.type === 'text/csv' || file.name.endsWith('.csv') || file.name.endsWith('.txt');
      
      if (!isPdf && !isText) {
        alert("Please upload a PDF, CSV, or Text file.");
        return;
      }
      
      // Clear conflicting inputs
      clearAudio();
      clearImage();

      try {
        let content = '';
        if (isPdf) {
          content = await blobToBase64(file);
        } else {
          content = await blobToText(file);
        }
        
        setSelectedDoc({
          name: file.name,
          type: file.type || (isPdf ? 'application/pdf' : 'text/plain'),
          content: content,
          url: URL.createObjectURL(file)
        });
      } catch(err) {
        console.error("Error reading file", err);
      }
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] bg-[#E5DDD5]">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-lg p-3 shadow-sm relative ${
                msg.role === 'user'
                  ? 'bg-[#dcf8c6] rounded-tr-none'
                  : 'bg-white rounded-tl-none'
              }`}
            >
              {msg.attachments && msg.attachments.map((att, idx) => (
                <div key={idx} className="mb-2">
                  {att.type === 'image' && (
                    <img src={att.url} alt="Attachment" className="rounded-md max-h-64 w-full object-cover" />
                  )}
                  {att.type === 'audio' && (
                    <audio controls src={att.url} className="w-full mt-1" />
                  )}
                  {att.type === 'document' && (
                    <div className="flex items-center space-x-2 bg-gray-100 p-2 rounded border border-gray-200">
                      <FileText size={24} className="text-red-500" />
                      <div className="flex-1 overflow-hidden">
                        <p className="text-xs font-bold truncate text-gray-700">{att.name || "Document"}</p>
                        <p className="text-[10px] text-gray-500 uppercase">File</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {msg.text && <p className="text-gray-800 text-sm whitespace-pre-wrap leading-relaxed">{msg.text}</p>}
              <div className="flex justify-end mt-1">
                <span className="text-[10px] text-gray-500">{formatTime(msg.timestamp)}</span>
              </div>
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
             <div className="bg-white rounded-lg p-3 rounded-tl-none shadow-sm flex items-center space-x-2">
               <Loader2 className="animate-spin text-green-600" size={16} />
               <span className="text-sm text-gray-500">DARTA is typing...</span>
             </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="bg-[#f0f2f5] p-2 flex items-end space-x-2 sticky bottom-0 border-t border-gray-200">
        
        {/* Attachment Previews */}
        {selectedImage && (
          <div className="absolute bottom-16 left-4 bg-white p-2 rounded-lg shadow-lg border border-gray-200">
             <div className="relative">
                <img src={selectedImage} alt="Preview" className="h-20 w-20 object-cover rounded" />
                <button onClick={clearImage} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">&times;</button>
             </div>
          </div>
        )}

        {audioUrl && (
          <div className="absolute bottom-16 left-4 bg-white p-2 rounded-lg shadow-lg border border-gray-200 flex items-center space-x-2 min-w-[200px]">
             <audio controls src={audioUrl} className="h-8 w-40" />
             <button onClick={clearAudio} className="p-1 bg-red-100 text-red-600 rounded-full hover:bg-red-200"><Trash2 size={16} /></button>
          </div>
        )}

        {selectedDoc && (
          <div className="absolute bottom-16 left-4 bg-white p-2 rounded-lg shadow-lg border border-gray-200 flex items-center space-x-2">
             <div className="bg-red-50 p-2 rounded border border-red-100 flex items-center space-x-2">
               <FileText className="text-red-500" size={24} />
               <div>
                 <p className="text-xs font-bold text-gray-800 max-w-[120px] truncate">{selectedDoc.name}</p>
                 <p className="text-[10px] text-gray-500">Ready to upload</p>
               </div>
             </div>
             <button onClick={clearDoc} className="p-1 bg-gray-100 text-gray-600 rounded-full hover:bg-gray-200"><Trash2 size={16} /></button>
          </div>
        )}

        {/* Action Buttons */}
        <button 
          onClick={() => imageInputRef.current?.click()}
          className={`p-3 rounded-full transition-colors ${isRecording ? 'opacity-30 pointer-events-none' : 'text-gray-500 hover:bg-gray-200'}`}
        >
          <Camera size={24} />
        </button>
        <input 
          type="file" 
          ref={imageInputRef} 
          accept="image/*" 
          className="hidden" 
          onChange={handleImageSelect}
        />

        <button 
          onClick={() => docInputRef.current?.click()}
          className={`p-3 rounded-full transition-colors ${isRecording ? 'opacity-30 pointer-events-none' : 'text-gray-500 hover:bg-gray-200'}`}
        >
          <FileText size={24} />
        </button>
        <input 
          type="file" 
          ref={docInputRef} 
          accept=".pdf,.csv,.txt" 
          className="hidden" 
          onChange={handleDocSelect}
        />

        {/* Text Input */}
        <div className="flex-1 bg-white rounded-2xl flex items-center px-4 py-2 shadow-sm border border-gray-100">
          {isRecording ? (
             <div className="flex items-center space-x-2 w-full">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                <span className="text-gray-500 text-sm flex-1">Recording...</span>
             </div>
          ) : (
            <input
              type="text"
              placeholder="Message..."
              className="flex-1 bg-transparent border-none focus:ring-0 outline-none text-gray-800 placeholder-gray-400 py-1"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={!!audioUrl || !!selectedDoc || !!selectedImage} // Optional: allow text with attachments, but keeping simple for now
            />
          )}
        </div>

        {/* Mic / Send Button */}
        {inputText || selectedImage || audioUrl || selectedDoc ? (
           <button 
             onClick={handleSend}
             className="p-3 bg-green-600 text-white rounded-full shadow-md hover:bg-green-700 transition-colors"
           >
             <Send size={20} />
           </button>
        ) : (
          <button 
            onClick={isRecording ? stopRecording : startRecording}
            className={`p-3 rounded-full transition-colors shadow-sm ${
              isRecording 
                ? 'bg-red-50 text-red-500 border border-red-200 hover:bg-red-100' 
                : 'text-gray-500 hover:bg-gray-200'
            }`}
          >
            {isRecording ? <StopCircle size={24} className="animate-pulse" /> : <Mic size={24} />}
          </button>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;