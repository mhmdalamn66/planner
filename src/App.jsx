import React, { useState, useMemo, useRef, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut,
  signInAnonymously
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  onSnapshot
} from 'firebase/firestore';
import { 
  Calendar as CalendarIcon, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  AlertCircle,
  Briefcase,
  Trash2,
  Pencil,
  X,
  Building2,
  PlusCircle,
  Circle,
  Clock,
  CheckCircle2,
  Link as LinkIcon,
  BookOpen,
  UserCircle,
  LogOut,
  Lock,
  Mail,
  UserCheck,
  LayoutDashboard,
  ExternalLink,
  Smartphone
} from 'lucide-react';

// --- (1) KONFIGURASI FIREBASE ---
// Ganti dengan data asli dari Firebase Console Anda
const firebaseConfig = {
  apiKey: "AIzaSyDYZNnmVlGXniFMhdLVokfdU9AxekfO5o4",
  authDomain: "planner-1-26ef9.firebaseapp.com",
  projectId: "planner-1-26ef9",
  storageBucket: "planner-1-26ef9.firebasestorage.app",
  messagingSenderId: "363655017939",
  appId: "1:363655017939:web:2a6dea062e1d588956ab26",
  measurementId: "G-R4NNE04WY7"
};

// Inisialisasi Firebase
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
  // --- SEMUA HOOK HARUS DI ATAS ---
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [brands, setBrands] = useState([]);
  const [contents, setContents] = useState([]);
  const [sources, setSources] = useState([]);
  const [brandProfiles, setBrandProfiles] = useState({});
  const [view, setView] = useState('calendar');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filterBrand, setFilterBrand] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [showAddBrandModal, setShowAddBrandModal] = useState(false);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ show: false, type: '', target: null });
  const [newBrandName, setNewBrandName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingSourceId, setEditingSourceId] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ description: '', platforms: '', link: '' });
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const fileInputRef = useRef(null);

  const [formContent, setFormContent] = useState({ title: '', brand: '', type: 'Edukasi', date: '', status: 'IDEA', caption: '', images: [] });
  const [sourceForm, setSourceForm] = useState({ url: '', notes: '', brand: '' });

  // Filter Data menggunakan useMemo (Diletakkan SEBELUM return kondisional)
  const filteredContents = useMemo(() => {
    return contents.filter(c => 
      c.brand === filterBrand && 
      (filterType === 'All' || c.type === filterType) && 
      (filterStatus === 'All' || c.status === filterStatus)
    );
  }, [contents, filterBrand, filterType, filterStatus]);

  const filteredSources = useMemo(() => {
    return sources.filter(s => s.brand === filterBrand);
  }, [sources, filterBrand]);

  // Auth Effect
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Data Sync Effect
  useEffect(() => {
    if (!user || !db) return;
    const path = ['artifacts', appId, 'users', user.uid];

    const unsubBrands = onSnapshot(collection(db, ...path, 'brands'), (snap) => {
      const list = snap.docs.map(doc => doc.data().name);
      setBrands(list);
      if (list.length > 0 && !filterBrand) setFilterBrand(list[0]);
    });

    const unsubContents = onSnapshot(collection(db, ...path, 'contents'), (snap) => {
      setContents(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubSources = onSnapshot(collection(db, ...path, 'sources'), (snap) => {
      setSources(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const unsubProfiles = onSnapshot(collection(db, ...path, 'profiles'), (snap) => {
      const map = {}; snap.docs.forEach(doc => { map[doc.id] = doc.data(); });
      setBrandProfiles(map);
    });

    return () => { unsubBrands(); unsubContents(); unsubSources(); unsubProfiles(); };
  }, [user, filterBrand]);

  // Handlers
  const handleAuth = async (e) => {
    e.preventDefault();
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      try { await createUserWithEmailAndPassword(auth, email, password); } catch (err) { setAuthError(err.message); }
    }
  };

  const loginAnonymously = async () => {
    try { await signInAnonymously(auth); } catch (err) { setAuthError(err.message); }
  };

  const openAddModal = (dateStr = null) => {
    if (!filterBrand) { setShowAddBrandModal(true); return; }
    setEditingId(null);
    setFormContent({ title: '', brand: filterBrand, type: 'Edukasi', date: dateStr || new Date().toISOString().split('T')[0], status: 'IDEA', caption: '', images: [] });
    setShowModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const col = collection(db, 'artifacts', appId, 'users', user.uid, 'contents');
    if (editingId) await updateDoc(doc(col, editingId), formContent);
    else await addDoc(col, formContent);
    setShowModal(false);
  };

  // --- RENDERING LOGIC ---

  // 1. Cek Config
  if (firebaseConfig.apiKey === "MASUKKAN_API_KEY_ANDA") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-10 text-center">
        <div className="bg-white p-10 rounded-[3rem] shadow-xl max-w-md">
          <AlertCircle size={64} className="text-red-500 mx-auto mb-6" />
          <h1 className="text-2xl font-black mb-4">API KEY BELUM DIISI</h1>
          <p className="text-slate-500">Silakan masukkan <code className="bg-slate-100 p-1">firebaseConfig</code> asli Anda di file App.jsx.</p>
        </div>
      </div>
    );
  }

  // 2. Loading
  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div></div>;

  // 3. Auth Page
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden">
          <div className="p-10 text-center bg-indigo-600 text-white">
            <CalendarIcon size={48} className="mx-auto mb-4" />
            <h1 className="text-3xl font-black uppercase tracking-tight">Planner Pro</h1>
            <p className="text-indigo-100 mt-2 text-sm font-bold uppercase tracking-widest">Database Aktif</p>
          </div>
          <div className="p-10 space-y-6">
            {authError && <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-100">{authError}</div>}
            <input type="email" placeholder="Email" className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={email} onChange={e => setEmail(e.target.value)} />
            <input type="password" placeholder="Password" className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={password} onChange={e => setPassword(e.target.value)} />
            <button onClick={handleAuth} className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black uppercase hover:bg-indigo-700 transition-all">Masuk / Daftar</button>
            <button onClick={loginAnonymously} className="w-full bg-white border-2 border-slate-100 text-slate-500 py-4 rounded-2xl font-black uppercase text-xs hover:bg-slate-50 transition-all">Masuk sebagai Tamu</button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Main App
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      <header className="bg-white border-b border-slate-200 px-6 py-5 flex flex-col lg:flex-row justify-between items-center gap-4 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-6 text-left">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-lg"><CalendarIcon size={32} /></div>
            <div className="hidden sm:block text-left"><h1 className="text-2xl font-black text-slate-900 leading-none">Planner Pro</h1><p className="text-xs text-slate-400 font-bold mt-1.5">{user.email || 'Guest'}</p></div>
          </div>
          <button onClick={() => setShowBrandDropdown(!showBrandDropdown)} className="flex items-center gap-4 px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-indigo-50 transition-all min-w-[200px]">
            <Building2 size={24} className="text-indigo-600" />
            <div className="text-left"><p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">Bisnis</p><p className="text-base font-bold text-slate-800 flex items-center gap-2 leading-none">{filterBrand || 'Pilih Bisnis'} <ChevronDown size={18} /></p></div>
          </button>
        </div>
        <div className="flex items-center gap-5">
          <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl">
            <button onClick={() => setView('calendar')} className={`px-6 py-2.5 rounded-xl transition-all font-black text-sm ${view === 'calendar' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-500'}`}>Kalender</button>
            <button onClick={() => setView('list')} className={`px-6 py-2.5 rounded-xl transition-all font-black text-sm ${view === 'list' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-500'}`}>Daftar</button>
          </div>
          <button onClick={() => openAddModal()} className="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl flex items-center gap-3 shadow-xl hover:bg-indigo-700 transition-all font-black text-sm uppercase tracking-widest"><Plus size={22} /> Buat Ide</button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-80 bg-white border-r border-slate-200 hidden lg:block p-8 overflow-y-auto">
          <div className="space-y-3">
            <button onClick={() => setView('calendar')} className={`w-full flex items-center gap-4 p-5 rounded-3xl transition-all ${view === 'calendar' || view === 'list' ? 'bg-slate-50 text-indigo-700 font-black' : 'text-slate-500 hover:bg-slate-50 font-bold'}`}><LayoutDashboard size={24} /> SCHEDULE</button>
            <button onClick={() => setView('sourceBank')} className={`w-full flex items-center gap-4 p-5 rounded-3xl transition-all ${view === 'sourceBank' ? 'bg-indigo-600 text-white font-black' : 'text-slate-500 hover:bg-slate-50 font-bold'}`}><BookOpen size={24} /> SOURCE BANK</button>
            <button onClick={() => setView('profile')} className={`w-full flex items-center gap-4 p-5 rounded-3xl transition-all ${view === 'profile' ? 'bg-emerald-600 text-white font-black' : 'text-slate-500 hover:bg-slate-50 font-bold'}`}><UserCircle size={24} /> PROFIL</button>
            <div className="pt-10 border-t"><button onClick={() => signOut(auth)} className="w-full flex items-center gap-4 p-5 text-red-500 font-black hover:bg-red-50 rounded-3xl"><LogOut size={24} /> KELUAR</button></div>
          </div>
        </aside>

        <main className="flex-1 p-6 md:p-10 overflow-y-auto">
          {view === 'calendar' && (
            <div className="bg-white rounded-[3rem] shadow-sm border border-slate-200 overflow-hidden text-left">
              <div className="p-10 flex items-center justify-between border-b bg-slate-50/20 text-left">
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">{selectedDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}</h2>
                <div className="flex gap-3 bg-slate-100 p-2 rounded-2xl">
                  <button onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1))} className="p-3 bg-white hover:text-indigo-600 shadow-sm rounded-xl"><ChevronLeft size={28}/></button>
                  <button onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1))} className="p-3 bg-white hover:text-indigo-600 shadow-sm rounded-xl"><ChevronRight size={28}/></button>
                </div>
              </div>
              <div className="grid grid-cols-7 border-b bg-slate-50/50">{['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(day => (<div key={day} className="py-6 text-center text-sm font-black text-slate-400 uppercase">{day}</div>))}</div>
              <div className="grid grid-cols-7">
                {[...Array(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).getDay())].map((_, i) => (<div key={i} className="h-40 md:h-52 border-b border-r border-slate-100 bg-slate-50/10"></div>))}
                {[...Array(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate())].map((_, i) => {
                  const d = i + 1;
                  const dStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                  const c = filteredContents.find(item => item.date === dStr);
                  return (
                    <div key={d} onClick={() => c && setFormContent(c) || openAddModal(dStr)} className={`h-40 md:h-52 border-b border-r border-slate-100 p-4 transition-all group flex flex-col cursor-pointer ${c ? 'bg-indigo-600 text-white' : 'bg-white hover:bg-indigo-50/30'}`}>
                      <div className="flex justify-between items-start mb-2"><span className={`text-base font-black w-10 h-10 flex items-center justify-center rounded-2xl ${c ? 'bg-white/20' : 'text-slate-400'}`}>{d}</span>{!c && <Plus size={20} className="opacity-0 group-hover:opacity-100 text-indigo-600"/>}</div>
                      {c && <div className="flex-1 flex flex-col justify-between"><h3 className="text-sm font-black line-clamp-3 uppercase tracking-tighter">{c.title}</h3><div className="bg-white/20 text-[10px] px-2 py-1 rounded font-bold self-start">{c.type}</div></div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {view === 'list' && (
            <div className="space-y-4 text-left">
              {filteredContents.length === 0 ? <div className="py-20 text-center font-black text-slate-300">BELUM ADA KONTEN</div> : 
                filteredContents.map(c => (
                  <div key={c.id} className="bg-white p-6 rounded-[2rem] border border-slate-200 flex items-center justify-between hover:shadow-lg transition-all">
                    <div className="text-left"><h3 className="text-xl font-black text-slate-900">{c.title}</h3><p className="text-sm font-bold text-slate-400 uppercase">{c.date} • {c.type}</p></div>
                    <div className="flex items-center gap-4"><div className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-black text-xs">{c.status}</div><button onClick={() => {setEditingId(c.id); setFormContent(c); setShowModal(true);}} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:text-indigo-600"><Pencil size={20}/></button></div>
                  </div>
                ))
              }
            </div>
          )}
        </main>
      </div>

      {/* MODAL TAMBAH */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3.5rem] shadow-2xl w-full max-w-2xl overflow-hidden p-12 text-left animate-in zoom-in">
            <div className="flex justify-between items-center mb-10"><h2 className="text-4xl font-black text-indigo-900 uppercase">Ide Konten</h2><button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-4"><X size={32} /></button></div>
            <form onSubmit={handleFormSubmit} className="space-y-8">
              <div><label className="block text-sm font-black text-slate-400 mb-4 uppercase">Judul</label><input required type="text" className="w-full p-6 bg-slate-50 border border-slate-200 rounded-[2rem] outline-none font-black text-xl" value={formContent.title} onChange={e => setFormContent({...formContent, title: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-8">
                <div><label className="text-sm font-black text-slate-400 mb-4 uppercase block">Tanggal</label><input type="date" className="w-full p-6 bg-slate-50 border border-slate-200 rounded-[2rem] font-black outline-none" value={formContent.date} onChange={e => setFormContent({...formContent, date: e.target.value})} /></div>
                <div><label className="text-sm font-black text-slate-400 mb-4 uppercase block">Pilar</label><select className="w-full p-6 bg-slate-50 border border-slate-200 rounded-[2rem] font-black outline-none appearance-none" value={formContent.type} onChange={e => setFormContent({...formContent, type: e.target.value})}><option>Edukasi</option><option>Promosi</option><option>Entertainment</option></select></div>
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white font-black py-8 rounded-[2.5rem] shadow-2xl uppercase tracking-widest text-xl hover:bg-indigo-700 transition-all">Simpan Rencana</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL BRAND BARU */}
      {showAddBrandModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md p-10 space-y-8 animate-in zoom-in text-center">
            <h2 className="text-2xl font-black text-indigo-900 uppercase">Bisnis Baru</h2>
            <input required autoFocus type="text" placeholder="Nama Bisnis" className="w-full p-6 bg-slate-50 border border-slate-200 rounded-[2rem] outline-none font-black text-xl text-center" value={newBrandName} onChange={e => setNewBrandName(e.target.value)} />
            <div className="flex gap-4"><button onClick={() => setShowAddBrandModal(false)} className="flex-1 py-4 bg-slate-100 rounded-2xl font-bold uppercase text-xs">Batal</button><button onClick={handleAddBrand} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all uppercase">Simpan</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;