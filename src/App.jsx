import React, { useState, useMemo, useRef, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, ChevronDown, AlertCircle, Briefcase, Trash2, Pencil, X, Building2, PlusCircle, Circle, Clock, CheckCircle2, Link as LinkIcon, BookOpen, UserCircle, LogOut, Lock, Mail, UserCheck, LayoutDashboard, ExternalLink, Smartphone, Image as ImageIcon, Save, Eye } from 'lucide-react';

// --- (1) KONFIGURASI FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyDYZNnmVlGXniFMhdLVokfdU9AxekfO5o4",
  authDomain: "planner-1-26ef9.firebaseapp.com",
  projectId: "planner-1-26ef9",
  storageBucket: "planner-1-26ef9.firebasestorage.app",
  messagingSenderId: "363655017939",
  appId: "1:363655017939:web:2a6dea062e1d588956ab26",
  measurementId: "G-R4NNE04WY7"
};


const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'planner-pro-v1';

const typeBadgeColorMap = {
  'Edukasi': 'bg-blue-100 text-blue-700 border-blue-200',
  'Promosi': 'bg-purple-100 text-purple-700 border-purple-200',
  'Entertainment': 'bg-pink-100 text-pink-700 border-pink-200',
  'Testimoni': 'bg-amber-100 text-amber-700 border-amber-200',
  'Behind the Scene': 'bg-slate-100 text-slate-700 border-slate-200'
};

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login'); 
  const [authError, setAuthError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [brands, setBrands] = useState([]);
  const [contents, setContents] = useState([]);
  const [brandProfiles, setBrandProfiles] = useState({});
  const [view, setView] = useState('calendar');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filterBrand, setFilterBrand] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showAddBrandModal, setShowAddBrandModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ show: false, type: '', target: null });
  const [newBrandName, setNewBrandName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [currentImgIdx, setCurrentImgIdx] = useState(0);
  const fileInputRef = useRef(null);

  const initialFormContent = { title: '', brand: '', type: 'Edukasi', date: '', status: 'IDEA', caption: '', images: [] };
  const [formContent, setFormContent] = useState(initialFormContent);

  // --- LOGIC KOMPRESI GAMBAR ---
  const compressImage = (base64Str) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800; 
        let width = img.width;
        let height = img.height;
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
    });
  };

  const getFullBlockStatusClass = (status) => {
    switch (status) {
      case 'IDEA': return 'bg-blue-500 text-white';
      case 'READY': return 'bg-orange-500 text-white';
      case 'POSTED': return 'bg-green-700 text-white';
      default: return 'bg-white text-slate-800';
    }
  };

  const filteredContents = useMemo(() => {
    return contents.filter(c => c.brand === filterBrand);
  }, [contents, filterBrand]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false); });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    const path = ['artifacts', appId, 'users', user.uid];
    onSnapshot(collection(db, ...path, 'brands'), (snap) => {
      const list = snap.docs.map(doc => doc.data().name);
      setBrands(list);
      if (list.length > 0 && !filterBrand) setFilterBrand(list[0]);
    });
    onSnapshot(collection(db, ...path, 'contents'), (snap) => {
      setContents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, [user, filterBrand]);

  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      if (authMode === 'login') await signInWithEmailAndPassword(auth, email, password);
      else await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) { setAuthError(err.message); }
  };

  const openAddModal = (dateStr = null) => {
    setEditingId(null);
    setFormContent({ ...initialFormContent, brand: filterBrand, date: dateStr || new Date().toISOString().split('T')[0] });
    setShowModal(true);
  };

  const openEditModal = (content) => {
    setEditingId(content.id);
    setFormContent({ ...content });
    setShowModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    const col = collection(db, 'artifacts', appId, 'users', user.uid, 'contents');
    try {
      const finalData = { ...formContent, brand: filterBrand };
      if (editingId) await updateDoc(doc(col, editingId), finalData);
      else await addDoc(col, finalData);
      
      setShowModal(false);
      setEditingId(null);
      setFormContent(initialFormContent);
    } catch (err) {
      alert("Error: Pastikan ukuran gambar tidak terlalu besar.");
    }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const compressed = await compressImage(reader.result);
        setFormContent(prev => ({ ...prev, images: [...(prev.images || []), compressed] }));
      };
      reader.readAsDataURL(file);
    });
  };

  const executeDelete = async () => {
    const path = ['artifacts', appId, 'users', user.uid];
    await deleteDoc(doc(db, ...path, 'contents', confirmModal.target));
    setConfirmModal({ show: false, target: null });
    setShowModal(false);
  };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-bold">LOADING...</div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl p-8 space-y-4">
            <h1 className="text-xl font-black text-center text-indigo-600">PLANNER PRO</h1>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button onClick={() => setAuthMode('login')} className={`flex-1 py-2 rounded-lg font-bold text-xs ${authMode === 'login' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>MASUK</button>
              <button onClick={() => setAuthMode('register')} className={`flex-1 py-2 rounded-lg font-bold text-xs ${authMode === 'register' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>DAFTAR</button>
            </div>
            <input type="email" placeholder="Email" className="w-full p-3 bg-slate-50 border rounded-xl outline-none text-sm" value={email} onChange={e => setEmail(e.target.value)} />
            <input type="password" placeholder="Password" className="w-full p-3 bg-slate-50 border rounded-xl outline-none text-sm" value={password} onChange={e => setPassword(e.target.value)} />
            <button onClick={handleAuth} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold uppercase text-xs">LOG IN</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-sm text-left">
      <header className="bg-white border-b p-4 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-2 rounded-lg text-white font-black">P</div>
          <p className="font-bold text-sm">{filterBrand || 'Pilih Brand'}</p>
        </div>
        <button onClick={() => openAddModal()} className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-all active:scale-95"><Plus size={14}/> BUAT IDE</button>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <main className="flex-1 p-4 md:p-8 overflow-y-auto">
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50/50">
              <h2 className="font-black uppercase text-xs tracking-widest">{selectedDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}</h2>
              <div className="flex gap-2">
                <button onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1))} className="p-1 border rounded bg-white hover:bg-slate-50"><ChevronLeft size={16}/></button>
                <button onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1))} className="p-1 border rounded bg-white hover:bg-slate-50"><ChevronRight size={16}/></button>
              </div>
            </div>
            <div className="grid grid-cols-7 border-t">
              {[...Array(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate())].map((_, i) => {
                const d = i + 1;
                const dStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const c = filteredContents.find(item => item.date === dStr);
                return (
                  <div key={d} onClick={() => c ? openEditModal(c) : openAddModal(dStr)} className={`h-24 md:h-32 border-r border-b p-2 cursor-pointer transition-all hover:bg-slate-50 ${c ? getFullBlockStatusClass(c.status) : ''}`}>
                    <span className="text-[10px] font-bold opacity-50">{d}</span>
                    {c && <div className="mt-1 font-black text-[9px] line-clamp-3 uppercase leading-tight">{c.title}</div>}
                  </div>
                )
              })}
            </div>
          </div>
        </main>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] overflow-hidden flex flex-col md:flex-row text-left">
            <div className="flex-1 p-6 overflow-y-auto border-r space-y-6 scrollbar-hide">
               <div className="flex justify-between items-center">
                  <h2 className="font-black uppercase text-sm">{editingId ? 'Edit Ide' : 'Ide Baru'}</h2>
                  <button onClick={() => setShowModal(false)} className="p-1 hover:bg-slate-100 rounded-full"><X size={18}/></button>
               </div>
               <form onSubmit={handleFormSubmit} className="space-y-4">
                  <input placeholder="Judul Ide" required className="w-full p-3 bg-slate-50 border rounded-xl font-bold outline-none text-sm" value={formContent.title} onChange={e => setFormContent({...formContent, title: e.target.value})} />
                  <div className="grid grid-cols-2 gap-4">
                    <input type="date" className="w-full p-3 bg-slate-50 border rounded-xl font-bold outline-none text-xs" value={formContent.date} onChange={e => setFormContent({...formContent, date: e.target.value})} />
                    <select className="w-full p-3 bg-slate-50 border rounded-xl font-bold text-xs outline-none" value={formContent.type} onChange={e => setFormContent({...formContent, type: e.target.value})}>
                        <option>Edukasi</option><option>Promosi</option><option>Entertainment</option>
                    </select>
                  </div>
                  <textarea rows="4" placeholder="Naskah / Caption..." className="w-full p-3 bg-slate-50 border rounded-xl text-xs outline-none resize-none font-medium" value={formContent.caption} onChange={e => setFormContent({...formContent, caption: e.target.value})} />
                  <button type="button" onClick={() => fileInputRef.current.click()} className="w-full p-3 border-2 border-dashed rounded-xl font-black text-[10px] uppercase text-slate-400 hover:bg-slate-50">Upload Media</button>
                  <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleImageChange} />
                  <div className="flex gap-2 pt-4">
                    {editingId && <button type="button" onClick={() => setConfirmModal({show: true, target: editingId})} className="px-4 py-2 bg-red-50 text-red-500 rounded-xl font-bold text-[10px] uppercase transition-all hover:bg-red-100">HAPUS</button>}
                    <button type="submit" className="flex-1 bg-indigo-600 text-white py-3 rounded-xl font-black uppercase text-xs shadow-lg transition-all active:scale-95">SIMPAN IDE</button>
                  </div>
               </form>
            </div>

            <div className="hidden md:flex flex-[0.7] bg-slate-50 p-6 items-center justify-center">
                <div className="w-full max-w-[280px] bg-white rounded-xl shadow-lg border overflow-hidden">
                    <div className="aspect-square bg-slate-200 relative group">
                        {formContent.images?.length > 0 ? (
                            <>
                                <img src={formContent.images[currentImgIdx]} className="w-full h-full object-cover" />
                                {formContent.images.length > 1 && (
                                    <div className="absolute inset-0 flex items-center justify-between px-2">
                                        <button onClick={(e) => {e.preventDefault(); setCurrentImgIdx(p => p === 0 ? formContent.images.length-1 : p-1)}} className="w-6 h-6 bg-white/90 rounded-full shadow flex items-center justify-center"><ChevronLeft size={12}/></button>
                                        <button onClick={(e) => {e.preventDefault(); setCurrentImgIdx(p => p === formContent.images.length-1 ? 0 : p+1)}} className="w-6 h-6 bg-white/90 rounded-full shadow flex items-center justify-center"><ChevronRight size={12}/></button>
                                    </div>
                                )}
                                <div className="absolute bottom-2 right-2 bg-black/50 text-white text-[8px] px-2 py-0.5 rounded-full font-bold">{currentImgIdx+1}/{formContent.images.length}</div>
                            </>
                        ) : <div className="flex flex-col items-center justify-center h-full text-slate-400"><ImageIcon size={32}/><p className="text-[8px] font-black uppercase mt-2">No Visual</p></div>}
                    </div>
                    <div className="p-4 space-y-2">
                        <p className="text-[10px] font-black uppercase text-indigo-600">{filterBrand || 'BRAND'}</p>
                        <p className="text-[9px] text-slate-600 leading-relaxed line-clamp-6 whitespace-pre-wrap">{formContent.caption || 'Caption preview...'}</p>
                    </div>
                </div>
            </div>
          </div>
        </div>
      )}

      {confirmModal.show && (
        <div className="fixed inset-0 bg-slate-900/90 z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-xs w-full text-center space-y-4">
             <AlertCircle size={32} className="mx-auto text-red-500"/>
             <p className="font-bold text-xs uppercase">Hapus ide ini?</p>
             <div className="flex gap-2">
                <button onClick={() => setConfirmModal({show:false, target:null})} className="flex-1 py-2 bg-slate-100 rounded-lg font-bold text-[10px]">BATAL</button>
                <button onClick={executeDelete} className="flex-1 py-2 bg-red-600 text-white rounded-lg font-bold text-[10px]">HAPUS</button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;