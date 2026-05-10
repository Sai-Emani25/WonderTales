'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Volume2, Loader2, Sparkles, BookOpen, Play, Pause, ListChecks } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { generateIllustration, generateSpeech, Story } from '@/lib/ai';
import { cn } from '@/lib/utils';

interface StoryBookProps {
  story: Story;
  onReset: () => void;
}

const STORY_TYPE_CONFIG = {
  'kid-story': {
    card: "aspect-square md:aspect-[16/10] bg-white border-4 border-orange-200 rounded-[2.5rem]",
    layout: "flex flex-col md:flex-row h-full w-full",
    visual: "relative flex items-center justify-center w-full md:w-1/2 bg-orange-50/50 p-4",
    image: "w-full h-full rounded-2xl shadow-xl border-4 border-white object-cover",
    content: "w-full md:w-1/2 p-10 bg-white gap-8 text-center flex flex-col justify-center",
    text: "text-2xl md:text-3xl font-serif text-gray-800",
    audioBtn: "bg-orange-400 hover:bg-orange-500",
    audioBtnActive: "bg-orange-500 scale-110",
    dot: "bg-orange-600",
    nav: "text-orange-600 hover:bg-orange-50",
    primary: "bg-orange-600 hover:bg-orange-700",
    title: "text-orange-800",
    footerStyle: "bg-white/80 border-orange-100",
    pageText: "text-orange-400"
  },
  'visual-novel': {
    card: "aspect-[16/9] bg-black border-4 border-indigo-950 rounded-xl",
    layout: "h-full w-full relative",
    visual: "absolute inset-0 w-full h-full flex items-end justify-center",
    image: "w-full h-full brightness-75 hover:scale-105 object-cover object-bottom",
    content: "absolute bottom-0 left-0 right-0 p-10 bg-gradient-to-t from-black via-black/80 to-transparent text-white min-h-[40%] flex flex-col justify-center",
    text: "text-2xl md:text-3xl font-medium vn-text-shadow italic",
    audioBtn: "bg-white/10 backdrop-blur-xl border border-white/20 hover:bg-white/30",
    audioBtnActive: "bg-white/20 scale-110",
    dot: "bg-indigo-400",
    nav: "text-indigo-600 hover:bg-indigo-50",
    primary: "bg-indigo-600 hover:bg-indigo-700",
    title: "text-indigo-900",
    footerStyle: "bg-white/80 border-indigo-100",
    pageText: "text-indigo-400"
  },
  'training-video': {
    card: "aspect-[16/9] bg-slate-50 border-4 border-blue-900 rounded-xl",
    layout: "flex flex-col md:flex-row h-full w-full",
    visual: "relative flex items-center justify-center w-full md:w-2/5 p-8",
    image: "w-full h-full rounded-3xl border-4 border-blue-100 shadow-2xl object-cover",
    content: "w-full md:w-3/5 p-12 bg-white gap-8 border-l border-blue-50 flex flex-col justify-center",
    text: "text-xl text-gray-600 font-medium italic border-t pt-6",
    audioBtn: "bg-blue-600 hover:bg-blue-700",
    audioBtnActive: "bg-blue-500 scale-110",
    dot: "bg-blue-600",
    nav: "text-blue-600 hover:bg-blue-50",
    primary: "bg-blue-600 hover:bg-blue-700",
    title: "text-blue-900",
    footerStyle: "bg-white/90 border-blue-100",
    pageText: "text-blue-400"
  }
} as const;

export default function StoryBook({ story, onReset }: StoryBookProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [images, setImages] = useState<Record<number, string>>({});
  const [loadingImage, setLoadingImage] = useState<Record<number, boolean>>({});
  const [audioUrls, setAudioUrls] = useState<Record<number, string>>({});
  const [loadingAudio, setLoadingAudio] = useState<Record<number, boolean>>({});
  const [isPlaying, setIsPlaying] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const config = STORY_TYPE_CONFIG[story.type] || STORY_TYPE_CONFIG['kid-story'];
  const isTraining = story.type === 'training-video';
  const page = story.pages[currentPage];

  useEffect(() => {
    const loadImage = async (index: number) => {
      if (images[index] || loadingImage[index]) return;
      
      setLoadingImage(prev => ({ ...prev, [index]: true }));
      try {
        const prevImage = index > 0 ? images[index - 1] : undefined;
        let stylePr = "colorful children's book illustration, whimsical and soft";
        if (story.type === 'visual-novel') stylePr = "cinematic anime visual novel art style, high quality";
        if (story.type === 'training-video') stylePr = "modern clean corporate tech illustration, flat design, professional 2D vector style";
        
        const prompt = `${page.illustrationPrompt}. Background: ${page.sceneDescription}. Characters: ${page.characterDescription}`;
        const url = await generateIllustration(prompt, stylePr, prevImage);
        setImages(prev => ({ ...prev, [index]: url }));
      } catch (error) {
        console.error("Image loading failed:", error);
      } finally {
        setLoadingImage(prev => ({ ...prev, [index]: false }));
      }
    };

    loadImage(currentPage);
  }, [currentPage, story.type, page, images, loadingImage]);

  // Handle Autoplay logic
  useEffect(() => {
    if (autoPlay && !isPlaying && !loadingAudio[currentPage] && audioUrls[currentPage]) {
       const timer = setTimeout(() => {
         if (currentPage < story.pages.length - 1) {
           next();
         } else {
           setAutoPlay(false);
         }
       }, 2000);
       return () => clearTimeout(timer);
    }
  }, [isPlaying, autoPlay]);

  // Auto trigger audio if autoplay is on
  useEffect(() => {
    if (autoPlay && !isPlaying && !loadingAudio[currentPage]) {
      handlePlayAudio();
    }
  }, [currentPage, autoPlay]);

  const handlePlayAudio = async () => {
    if (isPlaying) {
      audioRef.current?.pause();
      setIsPlaying(false);
      return;
    }

    if (audioUrls[currentPage]) {
      if (audioRef.current) {
        audioRef.current.src = audioUrls[currentPage];
        audioRef.current.play();
      }
      return;
    }

    setLoadingAudio(prev => ({ ...prev, [currentPage]: true }));
    try {
      const url = await generateSpeech(page.text);
      setAudioUrls(prev => ({ ...prev, [currentPage]: url }));
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
      }
    } catch (error) {
      console.error("Audio failed:", error);
    } finally {
      setLoadingAudio(prev => ({ ...prev, [currentPage]: false }));
    }
  };

  const next = () => {
    if (currentPage < story.pages.length - 1) {
      audioRef.current?.pause();
      setIsPlaying(false);
      setCurrentPage(p => p + 1);
    }
  };

  const prev = () => {
    if (currentPage > 0) {
      audioRef.current?.pause();
      setIsPlaying(false);
      setCurrentPage(p => p - 1);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-5xl mx-auto gap-8 pb-10">
      <audio 
        ref={audioRef} 
        onEnded={() => setIsPlaying(false)} 
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

      <div className="flex items-center justify-between w-full">
        <Button variant="ghost" onClick={onReset} className={cn("font-black", config.nav)}>
          ← Back
        </Button>
        <div className="flex flex-col items-center">
            <h2 className={cn("text-3xl font-black text-center tracking-tight", config.title)}>
              {story.title}
            </h2>
            <p className="text-sm opacity-50 font-bold uppercase tracking-widest">{story.type.replace('-', ' ')}</p>
        </div>
        <div className="w-32 flex justify-end">
           <Button 
            onClick={() => setAutoPlay(!autoPlay)}
            variant={autoPlay ? "default" : "outline"}
            className={cn(
              "rounded-full font-black",
              autoPlay ? "bg-green-600 hover:bg-green-700" : "border-2 border-gray-200"
            )}
           >
             {autoPlay ? <Pause className="mr-2" /> : <Play className="mr-2" />}
             {autoPlay ? 'Autoplay ON' : 'Autoplay OFF'}
           </Button>
        </div>
      </div>

      <Card className={cn("relative overflow-hidden w-full shadow-2xl transition-all duration-700", config.card)}>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.8 }}
            className={config.layout}
          >
            {/* Visual Part */}
            <div className={config.visual}>
              {loadingImage[currentPage] ? (
                <div className={cn("flex flex-col items-center gap-4 text-gray-400")}>
                  <Loader2 className="w-16 h-16 animate-spin" />
                  <p className="font-black animate-pulse uppercase tracking-wider text-xs">Generating visual...</p>
                </div>
              ) : images[currentPage] ? (
                <img
                  src={images[currentPage]}
                  alt="Story scene"
                  className={cn("transition-transform duration-2000", config.image)}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <Sparkles className="w-32 h-32 opacity-10" />
              )}
            </div>

            {/* Content Part */}
            <div className={config.content}>
              <div className={cn("max-w-prose mx-auto flex flex-col items-center", isTraining ? "w-full gap-6" : "gap-8")}>
                
                {isTraining && page.keyPoints && (
                  <div className="w-full space-y-4 mb-4">
                     <div className="flex items-center gap-2 mb-2">
                        <ListChecks className="text-blue-600" />
                        <span className="font-black text-blue-900 uppercase tracking-tighter">Key Takeaways</span>
                     </div>
                     <div className="grid gap-3">
                        {page.keyPoints.map((point, idx) => (
                           <motion.div 
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            transition={{ delay: 0.1 * idx }}
                            key={idx} 
                            className="bg-blue-50/50 p-4 rounded-xl border-l-4 border-blue-500 text-blue-900 font-bold text-left"
                           >
                              {point}
                           </motion.div>
                        ))}
                     </div>
                  </div>
                )}

                <p className={cn("leading-relaxed", config.text)}>
                  &ldquo;{page.text}&rdquo;
                </p>

                <Button
                  size="lg"
                  onClick={handlePlayAudio}
                  disabled={loadingAudio[currentPage]}
                  className={cn(
                    "rounded-full h-20 w-20 shadow-2xl transition-all border-none group",
                    isPlaying ? config.audioBtnActive : config.audioBtn
                  )}
                >
                  {loadingAudio[currentPage] ? (
                    <Loader2 className="animate-spin h-10 w-10" />
                  ) : isPlaying ? (
                    <div className="flex gap-1.5 items-center">
                      {[1, 2, 3].map(i => (
                        <div key={i} className="w-2 h-8 bg-white rounded-full animate-bounce" style={{ animationDelay: `${i*100}ms` }} />
                      ))}
                    </div>
                  ) : (
                    <Volume2 className="h-10 w-10 text-white group-hover:scale-110 transition-transform" />
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="absolute bottom-6 right-6 flex gap-3 z-30">
          {story.pages.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-3 rounded-full transition-all duration-500",
                i === currentPage ? config.dot : 'w-3 bg-gray-300'
              )}
            />
          ))}
        </div>
      </Card>

      <div className={cn("flex items-center gap-8 px-10 py-6 backdrop-blur-md rounded-full shadow-xl border", config.footerStyle)}>
        <Button
          variant="ghost"
          size="lg"
          onClick={prev}
          disabled={currentPage === 0}
          className={cn("rounded-full font-black", config.nav)}
        >
          <ChevronLeft className="h-8 w-8 mr-2" />
          Previous
        </Button>
        <div className="flex flex-col items-center min-w-[120px]">
          <span className={cn("text-xl font-black", config.pageText)}>
            {currentPage + 1} / {story.pages.length}
          </span>
        </div>
        <Button
          size="lg"
          onClick={next}
          disabled={currentPage === story.pages.length - 1}
          className={cn("rounded-full text-white h-16 px-10 shadow-lg group", config.primary)}
        >
          {currentPage === story.pages.length - 1 ? 'Finish' : 'Next Step'}
          <ChevronRight className="h-8 w-8 ml-2 group-hover:translate-x-2 transition-transform" />
        </Button>
      </div>
    </div>
  );
}
