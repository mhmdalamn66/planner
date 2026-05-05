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
  List, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  AlertCircle,
  Hash,
  Briefcase,
  Smartphone, 
  Trash2,
  Pencil,
  X,
  Upload,
  Image as ImageIcon,
  Building2,
  RotateCcw,
  PlusCircle,
  Circle,
  Clock,
  CheckCircle2,
  Link as LinkIcon,
  BookOpen,
  ExternalLink,
  LayoutDashboard,
  UserCircle,
  Save,
  LogOut,
  Lock,
  Mail,
  UserCheck
} from 'lucide-react';

// --- KONFIGURASI FIREBASE ANDA ---
// GANTI DENGAN DATA ASLI DARI FIREBASE CONSOLE ANDA
const firebaseConfig = {
  apiKey: "AIzaSyDYZNnmVlGXniFMhdLVokfdU9AxekfO5o4",
  authDomain: "planner-1-26ef9.firebaseapp.com",
  projectId: "planner-1-26ef9",
  storageBucket: "planner-1-26ef9.firebasestorage.app",
  messagingSenderId: "363655017939",
  appId: "1:363655017939:web:2a6dea062e1d588956ab26",
  measurementId: "G-R4NNE04WY7"
};

// Inisialisasi
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'planner-pro-v1';

// Mapping warna untuk kategori konten
const typeBadgeColorMap = {
  'Edukasi': 'bg-blue-100 text-blue-700 border-blue-200',
  'Promosi': 'bg-purple-100 text-purple-700 border-purple-200',
  'Entertainment': 'bg-pink-100 text-pink-700 border-pink-200',
  'Testimoni': 'bg-amber-100 text-amber-700 border-amber-200',
  'Behind the Scene': 'bg-slate-100 text-slate-700 border-slate-200'
};

const App = () => {
  // --- AUTH STATES ---
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // --- DATA STATES ---
  const [brands, setBrands] = useState([]);
  const [contents, setContents] = useState([]);
  const [sources, setSources] = useState([]);
  const [brandProfiles, setBrandProfiles] = useState({});
  
  // --- UI STATES ---
  const [view, setView] = useState('calendar');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filterBrand, setFilterBrand] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  
  const [showModal, setShowModal] = useState(false);
  const [showAddBrandModal, setShowAddBrandModal] = useState(false);
  const [showEditBrandModal, setShowEditBrandModal] = useState(false);
  const [showSourceModal, setShowSourceModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState({ show: false, type: '', target: null });
  
  const [newBrandName, setNewBrandName] = useState('');
  const [editingBrandInfo, setEditingBrandInfo] = useState({ oldName: '', newName: '' });
  const [editingId, setEditingId] = useState(null);
  const [editingSourceId, setEditingSourceId] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ description: '', platforms: '', link: '' });
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);

  const fileInputRef = useRef(null);
  const brandDropdownRef = useRef(null);

  const initialFormState = { title: '', brand: '', type: 'Edukasi', date: '', status: 'IDEA', caption: '', images: [] };
  const [formContent, setFormContent] = useState(initialFormState);
  const [sourceForm, setSourceForm] = useState({ url: '', notes: '', brand: '' });

  // 1. Pantau Status Auth
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // 2. Sinkronisasi Data Real-time
  useEffect(() => {
    if (!user) return;
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

  // Sync Form Profil
  useEffect(() => {
    if (brandProfiles[filterBrand]) {
      setProfileForm(brandProfiles[filterBrand]);
    } else {
      setProfileForm({ description: '', platforms: '', link: '' });
    }
    setIsEditingProfile(false);
  }, [filterBrand, view, brandProfiles]);

  // --- HANDLERS ---

  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      try {
        await createUserWithEmailAndPassword(auth, email, password);
      } catch (err2) {
        setAuthError(err2.message);
      }
    }
  };

  const loginAnonymously = async () => {
    try { await signInAnonymously(auth); } catch (err) { setAuthError(err.message); }
  };

  const handleLogout = () => {
    signOut(auth);
    setFilterBrand('');
  };

  const handlePrevMonth = () => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1));
  const handleNextMonth = () => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1));

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

  const handleUpdateBrand = async (e) => {
    e.preventDefault();
    const { oldName, newName } = editingBrandInfo;
    const trimmed = newName.trim();
    if (trimmed && oldName !== trimmed) {
      try {
        const path = ['artifacts', appId, 'users', user.uid];
        await setDoc(doc(db, ...path, 'brands', trimmed), { name: trimmed });
        await deleteDoc(doc(db, ...path, 'brands', oldName));
        const oldProf = brandProfiles[oldName] || { description: '', platforms: '', link: '' };
        await setDoc(doc(db, ...path, 'profiles', trimmed), oldProf);
        await deleteDoc(doc(db, ...path, 'profiles', oldName));
        if (filterBrand === oldName) setFilterBrand(trimmed);
        setShowEditBrandModal(false);
      } catch (err) { console.error(err); }
    }
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
      } else if (confirmModal.type === 'source') {
        await deleteDoc(doc(db, ...path, 'sources', confirmModal.target));
      }
      setConfirmModal({ show: false, type: '', target: null });
    } catch (err) { console.error(err); }
  };

  const openAddModal = (dateStr = null) => {
    if (!filterBrand) {
      setShowAddBrandModal(true);
      return;
    }
    setEditingId(null);
    setFormContent({ 
      ...initialFormState, 
      brand: filterBrand, 
      date: dateStr || new Date().toISOString().split('T')[0] 
    });
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
    const data = { ...formContent, brand: filterBrand };
    try {
      const col = collection(db, 'artifacts', appId, 'users', user.uid, 'contents');
      if (editingId) await updateDoc(doc(col, editingId), data);
      else await addDoc(col, data);
      setShowModal(false);
    } catch (err) { console.error(err); }
  };

  const handleSourceSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    const data = { ...sourceForm, brand: filterBrand, date: new Date().toISOString().split('T')[0] };
    try {
      const col = collection(db, 'artifacts', appId, 'users', user.uid, 'sources');
      if (editingSourceId) await updateDoc(doc(col, editingSourceId), data);
      else await addDoc(col, data);
      setShowSourceModal(false);
    } catch (err) { console.error(err); }
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => setFormContent(prev => ({ ...prev, images: [...prev.images, reader.result] }));
      reader.readAsDataURL(file);
    });
  };

  const getFullBlockStatusClass = (status) => {
    switch (status) {
      case 'IDEA': return 'bg-blue-500 text-white hover:bg-blue-600';
      case 'READY': return 'bg-orange-500 text-white hover:bg-orange-600';
      case 'POSTED': return 'bg-green-700 text-white hover:bg-green-800';
      default: return 'bg-white text-slate-800';
    }
  };

  const getStatusIcon = (status, size = 12) => {
    switch (status) {
      case 'IDEA': return <Circle size={size} />;
      case 'READY': return <Clock size={size} />;
      case 'POSTED': return <CheckCircle2 size={size} />;
      default: return null;
    }
  };

  const Dropdown = ({ label, value, onChange, options, small = false }) => (
    <div className="relative w-full text-left">
      {label && <label className="block text-sm font-black text-slate-400 mb-2 uppercase tracking-widest">{label}</label>}
      <select className={`w-full ${small ? 'p-3 text-sm' : 'p-4 text-base'} bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold appearance-none cursor-pointer focus:ring-4 focus:ring-indigo-100 transition-all`} value={value} onChange={onChange}>
        {options.map((opt, idx) => (<option key={idx} value={typeof opt === 'object' ? opt.value : opt}>{typeof opt === 'object' ? opt.label : opt}</option>))}
      </select>
      <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 mt-3"><ChevronDown size={18} /></div>
    </div>
  );

  // --- RENDER ---
  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent"></div></div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in">
          <div className="p-10 text-center bg-indigo-600 text-white">
            <CalendarIcon size={48} className="mx-auto mb-4" />
            <h1 className="text-3xl font-black uppercase tracking-tight">Planner Pro</h1>
            <p className="text-indigo-100 mt-2 text-sm">Versi Produksi Online.</p>
          </div>
          <div className="p-10 space-y-6">
            {authError && <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-xs font-bold border border-red-100">{authError}</div>}
            <div className="space-y-4">
              <input type="email" placeholder="Email" className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={email} onChange={e => setEmail(e.target.value)} />
              <input type="password" placeholder="Password" className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <button onClick={handleAuth} className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black uppercase hover:bg-indigo-700 transition-all active:scale-95">Masuk / Daftar</button>
            <button onClick={loginAnonymously} className="w-full bg-slate-50 border border-slate-200 text-slate-500 py-4 rounded-2xl font-black uppercase text-xs hover:bg-slate-100 transition-all">Masuk sebagai Tamu</button>
          </div>
        </div>
      </div>
    );
  }

  const filteredContents = useMemo(() => contents.filter(c => c.brand === filterBrand && (filterType === 'All' || c.type === filterType) && (filterStatus === 'All' || c.status === filterStatus)), [contents, filterBrand, filterType, filterStatus]);
  const filteredSources = useMemo(() => sources.filter(s => s.brand === filterBrand), [sources, filterBrand]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-5 flex flex-col lg:flex-row justify-between items-center gap-4 sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-lg"><CalendarIcon size={32} /></div>
            <div className="hidden sm:block"><h1 className="text-2xl font-black tracking-tight text-slate-900 leading-none">Planner Pro</h1><p className="text-xs text-slate-400 font-bold mt-1.5 truncate max-w-[150px]">{user.isAnonymous ? 'Guest Account' : user.email}</p></div>
          </div>
          <div className="relative">
            <button onClick={() => setShowBrandDropdown(!showBrandDropdown)} className="flex items-center gap-4 px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl hover:bg-indigo-50 transition-all min-w-[200px]">
              <Building2 size={24} className="text-indigo-600" />
              <div className="text-left"><p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">Bisnis</p><p className="text-base font-bold text-slate-800 flex items-center gap-2 leading-none">{filterBrand || 'Pilih Bisnis'} <ChevronDown size={18} /></p></div>
            </button>
            {showBrandDropdown && (
              <div className="absolute top-full left-0 mt-3 w-full min-w-[280px] bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden z-30">
                <div className="max-h-72 overflow-y-auto">
                  <div className="p-3 bg-slate-50 text-[10px] font-black text-slate-400 uppercase border-b">Daftar Bisnis</div>
                  {brands.map((brand) => (
                    <div key={brand} onClick={() => { setFilterBrand(brand); setShowBrandDropdown(false); }} className={`p-4 cursor-pointer transition-all border-b border-slate-50 flex justify-between items-center hover:bg-slate-50 ${filterBrand === brand ? 'bg-indigo-50/50 text-indigo-700 font-black' : 'text-slate-700'}`}>
                      <span className="truncate flex-1">{brand}</span>
                      <button onClick={(e) => { e.stopPropagation(); setConfirmModal({show: true, type: 'brand', target: brand}); setShowBrandDropdown(false); }} className="p-2 text-slate-300 hover:text-red-500 hover:bg-white rounded-lg transition-colors"><Trash2 size={16}/></button>
                    </div>
                  ))}
                </div>
                <button onClick={() => { setShowAddBrandModal(true); setShowBrandDropdown(false); }} className="w-full text-left p-5 text-sm font-black text-indigo-600 bg-indigo-50/30 flex items-center gap-3 hover:bg-indigo-100 transition-colors"><PlusCircle size={20} /> Tambah Bisnis</button>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-5">
          <div className="flex items-center bg-slate-100 p-1.5 rounded-2xl">
            <button onClick={() => setView('calendar')} className={`px-6 py-2.5 rounded-xl transition-all font-black text-sm ${view === 'calendar' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}>Kalender</button>
            <button onClick={() => setView('list')} className={`px-6 py-2.5 rounded-xl transition-all font-black text-sm ${view === 'list' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-500 hover:text-slate-800'}`}>Daftar</button>
          </div>
          <button onClick={() => openAddModal()} className="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl flex items-center gap-3 shadow-xl hover:bg-indigo-700 active:scale-95 font-black text-sm uppercase tracking-widest transition-all"><Plus size={22} /> Buat Ide</button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 bg-white border-r border-slate-200 hidden lg:block p-8 overflow-y-auto">
          <div className="space-y-3 mb-10">
            <button onClick={() => setView('calendar')} className={`w-full flex items-center justify-between p-5 rounded-3xl transition-all ${view === 'calendar' || view === 'list' ? 'bg-slate-50 text-indigo-700 shadow-sm border border-slate-100 font-black' : 'text-slate-500 hover:bg-slate-50'}`}><div className="flex items-center gap-4"><LayoutDashboard size={24} /><span className="text-lg uppercase tracking-tight">Schedule</span></div></button>
            <button onClick={() => setView('sourceBank')} className={`w-full flex items-center justify-between p-5 rounded-3xl transition-all ${view === 'sourceBank' ? 'bg-indigo-600 text-white shadow-lg font-black' : 'text-slate-500 hover:bg-slate-50'}`}><div className="flex items-center gap-4"><BookOpen size={24} /><span className="text-lg uppercase tracking-tight">Source Bank</span></div></button>
            <button onClick={() => setView('profile')} className={`w-full flex items-center justify-between p-5 rounded-3xl transition-all ${view === 'profile' ? 'bg-emerald-600 text-white shadow-lg font-black' : 'text-slate-500 hover:bg-slate-50'}`}><div className="flex items-center gap-4"><UserCircle size={24} /><span className="text-lg uppercase tracking-tight">Profil</span></div></button>
          </div>
          <div className="mt-auto pt-10 border-t border-slate-100"><button onClick={handleLogout} className="w-full flex items-center gap-4 p-5 rounded-3xl text-red-500 hover:bg-red-50 transition-all font-black text-lg uppercase tracking-tight"><LogOut size={24} /> Keluar</button></div>
        </aside>

        <main className="flex-1 p-6 md:p-10 overflow-y-auto scrollbar-hide">
          {view === 'calendar' && (
            <div className="bg-white rounded-[3rem] shadow-sm border border-slate-200 overflow-hidden animate-in fade-in">
              <div className="p-10 flex items-center justify-between border-b bg-slate-50/20">
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tight">{selectedDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}</h2>
                <div className="flex gap-3 bg-slate-100 p-2 rounded-2xl"><button onClick={handlePrevMonth} className="p-3 bg-white hover:text-indigo-600 shadow-sm rounded-xl transition-colors"><ChevronLeft size={28}/></button><button onClick={handleNextMonth} className="p-3 bg-white hover:text-indigo-600 shadow-sm rounded-xl transition-colors"><ChevronRight size={28}/></button></div>
              </div>
              <div className="grid grid-cols-7 border-b bg-slate-50/50">{['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(day => (<div key={day} className="py-6 text-center text-sm font-black text-slate-400 uppercase tracking-widest">{day}</div>))}</div>
              <div className="grid grid-cols-7">
                {[...Array(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).getDay())].map((_, i) => (<div key={`empty-${i}`} className="h-40 md:h-52 border-b border-r border-slate-100 bg-slate-50/10"></div>))}
                {[...Array(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate())].map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const content = filteredContents.find(c => c.date === dateStr);
                  const isToday = new Date().toISOString().split('T')[0] === dateStr;
                  return (
                    <div key={day} onClick={() => content && openEditModal(content)} className={`h-40 md:h-52 border-b border-r border-slate-100 p-4 relative transition-all group flex flex-col cursor-pointer ${content ? getFullBlockStatusClass(content.status) : 'bg-white hover:bg-indigo-50/20'}`}>
                      <div className="flex justify-between items-start mb-2"><span className={`text-base font-black w-10 h-10 flex items-center justify-center rounded-2xl transition-all ${isToday ? (content ? 'bg-white/20 text-white' : 'bg-indigo-600 text-white shadow-xl') : (content ? 'text-white/80' : 'text-slate-400 group-hover:text-indigo-600 font-black')}`}>{day}</span>{!content && (<button onClick={(e) => { e.stopPropagation(); openAddModal(dateStr); }} className="opacity-0 group-hover:opacity-100 scale-90 p-2.5 bg-indigo-600 text-white rounded-full shadow-2xl transition-all hover:bg-indigo-700 hover:scale-110"><Plus size={20} strokeWidth={4}/></button>)}</div>
                      {content && <div className="flex-1 flex flex-col justify-between animate-in zoom-in"><h3 className="text-sm font-black leading-tight line-clamp-3 uppercase tracking-tighter">{content.title}</h3><div className="flex items-center gap-2 text-[10px] font-black bg-white/20 self-start px-2 py-1 rounded-md">{getStatusIcon(content.status, 12)}{content.type}</div></div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {view === 'sourceBank' && (
             <div className="animate-in slide-in-from-bottom-4 duration-500">
              <h2 className="text-3xl font-black text-slate-900 flex items-center gap-4 mb-10"><div className="bg-indigo-600 p-2 rounded-xl text-white shadow-lg"><BookOpen size={28} /></div> Source Bank</h2>
              {filteredSources.length === 0 ? (<div className="text-center py-36 bg-white rounded-[3rem] border-4 border-dashed border-slate-100 shadow-inner"><LinkIcon size={72} className="mx-auto text-slate-100 mb-6" /><p className="text-xl text-slate-400 font-black uppercase tracking-widest">Belum ada referensi</p></div>) : (
                <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                   {filteredSources.map(s => (<div key={s.id} className="p-6 border-b border-slate-100 flex justify-between items-center hover:bg-indigo-50/30 transition-all"><div className="flex-1 pr-10 text-left"><a href={s.url} target="_blank" className="text-sm font-black text-indigo-600 truncate block mb-1 hover:underline">{s.url}</a><p className="text-sm text-slate-500 italic">"{s.notes || '-'}"</p></div><div className="flex gap-2"><button onClick={() => {setEditingSourceId(s.id); setSourceForm({...s}); setShowSourceModal(true);}} className="p-2.5 bg-slate-50 text-slate-400 hover:text-indigo-600 rounded-xl transition-all"><Pencil size={18}/></button><button onClick={() => setConfirmModal({ show: true, type: 'source', target: s.id })} className="p-2.5 bg-slate-50 text-slate-400 hover:text-red-500 rounded-xl transition-all"><Trash2 size={18}/></button></div></div>))}
                </div>
              )}
           </div>
          )}

          {view === 'profile' && (
            <div className="animate-in slide-in-from-right-4 duration-500 max-w-4xl mx-auto">
               <div className="flex justify-between items-center mb-10">
                <h2 className="text-4xl font-black text-slate-900">Profil {filterBrand}</h2>
                <button onClick={() => setIsEditingProfile(!isEditingProfile)} className={`px-6 py-3 rounded-2xl font-black text-sm uppercase transition-all ${isEditingProfile ? 'bg-slate-200 text-slate-600' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xl'}`}>{isEditingProfile ? 'Batal' : 'Edit Profil'}</button>
              </div>
              {isEditingProfile ? (
                <div className="bg-white rounded-[3rem] p-10 shadow-xl space-y-8 animate-in zoom-in">
                  <textarea rows="4" className="w-full p-6 bg-slate-50 border border-slate-200 rounded-3xl outline-none font-medium text-lg shadow-inner" placeholder="Deskripsi Brand..." value={profileForm.description} onChange={e => setProfileForm({...profileForm, description: e.target.value})} />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <input type="text" className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-lg shadow-inner" placeholder="Platform..." value={profileForm.platforms} onChange={e => setProfileForm({...profileForm, platforms: e.target.value})} />
                    <input type="url" className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-lg text-indigo-600 shadow-inner" placeholder="Link..." value={profileForm.link} onChange={e => setProfileForm({...profileForm, link: e.target.value})} />
                  </div>
                  <button onClick={async () => { await setDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'profiles', filterBrand), profileForm); setIsEditingProfile(false); }} className="w-full bg-emerald-600 text-white font-black py-6 rounded-3xl shadow-2xl flex items-center justify-center gap-3 text-lg hover:bg-emerald-700">Simpan Perubahan</button>
                </div>
              ) : (
                <div className="space-y-8 animate-in zoom-in">
                  <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-200 relative overflow-hidden group"><div className="absolute right-0 top-0 p-8 text-slate-100 group-hover:text-emerald-50 transition-colors"><Building2 size={120}/></div><div className="relative z-10 text-left"><h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Nama Brand</h3><p className="text-4xl font-black text-slate-900 leading-tight">{filterBrand}</p></div></div>
                  <div className="bg-white rounded-[3rem] p-10 shadow-sm border border-slate-200 text-left"><h3 className="text-xs font-black text-slate-400 uppercase mb-6 tracking-widest">Deskripsi</h3><p className="text-xl font-medium text-slate-700 italic">"{brandProfiles[filterBrand]?.description || 'Belum ada deskripsi...'}"</p></div>
                </div>
              )}
            </div>
          )}

          {view === 'list' && (
             <div className="space-y-6 animate-in fade-in duration-300">
             {filteredContents.length === 0 ? (<div className="text-center py-36 bg-white rounded-[3rem] border-4 border-dashed border-slate-100 shadow-inner"><AlertCircle size={72} className="mx-auto text-slate-200 mb-6" /><p className="text-xl text-slate-400 font-black uppercase tracking-widest text-center px-10">Tidak ada rencana konten</p></div>) : (
               filteredContents.sort((a, b) => new Date(a.date) - new Date(b.date)).map(c => (
                 <div key={c.id} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 transition-all hover:border-indigo-300 hover:shadow-xl">
                   <div className="flex gap-8 items-center flex-1">
                     <div className={`p-5 rounded-[2rem] hidden md:block border shadow-sm ${getFullBlockStatusClass(c.status).split(' ')[0]}`}><Briefcase size={32} className="text-white" /></div>
                     <div className="flex-1 text-left">
                       <div className="flex items-center gap-4 mb-3"><h4 className="text-xl font-black text-slate-900 leading-tight">{c.title}</h4><span className={`text-[11px] px-4 py-1.5 rounded-full font-black uppercase border ${typeBadgeColorMap[c.type] || 'bg-slate-100'}`}>{c.type}</span></div>
                       <div className="flex flex-wrap gap-x-8 gap-y-2 text-base text-slate-500 font-bold uppercase tracking-wider"><span className="flex items-center gap-3"><CalendarIcon size={20} /> {new Date(c.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span></div>
                     </div>
                   </div>
                   <div className="flex items-center gap-5 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 pt-6 md:pt-0">
                     <div className="relative">
                       <select value={c.status} onChange={async (e) => await updateDoc(doc(db, 'artifacts', appId, 'users', user.uid, 'contents', c.id), { status: e.target.value })} className={`text-sm font-black px-12 py-3 rounded-2xl appearance-none outline-none shadow-md transition-all cursor-pointer ${getFullBlockStatusClass(c.status)}`}>
                         <option value="IDEA">IDEA</option><option value="READY">READY</option><option value="POSTED">POSTED</option>
                       </select>
                       <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-80">{getStatusIcon(c.status, 20)}</div>
                     </div>
                     <div className="flex items-center gap-3"><button onClick={() => openEditModal(c)} className="text-slate-400 hover:text-indigo-600 p-4 bg-slate-50 rounded-[1.5rem] transition-colors"><Pencil size={24} /></button><button onClick={() => setConfirmModal({ show: true, type: 'content', target: c.id })} className="text-slate-400 hover:text-red-500 p-4 bg-slate-50 rounded-[1.5rem] transition-colors"><Trash2 size={24} /></button></div>
                   </div>
                 </div>
               ))
             )}
           </div>
          )}
        </main>
      </div>

      {/* --- ALL MODALS --- */}
      {showAddBrandModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-lg z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-lg p-10 space-y-8 animate-in zoom-in">
            <h2 className="text-2xl font-black text-indigo-900 uppercase">Bisnis Baru</h2>
            <input required autoFocus type="text" placeholder="Nama Bisnis" className="w-full p-6 bg-slate-50 border border-slate-200 rounded-[2rem] outline-none font-black text-xl shadow-inner" value={newBrandName} onChange={e => setNewBrandName(e.target.value)} />
            <div className="flex gap-4"><button onClick={() => setShowAddBrandModal(false)} className="flex-1 py-5 bg-slate-100 rounded-2xl font-bold uppercase text-xs">Batal</button><button onClick={handleAddBrand} className="flex-1 py-5 bg-indigo-600 text-white rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all">Simpan</button></div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[3.5rem] shadow-2xl w-full max-w-3xl overflow-hidden p-12 animate-in zoom-in">
            <div className="flex justify-between items-center mb-10"><h2 className="text-4xl font-black text-indigo-900 uppercase">{editingId ? 'Edit' : 'Buat'} Ide</h2><button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-4"><X size={32} /></button></div>
            <form onSubmit={handleFormSubmit} className="space-y-10">
              <div className="bg-indigo-50 p-4 rounded-2xl flex items-center gap-3"><Building2 size={16}/><p className="text-sm font-bold text-indigo-900 uppercase tracking-widest">{filterBrand}</p></div>
              <div><label className="block text-sm font-black text-slate-400 mb-4 uppercase text-left">Judul</label><input required type="text" className="w-full p-6 bg-slate-50 border border-slate-200 rounded-[2rem] outline-none font-black text-xl shadow-inner" value={formContent.title} onChange={e => setFormContent({...formContent, title: e.target.value})} /></div>
              <div className="grid grid-cols-2 gap-8">
                <div><label className="text-sm font-black text-slate-400 mb-4 uppercase block text-left">Tanggal</label><input type="date" className="w-full p-6 bg-slate-50 border border-slate-200 rounded-[2rem] font-black outline-none shadow-inner" value={formContent.date} onChange={e => setFormContent({...formContent, date: e.target.value})} /></div>
                <Dropdown label="Pillar" value={formContent.type} onChange={e => setFormContent({...formContent, type: e.target.value})} options={['Edukasi', 'Promosi', 'Entertainment', 'Testimoni', 'Behind the Scene']} />
              </div>
              <div className="grid grid-cols-2 gap-8">
                <Dropdown label="Status" value={formContent.status} onChange={e => setFormContent({...formContent, status: e.target.value})} options={['IDEA', 'READY', 'POSTED']} />
                <div><label className="text-sm font-black text-slate-400 mb-4 uppercase block text-left">Media</label><input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleImageChange} /><button type="button" onClick={() => fileInputRef.current.click()} className="w-full p-6 bg-slate-50 border border-dashed border-slate-300 rounded-[2rem] font-black text-xs hover:bg-slate-100 transition-all uppercase">Upload Media</button></div>
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white font-black py-8 rounded-[2.5rem] shadow-2xl uppercase tracking-widest text-xl hover:bg-indigo-700 transition-all">Simpan Rencana</button>
            </form>
          </div>
        </div>
      )}

      {confirmModal.show && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] p-10 max-w-sm w-full text-center shadow-2xl animate-in zoom-in">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6"><Trash2 size={32} /></div>
            <h3 className="text-xl font-black uppercase mb-2">Hapus Data?</h3>
            <p className="text-slate-500 font-medium text-sm mb-8 leading-relaxed">Tindakan ini permanen. Ingin melanjutkan?</p>
            <div className="flex gap-4"><button onClick={() => setConfirmModal({ show: false, type: '', target: null })} className="flex-1 py-4 bg-slate-100 rounded-2xl text-xs font-black uppercase">Batal</button><button onClick={executeDelete} className="flex-1 py-4 bg-red-600 text-white rounded-2xl text-xs font-black shadow-lg">Hapus</button></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;