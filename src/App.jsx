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

  // Filter Data menggunakan useMemo
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

  // Sync Profile Form saat brand berubah
  useEffect(() => {
    if (brandProfiles[filterBrand]) {
      setProfileForm(brandProfiles[filterBrand]);
    } else {
      setProfileForm({ description: '', platforms: '', link: '' });
    }
  }, [filterBrand, brandProfiles]);

  // --- HANDLERS ---
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch {
      try { await createUserWithEmailAndPassword(auth, email, password); } catch (err) { setAuthError(err.message); }
    }
  };

  const loginAnonymously = async () => {
    try { await signInAnonymously(auth); } catch (err) { setAuthError(err.message); }
  };

  const handleAddBrand = async (e) => {
    e.preventDefault();
    const name = newBrandName.trim();
    if (name && !brands.includes(name)) {
      try {
        const path = ['artifacts', appId, 'users', user.uid];
        await setDoc(doc(db, ...path, 'brands', name), { name });
        await setDoc(doc(db, ...path, 'profiles', name), { description: '', platforms: '', link: '' });
        setFilterBrand(name);
        setNewBrandName('');
        setShowAddBrandModal(false);
      } catch (err) { console.error(err); }
    }
  };

  const handleDeleteBrand = (e, brandName) => {
    e.stopPropagation();
    setConfirmModal({ show: true, type: 'brand', target: brandName });
  };

  const executeDelete = async () => {
    if (!user || !confirmModal.target) return;
    try {
      const path = ['artifacts', appId, 'users', user.uid];
      if (confirmModal.type === 'brand') {
        await deleteDoc(doc(db, ...path, 'brands', confirmModal.target));
        await deleteDoc(doc(db, ...path, 'profiles', confirmModal.target));
        if (filterBrand === confirmModal.target) setFilterBrand(brands.find(b => b !== confirmModal.target) || '');
      } else if (confirmModal.type === 'content') {
        await deleteDoc(doc(db, ...path, 'contents', confirmModal.target));
      }
      setConfirmModal({ show: false, type: '', target: null });
    } catch (err) { console.error(err); }
  };

  const openAddModal = (dateStr = null) => {
    if (!filterBrand) { setShowAddBrandModal(true); return; }
    setEditingId(null);
    setFormContent({ title: '', brand: filterBrand, type: 'Edukasi', date: dateStr || new Date().toISOString().split('T')[0], status: 'IDEA', caption: '', images: [] });
    setShowModal(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    const col = collection(db, 'artifacts', appId, 'users', user.uid, 'contents');
    try {
      if (editingId) await updateDoc(doc(col, editingId), formContent);
      else await addDoc(col, formContent);
      setShowModal(false);
    } catch (err) { console.error(err); }
  };

  const updateStatus = async (id, newStatus) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'contents', id), { status: newStatus });
    } catch (err) { console.error(err); }
  };

  const handleSaveProfile = async () => {
    if (!user || !filterBrand) return;
    try {
      await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profiles', filterBrand), profileForm);
      setIsEditingProfile(false);
    } catch (err) { console.error(err); }
  };

  // --- RENDERING LOGIC ---

  if (firebaseConfig.apiKey === "MASUKKAN_API_KEY_ANDA") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-10 text-center">
        <div className="bg-white p-10 rounded-[3rem] shadow-xl max-w-md border-4 border-red-100">
          <AlertCircle size={64} className="text-red-500 mx-auto mb-6" />
          <h1 className="text-2xl font-black mb-4 uppercase">API Key Belum Diisi</h1>
          <p className="text-slate-500 font-medium">Silakan masukkan <code className="bg-slate-100 p-1 rounded">firebaseConfig</code> asli Anda di file App.jsx.</p>
        </div>
      </div>
    );
  }

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div></div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in">
          <div className="p-10 text-center bg-indigo-600 text-white">
            <CalendarIcon size={48} className="mx-auto mb-4" />
            <h1 className="text-3xl font-black uppercase tracking-tight">Planner Pro</h1>
            <p className="text-indigo-100 mt-2 text-sm font-bold uppercase tracking-widest">Database Aktif</p>
          </div>
          <div className="p-10 space-y-6">
            {authError && <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-100">{authError}</div>}
            <input type="email" placeholder="Email" className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold focus:ring-4 focus:ring-indigo-50" value={email} onChange={e => setEmail(e.target.value)} />
            <input type="password" placeholder="Password" className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold focus:ring-4 focus:ring-indigo-50" value={password} onChange={e => setPassword(e.target.value)} />
            <button onClick={handleAuth} className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black uppercase hover:bg-indigo-700 transition-all active:scale-95 shadow-xl shadow-indigo-100 cursor-pointer">Masuk / Daftar</button>
            <button onClick={loginAnonymously} className="w-full bg-white border-2 border-slate-100 text-slate-500 py-4 rounded-2xl font-black uppercase text-xs hover:bg-slate-50 transition-all cursor-pointer">Masuk sebagai Tamu</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      <header className="bg-white border-b border-slate-200 px-6 py-5 flex flex-col lg:flex-row justify-between items-center gap-4 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-6 text-left">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-lg"><CalendarIcon size={32} /></div>
            <div className="hidden sm:block text-left"><h1 className="text-2xl font-black text-slate-900 leading-none uppercase tracking-tighter">Planner Pro</h1><p className="text-xs text-slate-400 font-bold mt-1.5 truncate max-w-[150px]">{user.email || 'Guest Account'}</p></div>
          </div>
          
          <div className="relative">
            <button onClick={() => setShowBrandDropdown(!showBrandDropdown)} className="flex items-center gap-4 px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-indigo-50 hover:border-indigo-200 transition-all min-w-[200px] group cursor-pointer">
              <Building2 size={24} className="text-indigo-600 group-hover:scale-110 transition-transform" />
              <div className="text-left"><p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">Pilih Bisnis</p><p className="text-base font-bold text-slate-800 flex items-center gap-2 leading-none">{filterBrand || 'Belum Ada'} <ChevronDown size={18} className={`transition-transform ${showBrandDropdown ? 'rotate-180' : ''}`} /></p></div>
            </button>
            
            {showBrandDropdown && (
              <div className="absolute top-full left-0 mt-3 w-full min-w-[280px] bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden z-50 animate-in slide-in-from-top-2">
                <div className="max-h-72 overflow-y-auto">
                  <div className="p-3 bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-b">Daftar Bisnis</div>
                  {brands.map((brand) => (
                    <div key={brand} onClick={() => { setFilterBrand(brand); setShowBrandDropdown(false); }} className={`p-4 cursor-pointer transition-all border-b border-slate-50 flex justify-between items-center hover:bg-indigo-50 ${filterBrand === brand ? 'bg-indigo-50 text-indigo-700 font-black' : 'text-slate-700'}`}>
                      <span className="truncate flex-1">{brand}</span>
                      <button onClick={(e) => handleDeleteBrand(e, brand)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-white rounded-lg transition-all cursor-pointer"><Trash2 size={16}/></button>
                    </div>
                  ))}
                </div>
                <button onClick={() => { setShowAddBrandModal(true); setShowBrandDropdown(false); }} className="w-full text-left p-5 text-sm font-black text-indigo-600 bg-indigo-50/50 flex items-center gap-3 hover:bg-indigo-100 transition-colors cursor-pointer"><PlusCircle size={20} /> Tambah Bisnis Baru</button>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-5">
          <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl">
            <button onClick={() => setView('calendar')} className={`px-6 py-2.5 rounded-xl transition-all font-black text-sm cursor-pointer ${view === 'calendar' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}>Kalender</button>
            <button onClick={() => setView('list')} className={`px-6 py-2.5 rounded-xl transition-all font-black text-sm cursor-pointer ${view === 'list' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}>Daftar</button>
          </div>
          <button onClick={() => openAddModal()} className="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl flex items-center gap-3 shadow-xl hover:bg-indigo-700 hover:-translate-y-0.5 active:scale-95 transition-all font-black text-sm uppercase tracking-widest cursor-pointer"><Plus size={22} strokeWidth={3} /> Buat Ide</button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-80 bg-white border-r border-slate-200 hidden lg:block p-8 overflow-y-auto">
          <div className="space-y-3">
            <button onClick={() => setView('calendar')} className={`w-full flex items-center gap-4 p-5 rounded-3xl transition-all cursor-pointer ${view === 'calendar' || view === 'list' ? 'bg-slate-50 text-indigo-700 shadow-sm border border-slate-100 font-black' : 'text-slate-500 hover:bg-slate-50 font-bold'}`}><LayoutDashboard size={24} /> SCHEDULE</button>
            <button onClick={() => setView('sourceBank')} className={`w-full flex items-center gap-4 p-5 rounded-3xl transition-all cursor-pointer ${view === 'sourceBank' ? 'bg-indigo-600 text-white shadow-lg font-black' : 'text-slate-500 hover:bg-slate-50 font-bold'}`}><BookOpen size={24} /> SOURCE BANK</button>
            <button onClick={() => setView('profile')} className={`w-full flex items-center gap-4 p-5 rounded-3xl transition-all cursor-pointer ${view === 'profile' ? 'bg-emerald-600 text-white shadow-lg font-black' : 'text-slate-500 hover:bg-slate-50 font-bold'}`}><UserCircle size={24} /> PROFIL</button>
            <div className="pt-10 border-t mt-10"><button onClick={() => signOut(auth)} className="w-full flex items-center gap-4 p-5 text-red-500 font-black hover:bg-red-50 rounded-3xl transition-colors cursor-pointer"><LogOut size={24} /> KELUAR</button></div>
          </div>
        </aside>

        <main className="flex-1 p-6 md:p-10 overflow-y-auto text-left">
          {view === 'calendar' && (
            <div className="bg-white rounded-[3rem] shadow-sm border border-slate-200 overflow-hidden animate-in fade-in duration-500">
              <div className="p-10 flex items-center justify-between border-b bg-slate-50/20">
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">{selectedDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}</h2>
                <div className="flex gap-3 bg-slate-100 p-2 rounded-2xl">
                  <button onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1))} className="p-3 bg-white hover:text-indigo-600 shadow-sm rounded-xl transition-all cursor-pointer"><ChevronLeft size={28}/></button>
                  <button onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1))} className="p-3 bg-white hover:text-indigo-600 shadow-sm rounded-xl transition-all cursor-pointer"><ChevronRight size={28}/></button>
                </div>
              </div>
              <div className="grid grid-cols-7 border-b bg-slate-50/50">{['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(day => (<div key={day} className="py-6 text-center text-sm font-black text-slate-400 uppercase tracking-widest">{day}</div>))}</div>
              <div className="grid grid-cols-7">
                {[...Array(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).getDay())].map((_, i) => (<div key={i} className="h-40 md:h-52 border-b border-r border-slate-100 bg-slate-50/10"></div>))}
                {[...Array(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate())].map((_, i) => {
                  const d = i + 1;
                  const dStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                  const c = filteredContents.find(item => item.date === dStr);
                  return (
                    <div key={d} onClick={() => c ? (setEditingId(c.id), setFormContent(c), setShowModal(true)) : openAddModal(dStr)} className={`h-40 md:h-52 border-b border-r border-slate-100 p-4 transition-all group flex flex-col cursor-pointer ${c ? 'bg-indigo-600 text-white shadow-inner' : 'bg-white hover:bg-indigo-50/40'}`}>
                      <div className="flex justify-between items-start mb-2"><span className={`text-base font-black w-10 h-10 flex items-center justify-center rounded-2xl transition-all ${c ? 'bg-white/20' : 'text-slate-400 group-hover:text-indigo-600'}`}>{d}</span>{!c && <Plus size={20} className="opacity-0 group-hover:opacity-100 text-indigo-600 transition-all group-hover:scale-125" strokeWidth={3}/>}</div>
                      {c && <div className="flex-1 flex flex-col justify-between animate-in zoom-in"><h3 className="text-sm font-black line-clamp-3 uppercase tracking-tighter leading-tight">{c.title}</h3><div className="bg-white/20 text-[10px] px-2 py-1 rounded font-black self-start uppercase tracking-widest">{c.type}</div></div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {view === 'list' && (
            <div className="space-y-4 animate-in fade-in">
              {filteredContents.length === 0 ? <div className="py-20 text-center font-black text-slate-300 uppercase tracking-widest">Belum Ada Rencana Konten</div> : 
                filteredContents.sort((a,b) => new Date(a.date) - new Date(b.date)).map(c => (
                  <div key={c.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 hover:shadow-xl hover:border-indigo-200 transition-all group">
                    <div className="text-left flex-1"><h3 className="text-xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors uppercase">{c.title}</h3><p className="text-sm font-bold text-slate-400 uppercase mt-2 tracking-widest">{c.date} • {c.type}</p></div>
                    <div className="flex items-center gap-5">
                      <select value={c.status} onChange={(e) => updateStatus(c.id, e.target.value)} className={`text-xs font-black px-6 py-2 rounded-xl border-2 outline-none cursor-pointer transition-all ${c.status === 'IDEA' ? 'border-blue-200 text-blue-600' : c.status === 'READY' ? 'border-orange-200 text-orange-600' : 'border-green-200 text-green-600'}`}>
                        <option value="IDEA">IDEA</option>
                        <option value="READY">READY</option>
                        <option value="POSTED">POSTED</option>
                      </select>
                      <button onClick={() => {setEditingId(c.id); setFormContent(c); setShowModal(true);}} className="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:text-indigo-600 hover:bg-white border border-transparent hover:border-indigo-100 transition-all cursor-pointer"><Pencil size={24}/></button>
                      <button onClick={() => setConfirmModal({ show: true, type: 'content', target: c.id })} className="p-4 bg-slate-50 text-slate-400 rounded-2xl hover:text-red-500 hover:bg-white border border-transparent hover:border-red-100 transition-all cursor-pointer"><Trash2 size={24}/></button>
                    </div>
                  </div>
                ))
              }
            </div>
          )}

          {view === 'profile' && (
            <div className="animate-in slide-in-from-right-4 max-w-4xl mx-auto">
               <div className="flex justify-between items-center mb-10">
                <div><h2 className="text-4xl font-black text-slate-900 flex items-center gap-4"><div className="bg-emerald-600 p-3 rounded-2xl text-white shadow-lg"><UserCircle size={32} /></div> Profil {filterBrand}</h2><p className="text-slate-500 font-bold uppercase text-sm tracking-widest mt-4 opacity-60">Identity & Links</p></div>
                <button onClick={() => setIsEditingProfile(!isEditingProfile)} className={`flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-sm uppercase transition-all cursor-pointer ${isEditingProfile ? 'bg-slate-200 text-slate-600' : 'bg-emerald-600 text-white shadow-xl hover:bg-emerald-700'}`}>{isEditingProfile ? 'Batal' : 'Edit Profil'}</button>
              </div>
              {isEditingProfile ? (
                <div className="bg-white rounded-[3rem] p-10 shadow-xl space-y-8 animate-in zoom-in duration-300">
                  <div className="space-y-2"><label className="text-xs font-black text-slate-400 uppercase block mb-2">Deskripsi Brand</label><textarea rows="4" className="w-full p-6 bg-slate-50 border rounded-[2rem] outline-none font-medium text-lg resize-none shadow-inner" value={profileForm.description} onChange={e => setProfileForm({...profileForm, description: e.target.value})} /></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div><label className="text-xs font-black text-slate-400 uppercase block mb-2">Platform Utama</label><input type="text" className="w-full p-5 bg-slate-50 border rounded-2xl outline-none font-bold text-lg shadow-inner" value={profileForm.platforms} onChange={e => setProfileForm({...profileForm, platforms: e.target.value})} /></div>
                    <div><label className="text-xs font-black text-slate-400 uppercase block mb-2">Link Brand</label><input type="url" className="w-full p-5 bg-slate-50 border rounded-2xl outline-none font-bold text-lg text-indigo-600 shadow-inner" value={profileForm.link} onChange={e => setProfileForm({...profileForm, link: e.target.value})} /></div>
                  </div>
                  <button onClick={handleSaveProfile} className="w-full bg-emerald-600 text-white font-black py-6 rounded-[2.5rem] shadow-2xl flex items-center justify-center gap-3 text-lg cursor-pointer hover:bg-emerald-700 transition-all uppercase tracking-widest">Simpan Profil</button>
                </div>
              ) : (
                <div className="space-y-8 animate-in zoom-in duration-300">
                  <div className="bg-white rounded-[3rem] p-10 shadow-sm border relative overflow-hidden group"><div className="absolute right-0 top-0 p-8 text-slate-100 group-hover:text-emerald-50 transition-colors"><Building2 size={120}/></div><div className="relative z-10"><h3 className="text-xs font-black text-slate-400 uppercase mb-4 tracking-widest">Nama Brand</h3><p className="text-4xl font-black text-slate-900 leading-tight">{filterBrand}</p></div></div>
                  <div className="bg-white rounded-[3rem] p-10 shadow-sm border"><h3 className="text-xs font-black text-slate-400 uppercase mb-6 tracking-widest">Deskripsi Brand</h3><p className="text-xl font-medium text-slate-700 italic italic">"{brandProfiles[filterBrand]?.description || 'Belum ada deskripsi...'}"</p></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-indigo-600 rounded-[3rem] p-10 text-white relative shadow-xl overflow-hidden group"><Smartphone className="absolute -right-6 -bottom-6 opacity-10 w-32 h-32" /><h3 className="text-xs font-black text-indigo-200 uppercase mb-6 tracking-widest">Platform</h3><p className="text-2xl font-black">{brandProfiles[filterBrand]?.platforms || '-'}</p></div>
                    <div className="bg-white rounded-[3rem] p-10 shadow-sm border group"><h3 className="text-xs font-black text-slate-400 uppercase mb-6 tracking-widest flex items-center gap-2"><LinkIcon size={16}/> Link Utama</h3>{brandProfiles[filterBrand]?.link ? <a href={brandProfiles[filterBrand].link} target="_blank" rel="noopener noreferrer" className="text-xl font-black text-indigo-600 hover:underline break-all">Tautan Brand <ExternalLink className="inline ml-2" size={20} /></a> : <p className="text-xl font-black text-slate-300">-</p>}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {view === 'sourceBank' && (
            <div className="animate-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-3xl font-black text-slate-900 flex items-center gap-4 mb-10"><div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg"><BookOpen size={28} /></div> Source Bank</h2>
              {filteredSources.length === 0 ? (<div className="text-center py-36 bg-white rounded-[3rem] border-4 border-dashed border-slate-100 shadow-inner"><LinkIcon size={72} className="mx-auto text-slate-100 mb-6" /><p className="text-xl text-slate-400 font-black uppercase tracking-widest">Belum ada referensi</p></div>) : (
                <div className="bg-white rounded-[2.5rem] border overflow-hidden shadow-sm">
                   {filteredSources.map(s => (<div key={s.id} className="p-6 border-b flex justify-between items-center hover:bg-indigo-50/30 transition-all"><div className="flex-1 pr-10 text-left"><a href={s.url} target="_blank" className="text-sm font-black text-indigo-600 truncate block mb-1 hover:underline">{s.url}</a><p className="text-sm text-slate-500 italic italic">"{s.notes || '-'}"</p></div><div className="flex gap-2"><button onClick={() => {setEditingSourceId(s.id); setSourceForm({...s}); setShowSourceModal(true);}} className="p-2.5 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-all cursor-pointer"><Pencil size={18}/></button><button onClick={() => setConfirmModal({ show: true, type: 'source', target: s.id })} className="p-2.5 bg-slate-50 text-slate-400 hover:text-red-500 rounded-xl transition-all cursor-pointer"><Trash2 size={18}/></button></div></div>))}
                </div>
              )}
           </div>
          )}
        </main>
      </div>

      {/* MODAL TAMBAH/EDIT */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3.5rem] shadow-2xl w-full max-w-2xl overflow-hidden p-12 text-left animate-in zoom-in duration-300">
            <div className="flex justify-between items-center mb-10"><h2 className="text-4xl font-black text-indigo-900 uppercase tracking-tight">{editingId ? 'Edit Ide' : 'Ide Baru'}</h2><button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-4 transition-colors cursor-pointer"><X size={32} /></button></div>
            <form onSubmit={handleFormSubmit} className="space-y-8">
              <div className="bg-indigo-50 p-4 rounded-2xl flex items-center gap-3"><Building2 size={16} className="text-indigo-600"/><p className="text-xs font-black text-indigo-900 uppercase tracking-widest">{filterBrand}</p></div>
              <div><label className="block text-xs font-black text-slate-400 mb-4 uppercase tracking-widest">Judul Konten</label><input required type="text" className="w-full p-6 bg-slate-50 border border-slate-200 rounded-[2rem] outline-none font-black text-xl shadow-inner focus:ring-4 focus:ring-indigo-50 transition-all" value={formContent.title} onChange={e => setFormContent({...formContent, title: e.target.value})} /></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div><label className="text-xs font-black text-slate-400 mb-4 uppercase block tracking-widest">Tanggal</label><input type="date" className="w-full p-6 bg-slate-50 border border-slate-200 rounded-[2rem] font-black text-lg outline-none shadow-inner" value={formContent.date} onChange={e => setFormContent({...formContent, date: e.target.value})} /></div>
                <div><label className="text-xs font-black text-slate-400 mb-4 uppercase block tracking-widest">Pilar</label><select className="w-full p-6 bg-slate-50 border border-slate-200 rounded-[2rem] font-black text-lg outline-none appearance-none cursor-pointer" value={formContent.type} onChange={e => setFormContent({...formContent, type: e.target.value})}><option>Edukasi</option><option>Promosi</option><option>Entertainment</option><option>Testimoni</option><option>Behind the Scene</option></select></div>
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white font-black py-8 rounded-[2.5rem] shadow-2xl uppercase tracking-widest text-xl hover:bg-indigo-700 hover:scale-[1.02] active:scale-95 transition-all cursor-pointer">Simpan Perubahan</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] p-10 max-w-sm w-full shadow-2xl animate-in zoom-in text-center">
            <div className="w-20 h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-8 animate-bounce"><Trash2 size={40} /></div>
            <h3 className="text-2xl font-black uppercase tracking-tight mb-3">Hapus Data?</h3>
            <p className="text-slate-500 font-medium text-sm mb-10 leading-relaxed">Tindakan ini tidak bisa dibatalkan. Apakah Anda yakin ingin melanjutkan?</p>
            <div className="flex gap-4"><button onClick={() => setConfirmModal({ show: false, type: '', target: null })} className="flex-1 py-5 bg-slate-100 rounded-2xl font-black uppercase text-xs tracking-widest transition-colors hover:bg-slate-200 cursor-pointer">Batal</button><button onClick={executeDelete} className="flex-1 py-5 bg-red-600 text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-red-100 hover:bg-red-700 transition-all cursor-pointer">Hapus Permanen</button></div>
          </div>
        </div>
      )}

      {/* MODAL BISNIS BARU */}
      {showAddBrandModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md p-12 space-y-10 animate-in zoom-in text-center">
            <h2 className="text-3xl font-black text-indigo-900 uppercase tracking-tight">Bisnis Baru</h2>
            <input required autoFocus type="text" placeholder="Masukkan Nama Bisnis" className="w-full p-6 bg-slate-50 border border-slate-200 rounded-[2rem] outline-none font-black text-xl text-center shadow-inner focus:ring-4 focus:ring-indigo-50 transition-all" value={newBrandName} onChange={e => setNewBrandName(e.target.value)} />
            <div className="flex gap-4"><button onClick={() => setShowAddBrandModal(false)} className="flex-1 py-5 bg-slate-100 rounded-2xl font-black uppercase text-xs tracking-widest cursor-pointer">Batal</button><button onClick={handleAddBrand} className="flex-1 py-5 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all uppercase tracking-widest shadow-lg cursor-pointer">Simpan</button></div>
          </div>
        </div>
      )}

      {/* MODAL SOURCE BARU */}
      {showSourceModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-lg z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-xl p-10 space-y-8 animate-in zoom-in duration-300">
            <h2 className="text-2xl font-black text-indigo-900 uppercase tracking-tight">{editingSourceId ? 'Edit' : 'Tambah'} Source</h2>
            <div><label className="text-[10px] font-black text-slate-400 uppercase block mb-2 tracking-widest">Tautan URL</label><input required autoFocus type="url" placeholder="https://..." className="w-full p-5 bg-slate-50 border rounded-2xl outline-none font-bold shadow-inner" value={sourceForm.url} onChange={e => setSourceForm({ ...sourceForm, url: e.target.value })} /></div>
            <div><label className="text-[10px] font-black text-slate-400 uppercase block mb-2 tracking-widest">Catatan Singkat</label><textarea rows="4" className="w-full p-6 bg-slate-50 border rounded-[2rem] outline-none font-medium resize-none shadow-inner" value={sourceForm.notes} onChange={e => setSourceForm({ ...sourceForm, notes: e.target.value })}></textarea></div>
            <button onClick={handleSourceSubmit} className="w-full bg-indigo-600 text-white font-black py-6 rounded-[2rem] uppercase tracking-widest transition-all hover:bg-indigo-700 cursor-pointer shadow-lg">Simpan ke Bank Ide</button>
            <button onClick={() => setShowSourceModal(false)} className="w-full py-4 text-slate-400 font-bold uppercase text-xs cursor-pointer">Batal</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;