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
  Smartphone,
  Image as ImageIcon,
  Save,
  Eye
} from 'lucide-react';

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
  // --- STATE MANAGEMENT ---
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authMode, setAuthMode] = useState('login'); 
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
  
  // Carousel State untuk Preview
  const [currentImgIdx, setCurrentImgIdx] = useState(0);
  
  const fileInputRef = useRef(null);
  const initialFormContent = { title: '', brand: '', type: 'Edukasi', date: '', status: 'IDEA', caption: '', images: [] };
  const [formContent, setFormContent] = useState(initialFormContent);
  const [sourceForm, setSourceForm] = useState({ url: '', notes: '', brand: '' });

  // --- HELPER FUNCTIONS ---
  const getFullBlockStatusClass = (status) => {
    switch (status) {
      case 'IDEA': return 'bg-blue-500 text-white border-blue-600';
      case 'READY': return 'bg-orange-500 text-white border-orange-600';
      case 'POSTED': return 'bg-green-700 text-white border-green-800';
      default: return 'bg-white text-slate-800 border-slate-200';
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

  // --- LOGIC HOOKS ---
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

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

  useEffect(() => {
    if (brandProfiles[filterBrand]) {
      setProfileForm(brandProfiles[filterBrand]);
    } else {
      setProfileForm({ description: '', platforms: '', link: '' });
    }
  }, [filterBrand, brandProfiles]);

  // Reset carousel saat gambar berubah
  useEffect(() => {
    setCurrentImgIdx(0);
  }, [formContent.images]);

  // --- EVENT HANDLERS ---
  const handleAuth = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (authMode === 'login') await signInWithEmailAndPassword(auth, email, password);
      else await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setAuthError(err.message);
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
        setShowModal(false); // Pastikan modal tertutup jika menghapus via modal
      } else if (confirmModal.type === 'source') {
        await deleteDoc(doc(db, ...path, 'sources', confirmModal.target));
      }
      setConfirmModal({ show: false, type: '', target: null });
    } catch (err) { console.error(err); }
  };

  const openAddModal = (dateStr = null) => {
    if (!filterBrand) { setShowAddBrandModal(true); return; }
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
      if (editingId) {
        await updateDoc(doc(col, editingId), formContent);
      } else {
        await addDoc(col, formContent);
      }
      // RESET & CLOSE
      setFormContent(initialFormContent);
      setEditingId(null);
      setShowModal(false);
    } catch (err) { 
      console.error("Simpan Gagal:", err); 
    }
  };

  const handleSourceSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    const col = collection(db, 'artifacts', appId, 'users', user.uid, 'sources');
    try {
      if (editingSourceId) await updateDoc(doc(col, editingSourceId), sourceForm);
      else await addDoc(col, { ...sourceForm, brand: filterBrand });
      setShowSourceModal(false);
      setSourceForm({ url: '', notes: '', brand: '' });
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

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    const readers = files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
    });

    Promise.all(readers).then(newImages => {
      setFormContent(prev => ({ 
        ...prev, 
        images: [...(prev.images || []), ...newImages] 
      }));
    });
  };

  const triggerFileInput = () => fileInputRef.current?.click();
  const removeImage = (idx) => {
    setFormContent(prev => ({ 
      ...prev, 
      images: prev.images.filter((_, i) => i !== idx) 
    }));
    if (currentImgIdx >= formContent.images.length - 1) setCurrentImgIdx(0);
  };

  // --- RENDER LOGIC ---
  if (firebaseConfig.apiKey === "MASUKKAN_API_KEY_ANDA") {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-2xl shadow-xl max-w-sm border border-red-100">
          <AlertCircle size={48} className="text-red-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2 uppercase">API Key Kosong</h1>
          <p className="text-slate-500 text-sm">Harap masukkan <code className="bg-slate-50 p-1">firebaseConfig</code> Anda di App.jsx.</p>
        </div>
      </div>
    );
  }

  if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-600 border-t-transparent"></div></div>;

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden animate-in fade-in zoom-in">
          <div className="p-8 text-center bg-indigo-600 text-white">
            <CalendarIcon size={40} className="mx-auto mb-4" />
            <h1 className="text-2xl font-bold uppercase tracking-tight">Planner Pro</h1>
            <p className="text-indigo-100 mt-1 text-xs font-medium uppercase tracking-widest">
              {authMode === 'login' ? 'Login' : 'Daftar'}
            </p>
          </div>
          <div className="p-8 space-y-4 text-left">
            {authError && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-[11px] font-bold border border-red-100">{authError}</div>}
            <div className="flex bg-slate-100 p-1 rounded-xl">
              <button onClick={() => {setAuthMode('login'); setAuthError('');}} className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${authMode === 'login' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>MASUK</button>
              <button onClick={() => {setAuthMode('register'); setAuthError('');}} className={`flex-1 py-2 rounded-lg font-bold text-xs transition-all cursor-pointer ${authMode === 'register' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>DAFTAR</button>
            </div>
            <div className="space-y-3">
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                <input type="email" placeholder="Email" className="w-full p-3.5 pl-11 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm focus:ring-2 focus:ring-indigo-100" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
                <input type="password" placeholder="Password" className="w-full p-3.5 pl-11 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm focus:ring-2 focus:ring-indigo-100" value={password} onChange={e => setPassword(e.target.value)} />
              </div>
            </div>
            <button onClick={handleAuth} className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold uppercase text-xs hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-100 cursor-pointer tracking-widest">{authMode === 'login' ? 'MASUK' : 'DAFTAR'}</button>
            <button onClick={loginAnonymously} className="w-full bg-white border border-slate-200 text-slate-500 py-3 rounded-xl font-bold uppercase text-[10px] hover:bg-slate-50 transition-all cursor-pointer flex items-center justify-center gap-2"><UserCheck size={14} /> LOGIN TAMU</button>
          </div>
        </div>
      </div>
    );
  }

  const Dropdown = ({ label, value, onChange, options }) => (
    <div className="relative w-full text-left">
      {label && <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-widest">{label}</label>}
      <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm appearance-none cursor-pointer focus:ring-2 focus:ring-indigo-50 transition-all" value={value} onChange={onChange}>
        {options.map((opt, idx) => (<option key={idx} value={typeof opt === 'object' ? opt.value : opt}>{typeof opt === 'object' ? opt.label : opt}</option>))}
      </select>
      <div className="absolute right-3 top-[34px] pointer-events-none text-slate-400"><ChevronDown size={14} /></div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-800 text-left">
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex flex-col lg:flex-row justify-between items-center gap-4 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="bg-indigo-600 p-2 rounded-lg text-white"><CalendarIcon size={24} /></div>
          <div className="text-left">
            <h1 className="text-lg font-bold tracking-tight uppercase leading-none">Planner Pro</h1>
            <p className="text-[10px] text-slate-400 font-bold mt-1 truncate max-w-[120px]">{user.email || 'Guest Account'}</p>
          </div>
          <div className="relative ml-4">
            <button onClick={() => setShowBrandDropdown(!showBrandDropdown)} className="flex items-center gap-3 px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl hover:bg-indigo-50 transition-all cursor-pointer">
              <Building2 size={18} className="text-indigo-600" /><p className="text-sm font-bold">{filterBrand || 'Pilih Bisnis'}</p><ChevronDown size={14} />
            </button>
            {showBrandDropdown && (
              <div className="absolute top-full left-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden animate-in slide-in-from-top-1">
                <div className="max-h-60 overflow-y-auto">
                  {brands.map((brand) => (
                    <div key={brand} onClick={() => { setFilterBrand(brand); setShowBrandDropdown(false); }} className={`p-3 cursor-pointer transition-all border-b border-slate-50 flex justify-between items-center hover:bg-indigo-50 ${filterBrand === brand ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-700'} text-xs`}>
                      <span className="truncate flex-1">{brand}</span>
                      <button onClick={(e) => handleDeleteBrand(e, brand)} className="p-1.5 text-slate-300 hover:text-red-500 cursor-pointer"><Trash2 size={14}/></button>
                    </div>
                  ))}
                </div>
                <button onClick={() => { setShowAddBrandModal(true); setShowBrandDropdown(false); }} className="w-full text-left p-3 text-xs font-bold text-indigo-600 bg-indigo-50/30 hover:bg-indigo-100 flex items-center gap-2 cursor-pointer border-t"><PlusCircle size={16} /> Tambah Baru</button>
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-slate-100 p-1 rounded-xl">
            <button onClick={() => setView('calendar')} className={`px-4 py-1.5 rounded-lg transition-all font-bold text-[11px] cursor-pointer ${view === 'calendar' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>Kalender</button>
            <button onClick={() => setView('list')} className={`px-4 py-1.5 rounded-lg transition-all font-bold text-[11px] cursor-pointer ${view === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500'}`}>Daftar</button>
          </div>
          <button onClick={() => openAddModal()} className="bg-indigo-600 text-white px-5 py-2 rounded-xl flex items-center gap-2 shadow-md hover:bg-indigo-700 active:scale-95 transition-all font-bold text-xs uppercase cursor-pointer"><Plus size={16} /> Buat Ide</button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-64 bg-white border-r border-slate-200 hidden lg:block p-6">
          <div className="space-y-2">
            <button onClick={() => setView('calendar')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer text-xs font-bold text-left ${view === 'calendar' || view === 'list' ? 'bg-slate-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}><LayoutDashboard size={18} /> SCHEDULE</button>
            <button onClick={() => setView('sourceBank')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer text-xs font-bold text-left ${view === 'sourceBank' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}><BookOpen size={18} /> SOURCE BANK</button>
            <button onClick={() => setView('profile')} className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer text-xs font-bold text-left ${view === 'profile' ? 'bg-emerald-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}><UserCircle size={18} /> PROFIL</button>
          </div>
          <div className="mt-10 pt-6 border-t"><button onClick={() => signOut(auth)} className="w-full flex items-center gap-3 p-3 text-red-500 font-bold hover:bg-red-50 rounded-xl cursor-pointer text-xs"><LogOut size={18} /> KELUAR</button></div>
        </aside>

        <main className="flex-1 p-6 md:p-8 overflow-y-auto text-left">
          {view === 'calendar' && (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in fade-in">
              <div className="p-6 flex items-center justify-between border-b bg-slate-50/20">
                <h2 className="text-xl font-bold text-slate-900 uppercase tracking-tight">{selectedDate.toLocaleString('id-ID', { month: 'long', year: 'numeric' })}</h2>
                <div className="flex gap-2">
                  <button onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1))} className="p-2 bg-white border rounded-lg hover:text-indigo-600 cursor-pointer"><ChevronLeft size={20}/></button>
                  <button onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1))} className="p-2 bg-white border rounded-lg hover:text-indigo-600 cursor-pointer"><ChevronRight size={20}/></button>
                </div>
              </div>
              <div className="grid grid-cols-7 border-b bg-slate-50/50">{['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map(day => (<div key={day} className="py-3 text-center text-[10px] font-bold text-slate-400 uppercase">{day}</div>))}</div>
              <div className="grid grid-cols-7">
                {[...Array(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1).getDay())].map((_, i) => (<div key={i} className="h-24 md:h-32 border-b border-r border-slate-100 bg-slate-50/5"></div>))}
                {[...Array(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0).getDate())].map((_, i) => {
                  const d = i + 1;
                  const dStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
                  const c = filteredContents.find(item => item.date === dStr);
                  return (
                    <div key={d} onClick={() => c ? openEditModal(c) : openAddModal(dStr)} className={`h-24 md:h-32 border-b border-r border-slate-100 p-2 transition-all group flex flex-col cursor-pointer ${c ? getFullBlockStatusClass(c.status) : 'bg-white hover:bg-indigo-50/30'}`}>
                      <div className="flex justify-between items-start mb-1 text-left"><span className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-lg ${c ? 'bg-white/20' : 'text-slate-400'}`}>{d}</span>{!c && <Plus size={14} className="opacity-0 group-hover:opacity-100 text-indigo-600" />}</div>
                      {c && <div className="flex-1 flex flex-col justify-between overflow-hidden"><h3 className="text-[10px] font-bold line-clamp-2 uppercase leading-tight text-left">{c.title}</h3><div className="bg-white/20 text-[8px] px-1.5 py-0.5 rounded font-bold self-start uppercase">{c.type}</div></div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {view === 'list' && (
            <div className="space-y-3 animate-in fade-in">
              {filteredContents.length === 0 ? <div className="py-20 text-center font-bold text-slate-300 uppercase text-sm">Belum Ada Konten</div> : 
                filteredContents.sort((a,b) => new Date(a.date) - new Date(b.date)).map(c => (
                  <div key={c.id} className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-4 hover:shadow-md transition-all group">
                    <div className="flex-1 text-left"><h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 uppercase">{c.title}</h3><p className="text-[10px] font-bold text-slate-400 uppercase mt-1">{c.date} • {c.type}</p></div>
                    <div className="flex items-center gap-3">
                      <select value={c.status} onChange={(e) => updateStatus(c.id, e.target.value)} className="text-[10px] font-bold px-3 py-1.5 rounded-lg border outline-none cursor-pointer">
                        <option value="IDEA">IDEA</option><option value="READY">READY</option><option value="POSTED">POSTED</option>
                      </select>
                      <button onClick={() => openEditModal(c)} className="p-2 text-slate-400 hover:text-indigo-600 cursor-pointer"><Pencil size={18}/></button>
                      <button onClick={() => setConfirmModal({ show: true, type: 'content', target: c.id })} className="p-2 text-slate-400 hover:text-red-500 cursor-pointer"><Trash2 size={18}/></button>
                    </div>
                  </div>
                ))
              }
            </div>
          )}

          {view === 'profile' && (
            <div className="animate-in slide-in-from-right-2 max-w-2xl mx-auto space-y-6">
              <div className="flex justify-between items-center mb-6 text-left">
                <h2 className="text-2xl font-bold flex items-center gap-3"><UserCircle size={28} className="text-emerald-600" /> Profil {filterBrand}</h2>
                <button onClick={() => setIsEditingProfile(!isEditingProfile)} className={`px-4 py-2 rounded-xl font-bold text-xs uppercase cursor-pointer ${isEditingProfile ? 'bg-slate-200' : 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700'}`}>{isEditingProfile ? 'Batal' : 'Edit'}</button>
              </div>
              {isEditingProfile ? (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4 text-left">
                  <div><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Deskripsi</label><textarea rows="3" className="w-full p-3 bg-slate-50 border rounded-xl outline-none text-sm font-medium" value={profileForm.description} onChange={e => setProfileForm({...profileForm, description: e.target.value})} /></div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Platform</label><input type="text" className="w-full p-3 bg-slate-50 border rounded-xl outline-none text-sm font-bold" value={profileForm.platforms} onChange={e => setProfileForm({...profileForm, platforms: e.target.value})} /></div>
                    <div><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Link</label><input type="url" className="w-full p-3 bg-slate-50 border rounded-xl outline-none text-sm font-bold text-indigo-600" value={profileForm.link} onChange={e => setProfileForm({...profileForm, link: e.target.value})} /></div>
                  </div>
                  <button onClick={handleSaveProfile} className="w-full bg-emerald-600 text-white font-bold py-3 rounded-xl shadow-md text-xs uppercase cursor-pointer flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all"><Save size={16}/> Simpan</button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl p-6 shadow-sm border text-left"><h3 className="text-[10px] font-bold text-slate-400 uppercase mb-2">Deskripsi</h3><p className="text-sm font-medium italic">"{brandProfiles[filterBrand]?.description || 'Kosong'}"</p></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-indigo-600 rounded-2xl p-6 text-white text-left"><h3 className="text-[10px] font-bold opacity-70 uppercase mb-2">Platform</h3><p className="text-lg font-bold text-left">{brandProfiles[filterBrand]?.platforms || '-'}</p></div>
                    <div className="bg-white rounded-2xl p-6 shadow-sm border text-left"><h3 className="text-[10px] font-bold text-slate-400 uppercase mb-2">Link</h3>{brandProfiles[filterBrand]?.link ? <a href={brandProfiles[filterBrand].link} target="_blank" className="text-sm font-bold text-indigo-600 hover:underline">Tautan <ExternalLink className="inline ml-1" size={14} /></a> : <p className="text-sm font-bold">-</p>}</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {view === 'sourceBank' && (
            <div className="animate-in slide-in-from-bottom-2 text-left">
              <h2 className="text-2xl font-bold flex items-center gap-3 mb-6"><BookOpen size={28} className="text-indigo-600" /> Source Bank</h2>
              <button onClick={() => {setEditingSourceId(null); setSourceForm({url:'', notes:''}); setShowSourceModal(true);}} className="mb-4 bg-indigo-600 text-white px-4 py-2 rounded-xl font-bold text-[10px] uppercase cursor-pointer hover:bg-indigo-700 flex items-center gap-2 shadow-sm transition-all"><Plus size={14}/> Tambah Referensi</button>
              {filteredSources.length === 0 ? <div className="py-20 text-center text-slate-300 font-bold uppercase text-xs">Belum ada referensi</div> : (
                <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm text-left">
                   {filteredSources.map(s => (<div key={s.id} className="p-4 border-b flex justify-between items-center hover:bg-indigo-50/20 text-left"><div className="flex-1 pr-6 text-left"><a href={s.url} target="_blank" className="text-xs font-bold text-indigo-600 truncate block hover:underline text-left">{s.url}</a><p className="text-[10px] text-slate-500 italic mt-0.5">"{s.notes || '-'}"</p></div><div className="flex gap-1"><button onClick={() => {setEditingSourceId(s.id); setSourceForm({...s}); setShowSourceModal(true);}} className="p-2 text-slate-400 hover:text-indigo-600 cursor-pointer"><Pencil size={16}/></button><button onClick={() => setConfirmModal({ show: true, type: 'source', target: s.id })} className="p-2 text-slate-400 hover:text-red-500 cursor-pointer"><Trash2 size={16}/></button></div></div>))}
                </div>
              )}
           </div>
          )}
        </main>
      </div>

      {/* MODAL TAMBAH/EDIT IDE */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4 text-left">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[85vh] overflow-hidden flex flex-col md:flex-row animate-in zoom-in duration-200">
            {/* Form Side */}
            <div className="flex-1 p-8 overflow-y-auto border-r border-slate-100 scrollbar-hide text-left">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold uppercase tracking-tight">{editingId ? 'Edit Ide' : 'Ide Baru'}</h2>
                <button onClick={() => {setShowModal(false); setEditingId(null); setFormContent(initialFormContent);}} className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"><X size={24} /></button>
              </div>
              <form onSubmit={handleFormSubmit} className="space-y-6">
                <div className="bg-indigo-50 px-3 py-1.5 rounded-lg flex items-center gap-2 w-fit">
                  <Building2 size={14} className="text-indigo-600"/><p className="text-[10px] font-bold text-indigo-900 uppercase">{filterBrand}</p>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1.5 uppercase tracking-widest">Judul</label>
                  <input required type="text" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm focus:ring-2 focus:ring-indigo-100" value={formContent.title} onChange={e => setFormContent({...formContent, title: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase block tracking-widest">Tanggal</label>
                    <input type="date" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none" value={formContent.date} onChange={e => setFormContent({...formContent, date: e.target.value})} />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase block tracking-widest">Pillar</label>
                    <select className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-xs outline-none cursor-pointer appearance-none" value={formContent.type} onChange={e => setFormContent({...formContent, type: e.target.value})}><option>Edukasi</option><option>Promosi</option><option>Entertainment</option><option>Testimoni</option><option>Behind the Scene</option></select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase block tracking-widest">Caption</label>
                  <textarea rows="4" placeholder="..." className="w-full p-4 bg-slate-50 border border-slate-200 rounded-xl font-medium text-sm outline-none resize-none" value={formContent.caption} onChange={e => setFormContent({...formContent, caption: e.target.value})}></textarea>
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <Dropdown label="Status" value={formContent.status} onChange={e => setFormContent({...formContent, status: e.target.value})} options={['IDEA', 'READY', 'POSTED']} />
                   <div>
                     <label className="text-[10px] font-bold text-slate-400 mb-1.5 uppercase block tracking-widest text-left">Visual</label>
                     <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleImageChange} />
                     <button type="button" onClick={triggerFileInput} className="w-full p-3 bg-slate-50 border border-dashed border-slate-300 rounded-xl font-bold text-[10px] uppercase hover:bg-slate-100 cursor-pointer">Upload Media</button>
                   </div>
                </div>
                <div className="flex gap-3">
                   {editingId && (
                     <button type="button" onClick={() => setConfirmModal({show: true, type: 'content', target: editingId})} className="px-6 border-2 border-red-100 text-red-500 rounded-xl font-bold text-[10px] uppercase hover:bg-red-50 cursor-pointer flex items-center gap-2"><Trash2 size={16}/> Hapus</button>
                   )}
                   <button type="submit" className="flex-1 bg-indigo-600 text-white font-bold py-3.5 rounded-xl shadow-lg uppercase tracking-widest text-xs hover:bg-indigo-700 active:scale-95 transition-all cursor-pointer">Simpan Rencana</button>
                </div>
              </form>
            </div>

            {/* Preview Side */}
            <div className="hidden lg:flex flex-[0.7] bg-slate-50 p-6 flex-col items-center justify-center relative text-left">
              <div className="absolute top-6 left-6 flex items-center gap-2 text-slate-400 font-bold text-[9px] uppercase tracking-widest text-left">
                <Eye size={12} /> Live Preview
              </div>
              <div className="w-[260px] h-[520px] bg-white rounded-[2.5rem] shadow-xl border-[10px] border-slate-900 overflow-hidden flex flex-col text-left">
                {/* Visual Preview with Carousel */}
                <div className="h-2/3 bg-slate-100 flex items-center justify-center relative overflow-hidden text-left">
                  {formContent.images?.length > 0 ? (
                    <>
                      <img src={formContent.images[currentImgIdx]} className="w-full h-full object-cover" alt="Preview" />
                      {formContent.images.length > 1 && (
                        <div className="absolute inset-0 flex items-center justify-between px-2">
                           <button onClick={(e) => {e.preventDefault(); setCurrentImgIdx(prev => prev === 0 ? formContent.images.length - 1 : prev - 1)}} className="w-6 h-6 bg-white/80 rounded-full flex items-center justify-center text-indigo-600 cursor-pointer shadow-sm"><ChevronLeft size={16}/></button>
                           <button onClick={(e) => {e.preventDefault(); setCurrentImgIdx(prev => prev === formContent.images.length - 1 ? 0 : prev + 1)}} className="w-6 h-6 bg-white/80 rounded-full flex items-center justify-center text-indigo-600 cursor-pointer shadow-sm"><ChevronRight size={16}/></button>
                        </div>
                      )}
                      <div className="absolute bottom-3 right-3 bg-black/50 px-2 py-0.5 rounded-full text-white text-[8px] font-bold">{currentImgIdx + 1}/{formContent.images.length}</div>
                    </>
                  ) : (
                    <div className="text-center text-slate-300">
                      <ImageIcon size={40} strokeWidth={1} /><p className="text-[8px] font-bold uppercase tracking-widest mt-2 text-center">Belum ada visual</p>
                    </div>
                  )}
                  <div className="absolute top-3 left-3 bg-black/40 px-2 py-1 rounded-md text-white font-bold text-[7px] uppercase backdrop-blur-sm">{formContent.type}</div>
                </div>
                <div className="p-4 flex-1 overflow-y-auto bg-white border-t border-slate-100 scrollbar-hide text-left">
                  <div className="flex items-center gap-2 mb-2 text-left">
                    <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-[8px] uppercase">{filterBrand ? filterBrand.charAt(0) : 'P'}</div>
                    <p className="text-[9px] font-bold text-left">{filterBrand || 'Brand Anda'}</p>
                  </div>
                  <h4 className="text-[10px] font-bold uppercase mb-1 leading-tight text-left">{formContent.title || 'Judul Konten'}</h4>
                  <p className="text-[9px] text-slate-500 leading-normal whitespace-pre-wrap text-left">{formContent.caption || 'Naskah caption akan tampil di sini...'}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI HAPUS */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-8 max-w-xs w-full shadow-2xl animate-in zoom-in text-center">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6 animate-pulse"><Trash2 size={32} /></div>
            <h3 className="text-lg font-bold uppercase mb-2">Hapus Data?</h3>
            <p className="text-slate-500 text-xs mb-8 leading-relaxed">Tindakan ini tidak bisa dibatalkan. Lanjutkan?</p>
            <div className="flex gap-3"><button onClick={() => setConfirmModal({ show: false, type: '', target: null })} className="flex-1 py-3 bg-slate-100 rounded-xl font-bold uppercase text-[10px] hover:bg-slate-200 cursor-pointer">Batal</button><button onClick={executeDelete} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold uppercase text-[10px] shadow-md hover:bg-red-700 cursor-pointer">Hapus</button></div>
          </div>
        </div>
      )}

      {/* MODAL BISNIS BARU */}
      {showAddBrandModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 space-y-6 animate-in zoom-in text-center">
            <h2 className="text-xl font-bold uppercase">Bisnis Baru</h2>
            <input required autoFocus type="text" placeholder="..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-sm text-center shadow-inner" value={newBrandName} onChange={e => setNewBrandName(e.target.value)} />
            <div className="flex gap-3"><button onClick={() => setShowAddBrandModal(false)} className="flex-1 py-3 bg-slate-100 rounded-xl font-bold uppercase text-[10px] cursor-pointer">Batal</button><button onClick={handleAddBrand} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold uppercase text-[10px] shadow-md hover:bg-indigo-700 cursor-pointer">Simpan</button></div>
          </div>
        </div>
      )}

      {/* MODAL SOURCE BARU */}
      {showSourceModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[60] flex items-center justify-center p-4 text-left">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 space-y-6 animate-in zoom-in text-left">
            <h2 className="text-xl font-bold uppercase">Source Bank</h2>
            <div><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Link URL</label><input required autoFocus type="url" placeholder="https://..." className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-bold" value={sourceForm.url} onChange={e => setSourceForm({ ...sourceForm, url: e.target.value })} /></div>
            <div><label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Catatan</label><textarea rows="3" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none text-xs font-medium resize-none" value={sourceForm.notes} onChange={e => setSourceForm({ ...sourceForm, notes: e.target.value })}></textarea></div>
            <button onClick={handleSourceSubmit} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl uppercase text-[10px] tracking-widest hover:bg-indigo-700 cursor-pointer shadow-md">Simpan Referensi</button>
            <button onClick={() => setShowSourceModal(false)} className="w-full py-2 text-slate-400 font-bold uppercase text-[9px] cursor-pointer text-center">Batal</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;