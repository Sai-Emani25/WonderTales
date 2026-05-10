'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Pencil, Rocket, Sparkles, BookOpen, Star, User, LogOut, History, Upload, Play, Library, GraduationCap, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { generateStory, convertToVisualNovel, generateTrainingModule, Story } from '@/lib/ai';
import StoryBook from '@/components/StoryBook';
import { auth, db, googleProvider } from '@/lib/firebase';
import { signInWithPopup, onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { collection, addDoc, query, where, getDocs, orderBy, Timestamp } from 'firebase/firestore';
import { cn } from '@/lib/utils';

type Tab = 'create' | 'convert' | 'training' | 'library';

export default function Home() {
  const [theme, setTheme] = useState('');
  const [bookText, setBookText] = useState('');
  const [trainingGuide, setTrainingGuide] = useState('');
  const [loading, setLoading] = useState(false);
  const [story, setStory] = useState<Story | null>(null);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [savedStories, setSavedStories] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('create');
  const [genType, setGenType] = useState<'kid-story' | 'visual-novel' | 'training-video'>('kid-story');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      if (u) loadLibrary(u.uid);
    });
    return () => unsub();
  }, []);

  const loadLibrary = async (uid: string) => {
    try {
      const q = query(
        collection(db, 'stories'),
        where('authorId', '==', uid),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      setSavedStories(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (e) {
      console.error("Library load failed:", e);
    }
  };

  const handleLogin = () => signInWithPopup(auth, googleProvider);
  const handleLogout = () => signOut(auth).then(() => setSavedStories([]));

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!theme.trim()) return;
    setLoading(true);
    try {
      const s = await generateStory(theme, genType);
      setStory(s);
      if (user) await saveStory(s);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleConvert = async () => {
    if (!bookText.trim()) return;
    setLoading(true);
    try {
      const s = await convertToVisualNovel(bookText);
      setStory(s);
      if (user) await saveStory(s);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTraining = async () => {
    if (!trainingGuide.trim()) return;
    setLoading(true);
    try {
      const s = await generateTrainingModule(trainingGuide);
      setStory(s);
      if (user) await saveStory(s);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const saveStory = async (s: Story) => {
    try {
      await addDoc(collection(db, 'stories'), {
        ...s,
        authorId: user?.uid,
        createdAt: Timestamp.now(),
      });
      loadLibrary(user!.uid);
    } catch (e) {
      console.error("Save failed:", e);
    }
  };

  return (
    <main className="min-h-screen relative overflow-x-hidden">
      {/* Background Decor */}
      <div className="fixed inset-0 pointer-events-none opacity-20 z-0">
        <Star className="absolute top-[10%] left-[5%] w-12 h-12 text-yellow-400 animate-spin-slow" />
        <Rocket className="absolute bottom-[20%] right-[10%] w-20 h-20 text-orange-400 animate-bounce" />
        <Sparkles className="absolute top-[30%] right-[5%] w-10 h-10 text-indigo-400 animate-pulse" />
      </div>

      <header className="container mx-auto px-6 py-8 flex justify-between items-center relative z-20">
        <div className="flex items-center gap-3 cursor-pointer group" onClick={() => setStory(null)}>
          <div className="bg-orange-100 p-3 rounded-2xl group-hover:rotate-12 transition-transform">
            <BookOpen className="w-8 h-8 text-orange-600" />
          </div>
          <h1 className="text-4xl font-black text-orange-900 tracking-tighter">
            Wonder<span className="text-orange-600">Tales</span>
          </h1>
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-4 bg-white p-1.5 pr-5 rounded-full shadow-lg border border-orange-100">
              {user.photoURL && <img src={user.photoURL} className="w-10 h-10 rounded-full" alt="User" />}
              <div className="flex flex-col">
                <span className="text-xs font-black text-orange-900 truncate max-w-[100px]">{user.displayName}</span>
                <button onClick={handleLogout} className="text-[10px] font-bold text-orange-400 hover:text-orange-600 text-left">Logout</button>
              </div>
            </div>
          ) : (
            <Button onClick={handleLogin} variant="outline" className="rounded-full font-black border-2 border-orange-200">
               Sign In
            </Button>
          )}
        </div>
      </header>

      <div className="container mx-auto px-6 py-10 relative z-10">
        <AnimatePresence mode="wait">
          {story ? (
            <motion.div key="story-view" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }}>
              <StoryBook story={story} onReset={() => setStory(null)} />
            </motion.div>
          ) : loading ? (
            <motion.div key="loading-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center min-h-[60vh] gap-10">
               <div className="relative">
                 <motion.div animate={{ rotate: 360 }} transition={{ duration: 4, repeat: Infinity, ease: "linear" }} className="w-56 h-56 rounded-full border-[12px] border-orange-50 border-t-orange-500 shadow-2xl" />
                 <Sparkles className="absolute inset-0 m-auto w-20 h-20 text-orange-400 animate-pulse" />
               </div>
               <div className="text-center">
                 <h2 className="text-4xl font-black text-orange-950 mb-3">Mixing Magic Inks...</h2>
                 <p className="text-xl font-bold text-orange-600/60 italic animate-bounce">Consulting the creative spirits...</p>
               </div>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center gap-12 max-w-4xl mx-auto">
               <div className="flex bg-white/60 backdrop-blur-xl p-2 rounded-[2rem] border-2 border-orange-100 shadow-xl overflow-x-auto max-w-full">
                 <TabButton active={activeTab === 'create'} onClick={() => setActiveTab('create')} icon={<Sparkles />} label="Create" color="orange" />
                 <TabButton active={activeTab === 'convert'} onClick={() => setActiveTab('convert')} icon={<Upload />} label="Convert" color="indigo" />
                 <TabButton active={activeTab === 'training'} onClick={() => setActiveTab('training')} icon={<GraduationCap />} label="Training" color="blue" />
                 <TabButton active={activeTab === 'library'} onClick={() => setActiveTab('library')} icon={<Library />} label="Library" color="amber" />
               </div>

               {activeTab === 'create' && (
                 <motion.div key="create-tab" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full flex flex-col gap-10">
                    <div className="flex justify-center gap-4 flex-wrap">
                      {['kid-story', 'visual-novel', 'training-video'].map((t) => (
                        <button
                          key={t}
                          onClick={() => setGenType(t as any)}
                          className={cn(
                            "px-10 py-3 rounded-full font-black text-xs uppercase tracking-widest transition-all border-4",
                            genType === t ? "bg-orange-50 border-orange-500 text-orange-600 scale-105 shadow-md" : "border-transparent text-gray-400 hover:text-orange-300"
                          )}
                        >
                          {t.replace('-', ' ')}
                        </button>
                      ))}
                    </div>

                    <form onSubmit={handleCreate} className="w-full flex flex-col gap-6">
                       <div className="relative">
                          <Input 
                            placeholder={genType === 'kid-story' ? "Theme: A brave toaster's first mission..." : "Theme: Cyberpunk rebellion in a neon city..."} 
                            value={theme}
                            onChange={e => setTheme(e.target.value)}
                            className="h-24 px-12 text-2xl rounded-[2.5rem] border-8 border-orange-50 focus:border-orange-200 bg-white shadow-2xl text-orange-950 placeholder:text-orange-200"
                          />
                          <Pencil className="absolute right-10 top-1/2 -translate-y-1/2 w-10 h-10 text-orange-100" />
                       </div>
                       <Button type="submit" className="h-20 rounded-[2rem] bg-orange-600 hover:bg-orange-700 text-3xl font-black shadow-2xl transition-all hover:scale-[1.02] active:scale-95 group">
                          <Sparkles className="mr-4 w-10 h-10 group-hover:rotate-45 transition-transform" />
                          Write My Magical Tale!
                       </Button>
                    </form>
                 </motion.div>
               )}

               {activeTab === 'convert' && (
                 <motion.div key="convert-tab" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full">
                    <Card className="p-12 rounded-[3.5rem] border-[10px] border-indigo-50 bg-white shadow-2xl relative overflow-hidden">
                       <Upload className="absolute -top-10 -right-10 w-48 h-48 text-indigo-50 rotate-12" />
                       <div className="relative z-10">
                          <h2 className="text-4xl font-black text-indigo-900 mb-4">Text Transformer</h2>
                          <p className="text-lg font-bold text-indigo-400 mb-10">Paste book text, scripts, or notes to generate a cinematic visual novel.</p>
                          <textarea 
                            value={bookText}
                            onChange={e => setBookText(e.target.value)}
                            placeholder="Once upon a time..."
                            className="w-full h-80 p-10 text-xl font-serif rounded-[2.5rem] bg-indigo-50/30 border-4 border-indigo-50 focus:border-indigo-100 resize-none shadow-inner"
                          />
                          <Button onClick={handleConvert} className="w-full h-20 mt-10 rounded-[2rem] bg-indigo-600 hover:bg-indigo-700 text-3xl font-black shadow-2xl flex gap-4">
                             <Rocket className="w-10 h-10" /> Transform into Novel
                          </Button>
                       </div>
                    </Card>
                 </motion.div>
               )}

               {activeTab === 'training' && (
                 <motion.div key="training-tab" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full">
                    <Card className="p-12 rounded-[3.5rem] border-[10px] border-blue-50 bg-white shadow-2xl relative overflow-hidden">
                       <Video className="absolute -top-10 -right-10 w-48 h-48 text-blue-50 rotate-12" />
                       <div className="relative z-10">
                          <h2 className="text-4xl font-black text-blue-900 mb-4 font-serif">Training Lab</h2>
                          <p className="text-lg font-bold text-blue-400 mb-10 uppercase tracking-widest">Transform your docs into an interactive 10-part video modules.</p>
                          <textarea 
                            value={trainingGuide}
                            onChange={e => setTrainingGuide(e.target.value)}
                            placeholder="Paste process guides, security protocols, or tech documentation here..."
                            className="w-full h-80 p-10 text-xl font-medium rounded-[2.5rem] bg-blue-50/20 border-4 border-blue-50 focus:border-blue-100 resize-none shadow-inner"
                          />
                          <Button onClick={handleCreateTraining} className="w-full h-20 mt-10 rounded-[2rem] bg-blue-600 hover:bg-blue-700 text-3xl font-black shadow-2xl flex gap-4 uppercase tracking-tighter">
                             <GraduationCap className="w-10 h-10" /> Build 10-Step Video Track
                          </Button>
                       </div>
                    </Card>
                 </motion.div>
               )}

               {activeTab === 'library' && (
                 <motion.div key="library-tab" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full grid md:grid-cols-2 gap-8">
                    {!user ? (
                      <div className="col-span-full py-24 text-center bg-white/40 backdrop-blur-md rounded-[4rem] border-8 border-dashed border-orange-100">
                        <User className="w-24 h-24 mx-auto mb-6 text-orange-100" />
                        <h3 className="text-3xl font-black text-orange-900 mb-6">Sign in to unlock your bookshelf</h3>
                        <Button onClick={handleLogin} className="rounded-full h-16 px-12 bg-orange-600 text-xl font-black">Login</Button>
                      </div>
                    ) : savedStories.length === 0 ? (
                      <div className="col-span-full py-24 text-center bg-white/40 backdrop-blur-md rounded-[4rem] border-8 border-dashed border-orange-100">
                         <Play className="w-24 h-24 mx-auto mb-6 text-orange-100 animate-pulse" />
                         <p className="text-2xl font-black text-orange-200">No tales yet...</p>
                      </div>
                    ) : (
                      savedStories.map((s) => (
                        <Card 
                          key={s.id} 
                          onClick={() => setStory(s)}
                          className="p-10 rounded-[3rem] bg-white border-4 border-transparent hover:border-orange-200 cursor-pointer transition-all hover:shadow-2xl hover:-translate-y-2 group shadow-lg"
                        >
                          <div className="flex justify-between items-start">
                             <div className="flex flex-col gap-4">
                                <span className={cn(
                                  "px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest self-start",
                                  s.type === 'visual-novel' ? "bg-indigo-100 text-indigo-600" : "bg-orange-100 text-orange-600"
                                )}>
                                  {s.type.replace('-', ' ')}
                                </span>
                                <h3 className="text-3xl font-black text-orange-950 group-hover:text-orange-600 leading-tight transition-colors">{s.title}</h3>
                             </div>
                             <div className="bg-orange-50 p-5 rounded-3xl group-hover:bg-orange-600 group-hover:text-white transition-all transform group-hover:rotate-12">
                                <Play className="w-8 h-8 fill-current" />
                             </div>
                          </div>
                        </Card>
                      ))
                    )}
                 </motion.div>
               )}
            </div>
          )}
        </AnimatePresence>
      </div>

      <footer className="container mx-auto px-6 py-12 text-center relative z-20">
        <p className="text-sm font-black text-orange-900/30 uppercase tracking-[0.3em]">Crafted with AI Magic</p>
      </footer>
    </main>
  );
}

function TabButton({ active, onClick, icon, label, color }: any) {
  const colors: any = {
    orange: active ? 'bg-orange-500 text-white shadow-lg' : 'text-orange-400 hover:bg-orange-50',
    indigo: active ? 'bg-indigo-600 text-white shadow-lg' : 'text-indigo-400 hover:bg-indigo-50',
    amber: active ? 'bg-amber-500 text-white shadow-lg' : 'text-amber-400 hover:bg-amber-50',
    blue: active ? 'bg-blue-600 text-white shadow-lg' : 'text-blue-400 hover:bg-blue-50',
  };
  return (
    <button onClick={onClick} className={cn("px-10 py-4 rounded-2xl font-black flex items-center gap-3 transition-all", colors[color])}>
      {React.cloneElement(icon, { className: "w-6 h-6" })}
      {label}
    </button>
  );
}
