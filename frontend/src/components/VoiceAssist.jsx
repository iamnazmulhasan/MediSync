// src/components/VoiceAssist.jsx
import React, { useState, useEffect, useRef } from 'react';
import { FaMicrophone, FaStop, FaSearch } from 'react-icons/fa';

const VoiceAssist = ({ text, onTextChange, onProcessClick }) => {
    const [isListening, setIsListening] = useState(false);
    const recognitionRef = useRef(null);
    const textareaRef = useRef(null);

    useEffect(() => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'bn-BD'; // Bengali Language

            recognitionRef.current.onresult = (event) => {
                let currentTranscript = '';
                for (let i = 0; i < event.results.length; i++) {
                    currentTranscript += event.results[i][0].transcript;
                }
                onTextChange(currentTranscript);
                adjustHeight();
            };

            recognitionRef.current.onerror = (event) => {
                console.error("Speech recognition error", event.error);
                setIsListening(false);
            };

            // Safety catch for when recognition ends naturally
            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
        }
    }, [onTextChange]);

    const handleProcessAndSearch = () => {
        // Clean the text before passing it to the mapping engine
        const cleanText = text ? text.trim() : '';
        onProcessClick(cleanText);
    };

    const toggleListening = () => {
        if (isListening) {
            // Stopping manually
            recognitionRef.current?.stop();
            setIsListening(false);
            // Auto process text to map department once recording is stopped
            handleProcessAndSearch();
        } else {
            // Starting fresh
            onTextChange(''); 
            recognitionRef.current?.start();
            setIsListening(true);
        }
    };

    const handleFocus = () => {
        // If user touches the input manually to type, stop listening
        if (isListening) {
            recognitionRef.current?.stop();
            setIsListening(false);
            handleProcessAndSearch();
        }
    };

    const adjustHeight = () => {
        const el = textareaRef.current;
        if (el) {
            el.style.height = 'auto';
            el.style.height = Math.min(el.scrollHeight, 150) + 'px'; // Max height 150px
        }
    };

    const handleChange = (e) => {
        onTextChange(e.target.value);
        adjustHeight();
    };

    // Ensure initial height adjustment
    useEffect(() => {
        adjustHeight();
    }, [text]);

    return (
        <div className="voice-assist-container">
            <button 
                className={`voice-mic-btn ${isListening ? 'listening' : ''}`}
                onClick={toggleListening}
                title={isListening ? "Stop Listening" : "Start Voice Input"}
            >
                {isListening ? <FaStop size={14} /> : <FaMicrophone size={16} />}
            </button>
            
            <textarea
                ref={textareaRef}
                className="voice-textarea noto-serif-bengali"
                placeholder="আপনার সমস্যার কথা বলুন... (যেমন: আমার খুব জ্বর এবং মাথাব্যথা)"
                value={text}
                onChange={handleChange}
                onFocus={handleFocus}
                rows={1}
            />

            {/* The Search button processes the edited/typed text to select the department */}
            {!isListening && (
                <button 
                    className="voice-search-action-btn fade-in" 
                    onClick={handleProcessAndSearch}
                    title="Process Text & Select Department"
                >
                    <FaSearch size={14} />
                </button>
            )}
        </div>
    );
};

export default VoiceAssist;