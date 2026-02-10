'use client';
import { useEffect, useState, useRef } from 'react';
import { ReactReader } from 'react-reader';
import { getBookFile } from '@/lib/book-storage';
import { getBook, updateBookProgress } from '@/lib/storage';
import { useParams, useRouter } from 'next/navigation';
import { DictionaryModal } from '@/components/DictionaryModal';
import { AnalysisModal } from '@/components/AnalysisModal';
import { WordCardModal } from '@/components/WordCardModal';
import { lookupWord } from '@/lib/dictionary';
import { lookupLocal } from '@/lib/local-dictionary';
import { useAppStore } from '@/lib/store';
import { DictionaryResult } from '@/types';
import { Sparkles, BookOpen, X } from 'lucide-react';

export default function BookReaderPage() {
  const params = useParams();
  const router = useRouter();
  // Change state to hold ArrayBuffer directly to bypass Blob URL issues
  const [bookData, setBookData] = useState<ArrayBuffer | null>(null);
  const [location, setLocation] = useState<string | number>(0);
  const [error, setError] = useState<string | null>(null);

  // --- New State for AI Features ---
  const [selection, setSelection] = useState<string | null>(null);
  const [rendition, setRendition] = useState<any | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [currentProgress, setCurrentProgress] = useState(0);
  const [totalLocations, setTotalLocations] = useState(0);
  
  // Modal States
  const [showDictionary, setShowDictionary] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showWordCard, setShowWordCard] = useState(false);
  const [wordCardData, setWordCardData] = useState<DictionaryResult | null>(null);
  
  // Data States
  const [dictionaryResult, setDictionaryResult] = useState<DictionaryResult | null>(null);
  const [isDictionaryLoading, setIsDictionaryLoading] = useState(false);
  
  const addVocabulary = useAppStore((state) => state.addVocabulary);
  const selectedWordRef = useRef<string | null>(null);

  useEffect(() => {
    const loadBook = async () => {
      try {
        const id = params.id as string;
        if (!id) return;

        console.log(`📖 Attempting to load book: ${id}`);
        
        // 1. Retrieve Blob from IndexedDB
        const retrievedBlob = await getBookFile(id);

        // 2. Critical Check: Does file exist?
        if (!retrievedBlob) {
          throw new Error("Local file not found. Please re-import the book.");
        }

        // 3. Critical Check: Is file empty?
        console.log(`📦 File size: ${retrievedBlob.size} bytes`);
        if (retrievedBlob.size === 0) {
          throw new Error("File is empty (0 bytes). Import failed.");
        }

        // Load Metadata for progress
        const bookMeta = await getBook(id);
        if (bookMeta?.position) {
            setLocation(bookMeta.position);
        }

        // 4. Convert to ArrayBuffer (The Ultimate Fix)
        // Instead of Blob URL (which can fail due to worker/network issues),
        // we pass the raw ArrayBuffer directly to epub.js.
        const buffer = await retrievedBlob.arrayBuffer();
        setBookData(buffer);

      } catch (err: any) {
        console.error("❌ Reader Error:", err);
        setError(err.message || "Failed to load book");
      }
    };

    loadBook();
  }, [params.id]);

  // --- Handlers ---

  const onLocationChanged = (epubcifi: string) => {
    setLocation(epubcifi);
    if (rendition && params.id) {
        // Calculate progress percentage
        // @ts-ignore
        const currentLocation = rendition.currentLocation();
        if (currentLocation && currentLocation.start) {
            const percentage = currentLocation.start.percentage;
            const newProgress = Math.round(percentage * 100);
            setCurrentProgress(newProgress);
            updateBookProgress(params.id as string, epubcifi, newProgress);
        }
    }
  };

  const handlePageJump = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setCurrentProgress(value);
    
    if (rendition) {
      // If locations are generated, we can jump by percentage
      // If not, we try our best or wait (but we trigger generation on load)
      const cfi = rendition.book.locations.cfiFromPercentage(value / 100);
      if (cfi) {
        setLocation(cfi);
      }
    }
  };

  // Keyboard Navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (!rendition) return;
      if (e.key === 'ArrowLeft') {
        rendition.prev();
      } else if (e.key === 'ArrowRight') {
        rendition.next();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [rendition]);

  const handleLookup = async () => {
    if (!selection) return;
    
    setShowDictionary(true);
    setShowActionSheet(false); // Close sheet
    setIsDictionaryLoading(true);
    setDictionaryResult(null);
    
    const cleanWord = selection.toLowerCase().trim().replace(/[^\w\s-]/g, "");
    selectedWordRef.current = cleanWord;

    try {
      // 1. Check Local Dictionary (Instant)
      const localResult = lookupLocal(cleanWord);
      if (localResult) {
        setDictionaryResult({
          word: localResult.text,
          definition: localResult.definition,
          phonetic: localResult.phonetic,
          tags: localResult.tags,
          example: localResult.example,
          exampleTranslation: localResult.translation,
          isAiGenerated: false
        });
        setIsDictionaryLoading(false);
        return;
      }

      // 2. AI / API Lookup
      const result = await lookupWord(cleanWord);
      if (result && selectedWordRef.current === cleanWord) {
        setDictionaryResult(result);
      }
    } catch (error) {
      console.error("Lookup failed:", error);
    } finally {
      setIsDictionaryLoading(false);
    }
  };

  const handleAddToNotebook = (word: DictionaryResult) => {
    addVocabulary({
      id: Date.now().toString(),
      word: word.word,
      phonetic: word.phonetic,
      definition: word.definition,
      example: word.example,
      exampleTranslation: word.exampleTranslation,
      createdAt: new Date().toISOString(),
      reviewCount: 0,
      correctCount: 0,
    });
    
    // Trigger Word Card
    setWordCardData(word);
    setShowDictionary(false);
    setDictionaryResult(null); // Critical: Clear result to ensure modal closes
    setShowWordCard(true);
  };

  // --- Render States ---

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-slate-500">
        <p className="text-xl mb-4">⚠️ {error}</p>
        <button 
          onClick={() => router.push('/bookshelf')} 
          className="px-4 py-2 bg-slate-200 rounded hover:bg-slate-300 transition" 
        >
          返回书架 (Return to Shelf)
        </button>
      </div>
    );
  }

  if (!bookData) {
    return (
      <div className="flex items-center justify-center h-screen text-slate-400">
        <span className="animate-pulse">📖 Loading Book...</span>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen relative bg-white dark:bg-slate-900">
      <ReactReader 
        // @ts-ignore - ReactReader types expect string, but epub.js supports ArrayBuffer
        url={bookData} 
        title="My Book" 
        location={location} 
        locationChanged={onLocationChanged} 
        // Ensure styles are full screen 
        epubOptions={{ 
          // flow: 'scrolled', // Removed to enable pagination (Flip mode)
          manager: 'default',
          // CRITICAL: Disable worker to prevent 404/CORS issues with workers
          worker: false 
        }}
        getRendition={(r) => {
          setRendition(r);
          
          // A. Apply Font Style (Georgia) inside the iframe
          r.themes.register('custom', { 
            'p': { 
              'font-family': 'Georgia, Cambria, "Times New Roman", Times, serif !important', 
              'line-height': '1.8 !important',
              'font-size': '1.125rem !important',
              'color': '#1e293b !important' // slate-800
            } 
          }); 
          r.themes.select('custom');

          // Ensure locations are generated for progress bar
          // This might take a moment for large books
          r.book.ready.then(() => {
            r.book.locations.generate(1000).then(() => {
              console.log("Locations generated");
              setTotalLocations(r.book.locations.total);
            });
          });

          // B. Listen for Text Selection
          r.on('selected', (cfiRange: string, contents: any) => {
            // Extract the actual text string from the range
            // Note: r.getRange(cfiRange) returns a Range object
            const range = r.getRange(cfiRange);
            const text = range.toString().trim();
            
            if (text.length > 0) {
              setSelection(text);
              setShowActionSheet(true);
              // Important: Don't auto-clear selection so user can see what they highlighted
            }
          });

          // C. Listen for Click (to dismiss selection/sheet)
          r.on('click', () => {
            setShowActionSheet(false);
            setSelection(null);
            // Optional: clear highlights if any
            // rendition?.annotations.remove(selection);
          });
        }}
      /> 
      
      {/* Back Button Overlay */} 
      <button 
        onClick={() => router.back()} 
        className="absolute top-4 left-4 z-50 bg-white/80 dark:bg-slate-800/80 p-2 rounded-full shadow hover:bg-white dark:hover:bg-slate-800 transition-colors"
      > 
        <span className="text-xl">⬅️</span>
      </button>

      {/* Page Turn Buttons (Overlay) */}
      <button 
        className="absolute top-1/2 left-4 z-40 transform -translate-y-1/2 bg-white/50 dark:bg-black/30 hover:bg-white/80 dark:hover:bg-black/50 p-3 rounded-full transition-colors hidden md:block"
        onClick={() => rendition?.prev()}
      >
        <span className="text-2xl">‹</span>
      </button>
      <button 
        className="absolute top-1/2 right-4 z-40 transform -translate-y-1/2 bg-white/50 dark:bg-black/30 hover:bg-white/80 dark:hover:bg-black/50 p-3 rounded-full transition-colors hidden md:block"
        onClick={() => rendition?.next()}
      >
        <span className="text-2xl">›</span>
      </button>

      {/* Progress Control Bar (Bottom) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-slate-900/90 backdrop-blur-sm border-t border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center gap-4 transition-transform duration-300 transform translate-y-0">
         <span className="text-xs text-slate-500 font-mono w-12 text-right">{currentProgress}%</span>
         <input 
           type="range" 
           min="0" 
           max="100" 
           step="1"
           value={currentProgress}
           onChange={handlePageJump}
           className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700 accent-emerald-600"
         />
         <span className="text-xs text-slate-500 font-mono w-12 text-left">100%</span>
      </div>

      {/* --- Bottom Action Sheet --- */}
      <div 
        className={`fixed bottom-0 left-0 right-0 bg-white dark:bg-slate-900 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] transition-transform duration-300 z-50 rounded-t-2xl p-4 md:p-6 flex gap-4 items-center justify-center border-t border-slate-100 dark:border-slate-800 ${showActionSheet ? 'translate-y-0' : 'translate-y-full'}`}
      >
        {selection && selection.split(' ').length < 3 ? (
          // Case A: Single Word (or short phrase) -> Show "Lookup"
          <button 
            onClick={handleLookup}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-xl font-bold text-lg active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
          >
            <BookOpen className="w-5 h-5" />
            查单词 (Look Up)
          </button>
        ) : (
          // Case B: Long Sentence -> Show "Analyze"
          <button 
            onClick={() => { setShowAnalysis(true); setShowActionSheet(false); }}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold text-lg active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
          >
            <Sparkles className="w-5 h-5" />
            语法分析 (Analyze)
          </button>
        )}
        
        {/* Close Button (X) */}
        <button 
          onClick={() => {
            setShowActionSheet(false);
            if (rendition) {
               // Try to clear selection if possible, though ReactReader doesn't expose easy clearSelection
               // rendition.getSelection().removeAllRanges(); // This might work depending on internal implementation
               // For now just clear state
            }
            setSelection(null);
          }}
          className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* --- Integrate Existing Modals --- */}
      {showDictionary && (
        <DictionaryModal 
          result={dictionaryResult}
          isLoading={isDictionaryLoading}
          onClose={() => {
            setShowDictionary(false);
            setDictionaryResult(null);
          }} 
          onAddToNotebook={handleAddToNotebook}
        />
      )}
      
      <AnalysisModal 
        isOpen={showAnalysis} 
        onClose={() => setShowAnalysis(false)} 
        text={selection || ''} 
      />

      <WordCardModal
        isOpen={showWordCard}
        onClose={() => setShowWordCard(false)}
        wordData={wordCardData}
      />

    </div> 
  );
}
