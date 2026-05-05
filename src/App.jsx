import React, { useState, useMemo, useRef, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { Calendar as CalendarIcon, Plus, ChevronLeft, ChevronRight, ChevronDown, AlertCircle, Briefcase, Trash2, Pencil, X, Building2, PlusCircle, Circle, Clock, CheckCircle2, Link as LinkIcon, BookOpen, UserCircle, LogOut, Lock, Mail, UserCheck, LayoutDashboard, ExternalLink, Smartphone, Image as ImageIcon, Save, Eye, CheckCircle } from 'lucide-react';

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

const App = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login'); 
  const [authError, setAuthError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [brands, setBrands] = useState([]);
  const [contents, setContents] = useState([]);
  const [view, setView] = useState('calendar');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filterBrand, setFilterBrand] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showAddBrandModal, setShowAddBrandModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ show: false, target: null });
  const [notification, setNotification] = useState({ show: false, message: '' });
  const [editingId, setEditingId] = useState(null);
  const [currentImgIdx, setCurrentImgIdx] = useState(0);
  const [newBrandName, setNewBrandName] = useState('');
  const fileInputRef = useRef(null);

  const initialFormContent = { title: '', brand: '', type: 'Edukasi', date: '', status: 'IDEA', caption: '', images: [] };
  const [formContent, setFormContent] = useState(initialFormContent);

  // --- NOTIFICATION HANDLER ---
  const showToast = (msg) => {
    setNotification({ show: true, message: msg });
    setTimeout(() => setNotification({ show: false, message: '' }), 3000);
  };

  // --- IMAGE COMPRESSION ---
  const compressImage = (base64Str) => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = base64Str;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800; 
        let width = img.width;
        let height = img.height;
        if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
    });
  };

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
      showToast("Ide berhasil disimpan!");
    } catch (err) {
      alert("Error saving data. Check image size.");
    }
  };

  const executeDelete = async () => {
    const path = ['artifacts', appId, 'users', user.uid];
    await deleteDoc(doc(db, ...path, 'contents', confirmModal.target));
    setConfirmModal({ show: false, target: null });
    setShowModal(false);
    showToast("Ide berhasil dihapus.");
  };

  const handleAddBrand = async (e) => {
    e.preventDefault();
    if (newBrandName.trim()) {
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'brands', newBrandName), { name: newBrandName });
      setFilterBrand(newBrandName);
      setNewBrandName('');
      setShowAddBrandModal(false);
      showToast("Bisnis baru ditambahkan.");
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center font-black text-indigo-600 animate-pulse uppercase tracking-widest">Loading...</div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white w-full max-w-sm rounded-3xl shadow-2xl p-10 space-y-6">
            <div className="text-center space-y-2">
                <h1 className="text-2xl font-black text-indigo-600 tracking-tighter uppercase">Planner Pro</h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Content Management System</p>
            </div>
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button onClick={() => setAuthMode('login')} className={`flex-1 py-2.5 rounded-lg font-bold text-xs transition-all ${authMode === 'login' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>MASUK</button>
              <button onClick={() => setAuthMode('register')} className={`flex-1 py-2.5 rounded-lg font-bold text-xs transition-all ${authMode === 'register' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>DAFTAR</button>
            </div>
            <div className="space-y-3">
                <input type="email" placeholder="Email" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-bold" value={email} onChange={e => setEmail(e.target.value)} />
                <input type="password" placeholder="Password" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none text-sm font-bold" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <button onClick={handleAuth} className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg shadow-indigo-100 active:scale-95 transition-all">Log In</button>
            <button onClick={() => signInAnonymously(auth)} className="w-full text-slate-400 font-bold text-[10px] uppercase">Masuk Sebagai Tamu</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* Toast Notification */}
      {notification.show && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[300] animate-in slide-in-from-top-4 duration-300">
          <div className="bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/10 backdrop-blur-md">
            <CheckCircle className="text-emerald-400" size={18} />
            <span className="text-xs font-black uppercase tracking-widest">{notification.message}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b p-4 flex justify-between items-center sticky top-0 z-40">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
              <div className="bg-indigo-600 p-2 rounded-xl text-white font-black"><LayoutDashboard size={20}/></div>
              <h1 className="font-black text-sm uppercase tracking-tighter hidden sm:block">Planner Pro</h1>
          </div>
          <button onClick={() => setShowAddBrandModal(true)} className="flex items-center gap-2 font-bold bg-slate-100 px-4 py-2 rounded-xl text-xs hover:bg-slate-200 transition-colors">
            <Building2 size={14}/> {filterBrand || 'Pilih Bisnis'} <ChevronDown size={12}/>
          </button>
        </div>
        <button onClick={() => openAddModal()} className="bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-black text-xs flex items-center gap-2 shadow-lg active:scale-95 transition-all"><Plus size={16}/> BUAT IDE</button>
      </header>

      {/* Main Container dengan Sidebar Kiri */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Kiri */}
        <aside className="w-64 bg-white border-r p-6 hidden lg:flex flex-col justify-between">
          <div className="space-y-2">
            <button onClick={() => setView('calendar')} className={`w-full flex items-center gap-3 p-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all ${view === 'calendar' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400 hover:bg-slate-50'}`}><CalendarIcon size={18}/> Schedule</button>
            <button className="w-full flex items-center gap-3 p-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest text-slate-400 hover:bg-slate-50"><UserCircle size={18}/> Profil</button>
            <button className="w-full flex items-center gap-3 p-3.5 rounded-2xl font-black text-[11px] uppercase tracking-widest text-slate-400 hover:bg-slate-50"><BookOpen size={18}/> Ideas Bank</button>
          </div>
          <button onClick={() => signOut(auth)} className="flex items-center gap-3 p-4 text-red-500 font-black text-[11px] uppercase tracking-widest hover:bg-red-50 rounded-2xl transition-all"><LogOut size={18}/> Keluar</button>
        </aside>

        {/* Content Area Tengah */}
        <main className="flex-1 p-4 md:p-8 overflow-y-auto text-left">
          <div className="bg-white rounded-3xl border shadow-sm overflow-hidden animate-in fade-in duration-500">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50/30">
              <h2 className="font-black uppercase text-sm tracking-[0.2em] text-slate-400">{selectedDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}</h2>
              <div className="flex gap-2">
                <button onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1))} className="p-2 border rounded-xl bg-white hover:bg-slate-50 transition-colors shadow-sm"><ChevronLeft size={18}/></button>
                <button onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1))} className="p-2 border rounded-xl bg-white hover:bg-slate-50 transition-colors shadow-sm"><ChevronRight size={18}/></button>
              </div>
            </div>
            <div className="grid grid-cols-7 text-center py-3 bg-white text-[9px] font-black text-slate-300 uppercase tracking-widest border-b">
              {['Min','Sen','Sel','Rab','Kam','Jum','Sab'].map(d => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {[...Array(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).getDay())].map((_, i) => <div key={i} className="h-24 md:h-36 border-r border-b border-slate-50 bg-slate-50/20"></div>)}
              {[...Array(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate())].map((_, i) => {
                const d = i + 1;
                const dStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                const c = contents.filter(item => item.brand === filterBrand).find(item => item.date === dStr);
                return (
                  <div key={d} onClick={() => c ? openEditModal(c) : openAddModal(dStr)} className={`h-24 md:h-36 border-r border-b border-slate-100 p-3 cursor-pointer transition-all hover:bg-indigo-50/40 relative group ${c ? 'bg-indigo-600 text-white' : 'bg-white'}`}>
                    <span className={`text-[10px] font-black ${c ? 'text-indigo-200' : 'text-slate-300'}`}>{d}</span>
                    {c && <div className="mt-2 font-black text-[10px] line-clamp-3 uppercase leading-tight tracking-tight">{c.title}</div>}
                    {!c && <Plus size={14} className="absolute bottom-3 right-3 text-indigo-200 opacity-0 group-hover:opacity-100 transition-opacity" />}
                  </div>
                )
              })}
            </div>
          </div>
        </main>
      </div>

      {/* Modal Input/Edit */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl h-[85vh] overflow-hidden flex flex-col md:flex-row text-left border border-white/20 animate-in zoom-in duration-300">
            {/* Form Section */}
            <div className="flex-1 p-8 overflow-y-auto border-r space-y-6 scrollbar-hide text-left">
               <div className="flex justify-between items-center">
                  <h2 className="font-black uppercase text-xs tracking-[0.3em] text-slate-400">{editingId ? 'Edit Content' : 'New Content'}</h2>
                  <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={20}/></button>
               </div>
               <form onSubmit={handleFormSubmit} className="space-y-5">
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Judul Ide</label>
                    <input required className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold outline-none text-sm focus:ring-4 focus:ring-indigo-50 transition-all" value={formContent.title} onChange={e => setFormContent({...formContent, title: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Tanggal</label>
                        <input type="date" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs outline-none" value={formContent.date} onChange={e => setFormContent({...formContent, date: e.target.value})} />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pillar</label>
                        <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs outline-none cursor-pointer" value={formContent.type} onChange={e => setFormContent({...formContent, type: e.target.value})}>
                            <option>Edukasi</option><option>Promosi</option><option>Entertainment</option><option>Testimoni</option>
                        </select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Naskah / Caption</label>
                    <textarea rows="4" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs outline-none resize-none font-medium leading-relaxed" value={formContent.caption} onChange={e => setFormContent({...formContent, caption: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Aset Gambar</label>
                    <button type="button" onClick={() => fileInputRef.current.click()} className="w-full p-4 border-2 border-dashed border-slate-200 rounded-2xl font-black text-[10px] uppercase text-slate-400 hover:bg-slate-50 hover:border-indigo-200 transition-all">Klik untuk Unggah</button>
                    <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleImageChange} />
                  </div>
                  <div className="flex gap-3 pt-4">
                    {editingId && <button type="button" onClick={() => setConfirmModal({show: true, target: editingId})} className="px-6 py-4 bg-red-50 text-red-500 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-100 transition-all">Hapus</button>}
                    <button type="submit" className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 active:scale-95 transition-all">Simpan Ide</button>
                  </div>
               </form>
            </div>

            {/* Preview Section - Modern Box */}
            <div className="hidden lg:flex flex-[0.7] bg-slate-50 p-10 items-center justify-center">
                <div className="w-full max-w-[300px] bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-100">
                    <div className="aspect-square bg-slate-100 relative group overflow-hidden">
                        {formContent.images?.length > 0 ? (
                            <>
                                <img src={formContent.images[currentImgIdx]} className="w-full h-full object-cover animate-in fade-in duration-300" />
                                {formContent.images.length > 1 && (
                                    <div className="absolute inset-0 flex items-center justify-between px-3">
                                        <button onClick={(e) => {e.preventDefault(); setCurrentImgIdx(p => p === 0 ? formContent.images.length-1 : p-1)}} className="w-8 h-8 bg-white/90 rounded-full shadow-lg flex items-center justify-center text-indigo-600 cursor-pointer"><ChevronLeft size={16}/></button>
                                        <button onClick={(e) => {e.preventDefault(); setCurrentImgIdx(p => p === formContent.images.length-1 ? 0 : p+1)}} className="w-8 h-8 bg-white/90 rounded-full shadow-lg flex items-center justify-center text-indigo-600 cursor-pointer"><ChevronRight size={16}/></button>
                                    </div>
                                )}
                                <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md text-white text-[8px] px-3 py-1 rounded-full font-black tracking-widest">{currentImgIdx+1} / {formContent.images.length}</div>
                            </>
                        ) : <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-2"><ImageIcon size={48} strokeWidth={1}/><p className="text-[9px] font-black uppercase tracking-[0.2em]">Visual Preview</p></div>}
                    </div>
                    <div className="p-6 space-y-4 text-left">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-black text-xs uppercase">{filterBrand?.charAt(0)}</div>
                            <p className="text-[10px] font-black uppercase text-slate-900 tracking-tighter">{filterBrand || 'BRAND NAME'}</p>
                        </div>
                        <p className="text-[10px] text-slate-500 leading-relaxed font-medium whitespace-pre-wrap line-clamp-6 italic">"{formContent.caption || 'Naskah caption akan tampil di sini...'}"</p>
                    </div>
                </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Hapus */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-slate-900/95 z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 max-w-xs w-full text-center space-y-6 shadow-2xl">
             <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto animate-bounce"><Trash2 size={32}/></div>
             <div className="space-y-1">
                <p className="font-black text-xs uppercase tracking-widest text-slate-900">Konfirmasi Hapus</p>
                <p className="text-[10px] font-bold text-slate-400">Data ini akan hilang permanen.</p>
             </div>
             <div className="flex gap-2">
                <button onClick={() => setConfirmModal({show:false, target:null})} className="flex-1 py-3 bg-slate-100 rounded-xl font-black text-[10px] uppercase text-slate-500">Batal</button>
                <button onClick={executeDelete} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-red-200">Hapus</button>
             </div>
          </div>
        </div>
      )}

      {/* Modal Brand */}
      {showAddBrandModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-sm p-8 space-y-6 text-center">
            <h2 className="text-sm font-black uppercase tracking-widest text-indigo-600">Bisnis Baru</h2>
            <input required autoFocus placeholder="Nama Bisnis..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-center text-sm outline-none focus:ring-4 focus:ring-indigo-50" value={newBrandName} onChange={e => setNewBrandName(e.target.value)} />
            <div className="flex gap-2">
                <button onClick={() => setShowAddBrandModal(false)} className="flex-1 py-3 bg-slate-100 rounded-xl font-bold text-xs uppercase">Batal</button>
                <button onClick={handleAddBrand} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase">Simpan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
```eof