
  // Check if it's the first visit
  if (!localStorage.getItem('linguaBridgeVisited')) {
    document.getElementById('welcomeModal').style.display = 'flex';
    localStorage.setItem('linguaBridgeVisited', 'true');
  }

  // Close welcome modal
  document.getElementById('closeWelcome').addEventListener('click', () => {
    document.getElementById('welcomeModal').style.display = 'none';
  });

  document.getElementById('gotItBtn').addEventListener('click', () => {
    document.getElementById('welcomeModal').style.display = 'none';
  });

  const startBtn = document.getElementById('startBtn');
  const btnText = document.getElementById('btnText');
  const micIcon = document.getElementById('micIcon');
  const statusIndicator = document.getElementById('statusIndicator');
  const originalTextDiv = document.getElementById('originalText');
  const translatedTextDiv = document.getElementById('translatedText');
  const searchResultsDiv = document.getElementById('searchResults');
  const sourceLangSelect = document.getElementById('sourceLang');
  const targetLangSelect = document.getElementById('targetLang');
  const clearBtn = document.getElementById('clearBtn');
  const talkbackToggle = document.getElementById('talkbackToggle');

  let recognition;
  let isRecognizing = false;
  let talkbackEnabled = false;
  let speechSynthesis = window.speechSynthesis;

  // Initialize speech synthesis voices
  let voices = [];
  speechSynthesis.onvoiceschanged = () => {
    voices = speechSynthesis.getVoices();
  };

  // Clear all content
  clearBtn.addEventListener('click', () => {
    originalTextDiv.innerHTML = '<span class="text-blue-200 italic">Start speaking to see your words appear here...</span>';
    translatedTextDiv.innerHTML = '<span class="text-yellow-200 italic">Translation will appear here...</span>';
    searchResultsDiv.innerHTML = '<div class="text-green-200 italic text-center py-8">Speak to discover related Wikipedia articles...</div>';
  });

  // Toggle talkback feature
  talkbackToggle.addEventListener('change', (e) => {
    talkbackEnabled = e.target.checked;
  });

  // Enhanced Google Translate API function with error handling
  async function translateText(text, targetLang) {
    if (!text || text.trim().length === 0) return '';
    
    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(text)}`;
    
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      
      const data = await res.json();
      if (!data || !data[0]) return text; // Return original if translation fails
      
      return data[0].map(item => item[0]).join('');
    } catch (error) {
      console.error('Translation error:', error);
      return text; // Return original text if translation fails
    }
  }

  // Speak text using Web Speech API
  function speakText(text, lang) {
    if (!talkbackEnabled || !text) return;
    
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Find a voice that matches the target language
    const targetVoice = voices.find(voice => 
      voice.lang.startsWith(lang) || 
      voice.lang.startsWith(lang.split('-')[0])
    );
    
    if (targetVoice) {
      utterance.voice = targetVoice;
      utterance.lang = targetVoice.lang;
    } else {
      utterance.lang = lang;
    }
    
    speechSynthesis.speak(utterance);
  }

  // Enhanced Wikipedia search with better error handling and formatting
  async function fetchWikiResults(query) {
    if (!query || query.trim().length < 2) {
      searchResultsDiv.innerHTML = `
        <div class="text-center py-8">
          <div class="text-green-200 italic">Continue speaking to discover related articles...</div>
        </div>
      `;
      return;
    }

    // Show loading state
    searchResultsDiv.innerHTML = `
      <div class="text-center py-8">
        <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        <div class="text-white mt-2">Searching knowledge base...</div>
      </div>
    `;

    const apiUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&format=json&origin=*&search=${encodeURIComponent(query)}&limit=5`;
    
    try {
      const res = await fetch(apiUrl);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      
      const data = await res.json();
      
      if (!data[1] || data[1].length === 0) {
        searchResultsDiv.innerHTML = `
          <div class="text-center py-8">
            <div class="text-yellow-200">No articles found for "<span class="font-semibold">${query}</span>"</div>
            <div class="text-blue-200 text-sm mt-2">Try speaking about different topics</div>
          </div>
        `;
        return;
      }

      searchResultsDiv.innerHTML = '';
      
      data[1].forEach((title, i) => {
        const description = data[2][i] || 'No description available.';
        const link = data[3][i];
        
        const card = document.createElement('a');
        card.href = link;
        card.target = "_blank";
        card.rel = "noopener noreferrer";
        card.className = "block p-4 rounded-xl bg-white/10 hover:bg-white/20 transition-all duration-300 transform hover:scale-[1.02] border border-white/20 fade-in";
        card.innerHTML = `
          <h4 class="text-white font-semibold text-base mb-2 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 mr-2 text-green-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            ${title}
          </h4>
          <p class="text-blue-100 text-sm leading-relaxed">${description}</p>
        `;
        searchResultsDiv.appendChild(card);
      });
      
    } catch (error) {
      console.error('Wikipedia API error:', error);
      searchResultsDiv.innerHTML = `
        <div class="text-center py-8">
          <div class="text-red-300">Unable to fetch search results</div>
          <div class="text-blue-200 text-sm mt-2">Please check your internet connection</div>
        </div>
      `;
    }
  }

  // Initialize enhanced speech recognition
  function initRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Sorry, your browser does not support Speech Recognition. Please use Chrome, Edge, or Safari.');
      return null;
    }
    
    const recog = new SpeechRecognition();
    recog.lang = sourceLangSelect.value;
    recog.interimResults = true;
    recog.continuous = true;
    recog.maxAlternatives = 1;
    
    return recog;
  }

  // Enhanced button click handler
  startBtn.addEventListener('click', () => {
    if (isRecognizing) {
      stopRecognition();
      return;
    }

    startRecognition();
  });

  function startRecognition() {
    recognition = initRecognition();
    if (!recognition) return;

    // Reset displays
    originalTextDiv.innerHTML = '<span class="text-blue-200 italic">Listening...</span>';
    translatedTextDiv.innerHTML = '<span class="text-yellow-200 italic">Translation will appear here...</span>';
    searchResultsDiv.innerHTML = `
      <div class="text-center py-8">
        <div class="text-green-200 italic">Speak to discover related articles...</div>
      </div>
    `;

    recognition.lang = sourceLangSelect.value;

    try {
      recognition.start();
      updateUIForRecording(true);
    } catch (error) {
      console.error('Recognition start error:', error);
    }

    let finalTranscript = '';
    let debounceTimer = null;

    recognition.onresult = async (event) => {
      let interimTranscript = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      
      const combinedTranscript = (finalTranscript + interimTranscript).trim();
      
      if (combinedTranscript) {
        originalTextDiv.textContent = combinedTranscript;

        // Translate text with debouncing
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(async () => {
          const translated = await translateText(combinedTranscript, targetLangSelect.value);
          if (translated) {
            translatedTextDiv.textContent = translated;
            // Speak the translated text if talkback is enabled
            speakText(translated, targetLangSelect.value);
          }
        }, 500);

        // Fetch Wikipedia results only for final transcript
        if (finalTranscript.trim().length > 2) {
          fetchWikiResults(finalTranscript.trim());
        }
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      
      const errorMessages = {
        'not-allowed': 'Microphone access denied. Please allow microphone access and try again.',
        'service-not-allowed': 'Speech recognition service is not allowed. Please check your browser settings.',
        'network': 'Network error occurred. Please check your internet connection.',
        'no-speech': 'No speech detected. Please try speaking closer to your microphone.',
        'aborted': 'Speech recognition was aborted.',
        'audio-capture': 'No microphone found. Please ensure your microphone is connected.',
        'language-not-supported': 'Selected language is not supported for speech recognition.'
      };
      
      const message = errorMessages[event.error] || `Speech recognition error: ${event.error}`;
      
      if (['not-allowed', 'service-not-allowed', 'audio-capture'].includes(event.error)) {
        alert(message);
      }
      
      stopRecognition();
    };

    recognition.onend = () => {
      updateUIForRecording(false);
    };
  }

  function stopRecognition() {
    if (recognition) {
      recognition.stop();
    }
    updateUIForRecording(false);
  }

  function updateUIForRecording(recording) {
    isRecognizing = recording;
    
    if (recording) {
      btnText.textContent = 'Stop Speaking';
      startBtn.className = 'w-full bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white font-semibold py-4 px-6 rounded-xl transition duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center space-x-2 pulse-animation';
      micIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />`;
      statusIndicator.classList.remove('opacity-0');
      statusIndicator.classList.add('opacity-100');
    } else {
      btnText.textContent = 'Start Speaking';
      startBtn.className = 'w-full bg-gradient-to-r from-green-500 to-blue-600 hover:from-green-600 hover:to-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center space-x-2';
      micIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />`;
      statusIndicator.classList.remove('opacity-100');
      statusIndicator.classList.add('opacity-0');
    }
  }

  // Update recognition language when source language changes
  sourceLangSelect.addEventListener('change', () => {
    if (recognition && isRecognizing) {
      recognition.lang = sourceLangSelect.value;
    }
  });

  // Add keyboard shortcuts
  document.addEventListener('keydown', (event) => {
    if (event.code === 'Space' && event.ctrlKey) {
      event.preventDefault();
      startBtn.click();
    }
  });

  // Add responsive behavior for mobile
  if (window.innerWidth < 768) {
    document.body.addEventListener('touchstart', () => {}, { passive: true });
  }

