import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  UploadCloud, Image as ImageIcon, HardDrive, BrainCircuit, 
  Folder, Search, Filter, LayoutGrid, Layers, Plus, X, Trash2, GripHorizontal,
  ChevronLeft, ChevronRight, Settings, Instagram, Edit2, Camera, Upload, 
  Users, Baby, UserPlus, Save, Check, Minus, Maximize2, Dog, Heart, AlignLeft,
  AlignCenter, AlignRight, MessageCircle, FileText, Calendar as CalendarIcon, 
  Video, ChevronUp, ChevronDown, Heading1, Heading2, Type, List, ListOrdered, 
  Quote, GalleryHorizontalEnd, SplitSquareHorizontal, Lightbulb, Link2, Menu
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, addDoc, setDoc, onSnapshot, query, orderBy, deleteDoc, doc, serverTimestamp, updateDoc } from 'firebase/firestore';

// --- Firebase Configuration (Studio Workspace 연동) ---
let firebaseConfig;
let currentAppId;

if (typeof __firebase_config !== 'undefined') {
  firebaseConfig = JSON.parse(__firebase_config);
  currentAppId = typeof __app_id !== 'undefined' ? __app_id : 'studio-main';
} else {
  // 사용자가 캡처해주신 Studio Workspace 프로젝트의 설정
  firebaseConfig = {
    apiKey: "AIzaSyAwrwQn6yvbZKuK8qoiaQeE2fbEVgRExz8",
    authDomain: "studio-workspace-48548.firebaseapp.com",
    projectId: "studio-workspace-48548",
    storageBucket: "studio-workspace-48548.firebasestorage.app",
    messagingSenderId: "1026812168784",
    appId: "1:1026812168784:web:244574ece95c9257475f55"
  };
  currentAppId = 'studio-main';
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = currentAppId;

// --- Constants ---
const GRANDPARENT_OPTIONS = [{ value: 'none', label: '없음' }, { value: 'grandfather', label: '👴 할아버지' }, { value: 'grandmother', label: '👵 할머니' }, { value: 'both', label: '👴👵 조부모 모두' }];
const PARENT_OPTIONS = [{ value: 'none', label: '없음' }, { value: 'mom', label: '👩 엄마' }, { value: 'dad', label: '👨 아빠' }, { value: 'both', label: '👩‍❤️‍👨 부모 모두' }];
const CHILD_OPTIONS = [{ id: 'newborn', label: '👶 신생아 (0–100일)' }, { id: 'toddler', label: '🍼 영유아 (돌~4세)' }, { id: 'kid', label: '🎒 유아·초등 (5–13세)' }, { id: 'teen', label: '🧑 중·고등학생' }, { id: 'adult_child', label: '🧑‍🎓 성인 자녀 (20대 이상)' }];

const DEFAULT_AI_PROMPT = `이 사진을 분석해서 사진 스튜디오 아카이브용 태그를 3~5개 정도 추출해줘. (예: '성인가족', '3인', '흑백', '따뜻함', '아기', '자연스러움', '만삭' 등). 결과는 반드시 JSON 문자열 배열 형태로만 응답해줘. 예: ["성인가족", "3인", "따뜻함"]`;

// --- Utilities ---
const fetchWithBackoff = async (url, options, maxRetries = 5) => {
  let delay = 1000;
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      return await res.json();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(r => setTimeout(r, delay));
      delay *= 2;
    }
  }
};

// 구현 코드 1: Gemini AI 호출
const generateTagsWithGemini = async (base64Image, promptText) => {
  const apiKey = "AIzaSyDA2ZyxBtdFoO9xk8dm81X8F5xOQF4JJEQ"; 
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  const payload = {
    contents: [
      { role: "user", parts: [{ text: promptText }, { inlineData: { mimeType: "image/jpeg", data: base64Image.split(',')[1] } }] }
    ],
    generationConfig: { responseMimeType: "application/json" }
  };
  try {
    const data = await fetchWithBackoff(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (text) {
      try { const parsed = JSON.parse(text); return Array.isArray(parsed) ? parsed : ['기타']; } 
      catch(e) { const match = text.match(/\[.*\]/s); if (match) return JSON.parse(match[0]); }
    }
  } catch (e) { console.error("Gemini API Error:", e); }
  return ['분석실패'];
};

// 구현 코드 2: Google Drive 백엔드 자동화 (Frontend Simulation)
const uploadToGoogleDriveMock = async (file, folderName) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // 구글 드라이브 API를 통해 폴더 생성 후 원본 이미지를 업로드하고 WebViewLink 반환 시뮬레이션
      const mockDriveLink = `https://drive.google.com/file/d/mock-id-${Date.now()}/view`;
      resolve(mockDriveLink);
    }, 2000); 
  });
};

// 구현 코드 3: 브라우저 내부 즉시 압축 (Canvas API)
const createThumbnail = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let MAX_WIDTH = 800;
          let scaleSize = MAX_WIDTH / img.width;
          canvas.width = MAX_WIDTH;
          canvas.height = img.height * scaleSize;
          let ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          let quality = 0.8;
          let dataUrl = canvas.toDataURL('image/jpeg', quality);
          // 200KB (약 266KB Base64) 이하로 압축
          const TARGET_SIZE_BYTES = 200 * 1024 * 1.33; 
          while (dataUrl.length > TARGET_SIZE_BYTES && quality > 0.3) {
            quality -= 0.1;
            dataUrl = canvas.toDataURL('image/jpeg', quality);
          }
          if (dataUrl.length > TARGET_SIZE_BYTES) {
            canvas.width *= 0.7;
            canvas.height *= 0.7;
            ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            dataUrl = canvas.toDataURL('image/jpeg', 0.5);
          }
          resolve(dataUrl);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
};

const processImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          let canvas = document.createElement('canvas');
          let ctx = canvas.getContext('2d');
          let width = img.width;
          let height = img.height;
          const MAX_DIMENSION = 1600; 
          if (width > height) { if (width > MAX_DIMENSION) { height = Math.round(height * (MAX_DIMENSION / width)); width = MAX_DIMENSION; } } 
          else { if (height > MAX_DIMENSION) { width = Math.round(width * (MAX_DIMENSION / height)); height = MAX_DIMENSION; } }
          canvas.width = width; canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          const MAX_SIZE_BYTES = 1000000; 
          let quality = 0.9;
          let dataUrl = canvas.toDataURL('image/jpeg', quality);
          while (dataUrl.length > MAX_SIZE_BYTES * 1.33 && quality > 0.5) {
            quality -= 0.1; dataUrl = canvas.toDataURL('image/jpeg', quality);
          }
          resolve(dataUrl);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
};

// --- Calendar Helpers ---
const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();
const toISODate = (date) => {
  const offset = date.getTimezoneOffset() * 60000;
  return (new Date(date - offset)).toISOString().split('T')[0];
};

export default function App() {
  // --- Global View State ---
  const [currentView, setCurrentView] = useState('archive'); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [user, setUser] = useState(null);

  // --- 1. Archive State ---
  const [gallery, setGallery] = useState([]);
  const [categories, setCategories] = useState(['전체']);
  const [isAddingCategory, setIsAddingCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [isArchiveUploading, setIsArchiveUploading] = useState(false);
  const [archiveUploadProgress, setArchiveUploadProgress] = useState({ step: 0, text: '' });
  const [activeFilter, setActiveFilter] = useState('전체');
  const fileInputRef = useRef(null);
  const [editingTagsItem, setEditingTagsItem] = useState(null);
  const [tempTags, setTempTags] = useState([]);
  const [newTagInput, setNewTagInput] = useState('');

  // --- 2. Grid & Accounts State ---
  const [accounts, setAccounts] = useState(['메인 계정']);
  const [activeAccount, setActiveAccount] = useState('메인 계정');
  const [allGrids, setAllGrids] = useState([]); // Firestore Raw Data
  const [selectedPost, setSelectedPost] = useState(null); 
  const [lightboxPost, setLightboxPost] = useState(null); 
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0); 

  // --- 3. Posing Library State ---
  const [photos, setPhotos] = useState([]);
  const [isPosingUploadModalOpen, setIsPosingUploadModalOpen] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false); 
  const [selectedImages, setSelectedImages] = useState([]);
  const [isPosingUploading, setIsPosingUploading] = useState(false);
  const [viewingPhotoId, setViewingPhotoId] = useState(null); 
  const [editData, setEditData] = useState(null);
  const [uploadData, setUploadData] = useState({ headCount: 3, grandparents: 'none', parents: 'both', children: [], petCount: 0, memo: '' });
  const [filters, setFilters] = useState({ headCount: 'all', grandparents: 'all', parents: 'all', children: [], includePets: false, onlyFavorites: false });

  // --- 4. Thread State ---
  const [threadAccounts, setThreadAccounts] = useState(['메인 계정']);
  const [activeThreadAccount, setActiveThreadAccount] = useState('메인 계정');
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [threadDateRange, setThreadDateRange] = useState({ start: toISODate(new Date()), end: null });
  const [threads, setThreads] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const currentAccountThreads = threads.filter(t => (t.account || '메인 계정') === activeThreadAccount);
  const selectedThread = currentAccountThreads.find(t => t.id === activeThreadId);
  const [isEditingThread, setIsEditingThread] = useState(false);
  const [threadDraft, setThreadDraft] = useState({ text: '', media: [], date: toISODate(new Date()) });
  const [threadLightboxMedia, setThreadLightboxMedia] = useState(null);

  // --- 5. Blog State ---
  const [blogAccounts, setBlogAccounts] = useState(['메인 계정']);
  const [activeBlogAccount, setActiveBlogAccount] = useState('메인 계정');
  const [blogCalendarDate, setBlogCalendarDate] = useState(new Date());
  const [blogDateRange, setBlogDateRange] = useState({ start: toISODate(new Date()), end: null });
  const [blogs, setBlogs] = useState([]);
  const [activeBlogId, setActiveBlogId] = useState(null);
  const currentAccountBlogs = blogs.filter(b => (b.account || '메인 계정') === activeBlogAccount);
  const activeBlog = currentAccountBlogs.find(b => b.id === activeBlogId);

  // --- 6. Settings & Alerts State ---
  const [newAccountName, setNewAccountName] = useState('');
  const [newThreadAccountName, setNewThreadAccountName] = useState('');
  const [newBlogAccountName, setNewBlogAccountName] = useState('');
  const [aiPrompt, setAiPrompt] = useState(DEFAULT_AI_PROMPT);
  const [tempPrompt, setTempPrompt] = useState(DEFAULT_AI_PROMPT);
  const [alertMessage, setAlertMessage] = useState('');
  const [deleteConfirmAcc, setDeleteConfirmAcc] = useState(null);
  const [deleteConfirmThreadAcc, setDeleteConfirmThreadAcc] = useState(null);
  const [deleteConfirmBlogAcc, setDeleteConfirmBlogAcc] = useState(null);
  const [postDeleteConfirm, setPostDeleteConfirm] = useState(false);
  const [deleteConfirmCategory, setDeleteConfirmCategory] = useState(null);
  
  // 구글 드라이브 연동 상태 추가
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [driveAccount, setDriveAccount] = useState('');

  const dragItem = useRef();
  const dragOverItem = useRef();

  // ==========================================
  // [Firebase Auth & Data Fetching (Firestore Sync)]
  // ==========================================
  useEffect(() => {
    const initAuth = async () => {
        try {
            if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                await signInWithCustomToken(auth, __initial_auth_token);
            } else { await signInAnonymously(auth); }
        } catch (error) { console.error("Auth error:", error); await signInAnonymously(auth).catch(console.error); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    // 1. Settings Fetch (공용)
    const unsubSettings = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'general'), (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.accounts) setAccounts(data.accounts);
            if (data.threadAccounts) setThreadAccounts(data.threadAccounts);
            if (data.blogAccounts) setBlogAccounts(data.blogAccounts);
            if (data.aiPrompt) { setAiPrompt(data.aiPrompt); setTempPrompt(data.aiPrompt); }
            if (data.categories) setCategories(data.categories);
            if (data.isDriveConnected !== undefined) setIsDriveConnected(data.isDriveConnected);
            if (data.driveAccount !== undefined) setDriveAccount(data.driveAccount);
        }
    });

    // 2. Archive Gallery Fetch (공용)
    const qGallery = query(collection(db, 'artifacts', appId, 'public', 'data', 'gallery'), orderBy('createdAt', 'desc'));
    const unsubGallery = onSnapshot(qGallery, (snap) => setGallery(snap.docs.map(d => ({ id: d.id, ...d.data() }))), console.error);

    // 3. Grid Fetch (공용)
    const qGrids = query(collection(db, 'artifacts', appId, 'public', 'data', 'grids'), orderBy('order', 'asc'));
    const unsubGrids = onSnapshot(qGrids, (snap) => setAllGrids(snap.docs.map(d => ({ id: d.id, ...d.data() }))), console.error);

    // 4. Threads Fetch (공용)
    const qThreads = query(collection(db, 'artifacts', appId, 'public', 'data', 'threads'), orderBy('date', 'desc'));
    const unsubThreads = onSnapshot(qThreads, (snap) => setThreads(snap.docs.map(d => ({ id: d.id, ...d.data() }))), console.error);

    // 5. Blogs Fetch (공용)
    const qBlogs = query(collection(db, 'artifacts', appId, 'public', 'data', 'blogs'), orderBy('date', 'desc'));
    const unsubBlogs = onSnapshot(qBlogs, (snap) => setBlogs(snap.docs.map(d => ({ id: d.id, ...d.data() }))), console.error);

    // 6. Posing Library Fetch (공용 폴더로 변경)
    const qPosing = query(collection(db, 'artifacts', appId, 'public', 'data', 'posing_refs'), orderBy('createdAt', 'desc'));
    const unsubPosing = onSnapshot(qPosing, (snap) => setPhotos(snap.docs.map(d => ({ id: d.id, ...d.data() }))), console.error);

    return () => {
      unsubSettings(); unsubGallery(); unsubGrids(); unsubThreads(); unsubBlogs(); unsubPosing();
    };
  }, [user]);

  // Firestore DB에 전역 설정 저장 헬퍼
  const saveSettingsToDB = async (newSettings) => {
      if (!user) return;
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'general'), newSettings, { merge: true });
  };


  // ==========================================
  // [Archive 로직] Firestore 연동
  // ==========================================
  const handleArchiveUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB 제한
    if (file.size > MAX_FILE_SIZE) {
      setAlertMessage('파일 크기가 15MB를 초과합니다. 더 작은 이미지를 업로드해주세요.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    
    setIsArchiveUploading(true);
    
    // 1단계: 브라우저 내부 캔버스 압축 (200KB)
    setArchiveUploadProgress({ step: 1, text: '원본 이미지 로드 및 썸네일 압축 중...' });
    const thumbnailData = await createThumbnail(file);
    
    // 2단계: Gemini AI로 태그 추출
    setArchiveUploadProgress({ step: 2, text: 'Gemini AI 자동 태그 분석 중...' });
    const aiTags = await generateTagsWithGemini(thumbnailData, aiPrompt);
    const primaryTag = aiTags[0] || '기타';
    const numTag = aiTags.find(t => t.includes('인')) || 'N인';
    
    // 네이밍 룰에 따른 폴더명 조합
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
    const folderName = `${today}_${primaryTag}_고객명_${numTag}P`;
    
    // 3단계: 구글 드라이브 백엔드 업로드 시뮬레이션
    setArchiveUploadProgress({ step: 3, text: 'Google Drive 고화질 원본 전송 중...' });
    const driveLink = await uploadToGoogleDriveMock(file, folderName);
    
    // 4단계: Firestore 통합 메타데이터 저장
    setArchiveUploadProgress({ step: 4, text: 'Firestore DB 저장 중...' });
    const newImage = { 
      thumbnail: thumbnailData, 
      tags: aiTags, 
      folderName, 
      driveLink,
      createdAt: serverTimestamp() 
    };
    
    try {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'gallery'), newImage);
    } catch (err) {
        console.error("Firestore Upload Error", err);
        setAlertMessage("업로드 실패. 용량을 확인해주세요.");
    } finally {
        setIsArchiveUploading(false);
        setArchiveUploadProgress({ step: 0, text: '' });
        if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const filteredGallery = activeFilter === '전체' ? gallery : gallery.filter(img => img.tags.includes(activeFilter));

  const openTagEditor = (item) => { setEditingTagsItem(item); setTempTags([...item.tags]); setNewTagInput(''); };
  const handleAddTag = (e) => {
    e.preventDefault();
    if (!newTagInput.trim() || tempTags.includes(newTagInput.trim())) return;
    setTempTags([...tempTags, newTagInput.trim()]); setNewTagInput('');
  };
  const handleRemoveTag = (tagToRemove) => setTempTags(tempTags.filter(t => t !== tagToRemove));
  
  const handleSaveTags = async () => {
    if (!editingTagsItem) return;
    await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gallery', editingTagsItem.id), { tags: tempTags });
    setEditingTagsItem(null);
  };

  const handleDeleteArchive = async (id) => {
      if(!window.confirm('이 아카이브 사진을 삭제하시겠습니까?')) return;
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'gallery', id));
  }

  const handleAddCategory = async (e) => {
    e.preventDefault();
    const trimmedName = newCategoryName.trim();
    if (!trimmedName || categories.includes(trimmedName)) { setIsAddingCategory(false); return; }
    const newCategories = [...categories, trimmedName];
    await saveSettingsToDB({ categories: newCategories });
    setNewCategoryName(''); setIsAddingCategory(false);
  };

  const executeDeleteCategory = async () => {
    const updatedCategories = categories.filter(c => c !== deleteConfirmCategory);
    await saveSettingsToDB({ categories: updatedCategories });
    if (activeFilter === deleteConfirmCategory) setActiveFilter('전체');
    setDeleteConfirmCategory(null);
  };

  // ==========================================
  // [Grid 로직] Firestore 연동
  // ==========================================
  const currentGridPosts = allGrids.filter(p => p.account === activeAccount);
  
  const handleDragStart = (e, position) => { dragItem.current = position; };
  const handleDragEnter = (e, position) => { dragOverItem.current = position; };
  const handleDrop = async (e) => {
    e.preventDefault();
    if(dragItem.current === null || dragOverItem.current === null) return;
    
    const copyListItems = [...currentGridPosts];
    const dragItemContent = copyListItems[dragItem.current];
    copyListItems.splice(dragItem.current, 1);
    copyListItems.splice(dragOverItem.current, 0, dragItemContent);
    dragItem.current = null; dragOverItem.current = null;
    
    // DB Order 업데이트
    copyListItems.forEach(async (post, index) => {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'grids', post.id), { order: index });
    });
  };

  const handleGridImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const newImages = await Promise.all(files.map(file => createThumbnail(file)));
    if (selectedPost) setSelectedPost({ ...selectedPost, images: [...selectedPost.images, ...newImages] });
    else setSelectedPost({ id: Date.now().toString(), images: newImages, caption: '' });
  };
  
  const removeImageFromPost = (idx) => {
      setSelectedPost(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }));
  }

  const savePost = async () => {
    if (!selectedPost) return;
    try {
        const postData = { ...selectedPost, account: activeAccount, order: selectedPost.order ?? currentGridPosts.length, updatedAt: serverTimestamp() };
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'grids', selectedPost.id), postData);
        setSelectedPost(null);
    } catch(err) {
        setAlertMessage("그리드 저장에 실패했습니다. (용량 초과 가능성)");
    }
  };
  
  const executeDeletePost = async () => {
    if(!selectedPost) return;
    await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'grids', selectedPost.id));
    setSelectedPost(null); setPostDeleteConfirm(false);
  };

  // ==========================================
  // [Settings / Accounts 로직]
  // ==========================================
  const handleAddAccount = async (e) => {
    e.preventDefault();
    if (!newAccountName.trim()) return;
    if (accounts.includes(newAccountName.trim())) { setAlertMessage('이미 존재하는 계정 이름입니다.'); return; }
    
    const newName = newAccountName.trim();
    const newAccounts = [...accounts, newName];
    await saveSettingsToDB({ accounts: newAccounts });
    setNewAccountName('');
  };

  const handleDeleteAccount = (accountToDelete) => {
    if (accounts.length <= 1) { setAlertMessage('최소 1개의 계정은 유지해야 합니다.'); return; }
    setDeleteConfirmAcc(accountToDelete);
  };

  const executeDeleteAccount = async () => {
    const updatedAccounts = accounts.filter(acc => acc !== deleteConfirmAcc);
    await saveSettingsToDB({ accounts: updatedAccounts });
    if (activeAccount === deleteConfirmAcc) setActiveAccount(updatedAccounts[0]);
    setDeleteConfirmAcc(null);
    // 관련 그리드 삭제 로직 (실제 환경에서는 Cloud Functions 권장)
    allGrids.filter(p => p.account === deleteConfirmAcc).forEach(async p => {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'grids', p.id));
    });
  };

  const handleAddThreadAccount = async (e) => {
    e.preventDefault();
    if (!newThreadAccountName.trim()) return;
    if (threadAccounts.includes(newThreadAccountName.trim())) { setAlertMessage('이미 존재하는 스레드 계정 이름입니다.'); return; }
    const newAccounts = [...threadAccounts, newThreadAccountName.trim()];
    await saveSettingsToDB({ threadAccounts: newAccounts });
    setNewThreadAccountName('');
  };

  const handleDeleteThreadAccount = (acc) => {
    if (threadAccounts.length <= 1) { setAlertMessage('최소 1개의 계정은 유지해야 합니다.'); return; }
    setDeleteConfirmThreadAcc(acc);
  };

  const executeDeleteThreadAccount = async () => {
    const updated = threadAccounts.filter(acc => acc !== deleteConfirmThreadAcc);
    await saveSettingsToDB({ threadAccounts: updated });
    if (activeThreadAccount === deleteConfirmThreadAcc) setActiveThreadAccount(updated[0]);
    setDeleteConfirmThreadAcc(null);
    threads.filter(t => (t.account || '메인 계정') === deleteConfirmThreadAcc).forEach(async t => {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'threads', t.id));
    });
  };

  const handleAddBlogAccount = async (e) => {
    e.preventDefault();
    if (!newBlogAccountName.trim()) return;
    if (blogAccounts.includes(newBlogAccountName.trim())) { setAlertMessage('이미 존재하는 블로그 계정 이름입니다.'); return; }
    const newAccounts = [...blogAccounts, newBlogAccountName.trim()];
    await saveSettingsToDB({ blogAccounts: newAccounts });
    setNewBlogAccountName('');
  };

  const handleDeleteBlogAccount = (acc) => {
    if (blogAccounts.length <= 1) { setAlertMessage('최소 1개의 계정은 유지해야 합니다.'); return; }
    setDeleteConfirmBlogAcc(acc);
  };

  const executeDeleteBlogAccount = async () => {
    const updated = blogAccounts.filter(acc => acc !== deleteConfirmBlogAcc);
    await saveSettingsToDB({ blogAccounts: updated });
    if (activeBlogAccount === deleteConfirmBlogAcc) setActiveBlogAccount(updated[0]);
    setDeleteConfirmBlogAcc(null);
    blogs.filter(b => (b.account || '메인 계정') === deleteConfirmBlogAcc).forEach(async b => {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'blogs', b.id));
    });
  };

  // 구글 드라이브 연동 / 해제 로직 (시뮬레이션)
  const handleDriveConnect = async () => {
    // 실제 환경에서는 여기서 Google OAuth 팝업 호출
    await new Promise(r => setTimeout(r, 1000)); 
    await saveSettingsToDB({ isDriveConnected: true, driveAccount: 'studio.beanute@gmail.com' });
    setAlertMessage('Google Drive 연동이 완료되었습니다.');
  };

  const handleDriveDisconnect = async () => {
    if(!window.confirm('구글 드라이브 연동을 해제하시겠습니까?')) return;
    await saveSettingsToDB({ isDriveConnected: false, driveAccount: '' });
    setAlertMessage('Google Drive 연동이 해제되었습니다.');
  };

  // ==========================================
  // [Thread 로직] Firestore 연동
  // ==========================================
  const filteredThreads = currentAccountThreads.filter(t => {
    if (threadDateRange.end) return t.date >= threadDateRange.start && t.date <= threadDateRange.end;
    return t.date === threadDateRange.start;
  });

  const handleCalendarClick = (dateStr) => {
    if (!threadDateRange.start || (threadDateRange.start && threadDateRange.end)) { setThreadDateRange({ start: dateStr, end: null }); } 
    else {
      if (dateStr < threadDateRange.start) { setThreadDateRange({ start: dateStr, end: null }); } 
      else if (dateStr !== threadDateRange.start) { setThreadDateRange({ ...threadDateRange, end: dateStr }); }
    }
  };

  const handleThreadMediaUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const newMedia = [];
    for (const file of files) {
      if (file.size > 15 * 1024 * 1024) { setAlertMessage('15MB 이하 파일만 업로드 가능합니다.'); continue; }
      if (file.type.startsWith('video/')) {
        const videoUrl = URL.createObjectURL(file);
        newMedia.push({ type: 'video', url: videoUrl, file: file }); // 실제 Storage 도입 필요 영역
      } else if (file.type.startsWith('image/')) {
        const compressedUrl = await createThumbnail(file); 
        newMedia.push({ type: 'image', url: compressedUrl });
      }
    }
    setThreadDraft(prev => ({ ...prev, media: [...prev.media, ...newMedia] }));
  };

  const saveThread = async () => {
    if (!threadDraft.text.trim() && threadDraft.media.length === 0) return;
    
    const threadId = activeThreadId === 'new' ? Date.now().toString() : activeThreadId;
    const threadData = { ...threadDraft, account: activeThreadAccount, updatedAt: serverTimestamp() };
    
    try {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'threads', threadId), threadData);
        setActiveThreadId(threadId);
        setIsEditingThread(false);
    } catch(err) { setAlertMessage('저장에 실패했습니다.'); }
  };

  const deleteThread = async (id) => {
    if(window.confirm('이 쓰레드를 삭제하시겠습니까?')) {
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'threads', id));
      if (activeThreadId === id) setActiveThreadId(null);
    }
  };

  // ==========================================
  // [Blog 로직] Firestore 연동
  // ==========================================
  const filteredBlogs = currentAccountBlogs.filter(b => {
    if (blogDateRange.end) return b.date >= blogDateRange.start && b.date <= blogDateRange.end;
    return b.date === blogDateRange.start;
  });

  const handleBlogCalendarClick = (dateStr) => {
    if (!blogDateRange.start || (blogDateRange.start && blogDateRange.end)) { setBlogDateRange({ start: dateStr, end: null }); } 
    else {
      if (dateStr < blogDateRange.start) { setBlogDateRange({ start: dateStr, end: null }); } 
      else if (dateStr !== blogDateRange.start) { setBlogDateRange({ ...blogDateRange, end: dateStr }); }
    }
  };

  const createNewBlog = () => {
    const newBlogDate = blogDateRange.start || toISODate(new Date());
    const newBlogId = Date.now().toString();
    const newBlog = { id: newBlogId, title: '제목 없는 문서', link: '', date: newBlogDate, tags: [], blocks: [], account: activeBlogAccount };
    
    // 로컬 스테이트에 바로 추가 (Save 누르기 전)
    setBlogs([newBlog, ...blogs]);
    setActiveBlogId(newBlogId);
  };

  const updateActiveBlogLocally = (updatedBlog) => {
      setBlogs(blogs.map(b => b.id === updatedBlog.id ? updatedBlog : b));
  };

  const addBlogBlock = (type) => {
    if (!activeBlog) return;
    const defaultAlign = ['ul', 'ol', 'callout'].includes(type) ? 'left' : 'center';
    const newBlock = { id: Date.now().toString(), type, content: '', url: '', caption: '', align: defaultAlign };
    updateActiveBlogLocally({ ...activeBlog, blocks: [...activeBlog.blocks, newBlock] });
  };

  const updateBlogBlock = (blockId, field, value) => {
    if (!activeBlog) return;
    const newBlocks = activeBlog.blocks.map(bl => bl.id === blockId ? { ...bl, [field]: value } : bl);
    updateActiveBlogLocally({ ...activeBlog, blocks: newBlocks });
  };

  const removeBlogBlock = (blockId) => {
    if (!activeBlog) return;
    const newBlocks = activeBlog.blocks.filter(bl => bl.id !== blockId);
    updateActiveBlogLocally({ ...activeBlog, blocks: newBlocks });
  };

  const handleBlogImageUpload = async (e, blockId) => {
    const file = e.target.files[0];
    if (!file) return;
    const compressedUrl = await createThumbnail(file);
    updateBlogBlock(blockId, 'url', compressedUrl);
  };

  const saveBlogToDB = async () => {
      if(!activeBlog || !user) return;
      try {
          await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'blogs', activeBlog.id), { ...activeBlog, updatedAt: serverTimestamp() });
          setAlertMessage('문서가 안전하게 저장되었습니다.');
      } catch (err) {
          setAlertMessage('저장에 실패했습니다. 텍스트가 너무 길거나 이미지가 큽니다.');
      }
  }
  
  const deleteActiveBlog = async () => {
      if(!activeBlog || !window.confirm('이 문서를 데이터베이스에서 영구 삭제할까요?')) return;
      await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'blogs', activeBlog.id));
      setActiveBlogId(null);
  }


  // ==========================================
  // [Posing 로직] (공용 경로로 변경)
  // ==========================================
  const handlePosingFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    const MAX_FILE_SIZE = 15 * 1024 * 1024;
    const validFiles = files.filter(file => file.size <= MAX_FILE_SIZE);
    if (validFiles.length < files.length) setAlertMessage("15MB를 초과하는 파일은 제외되었습니다.");
    if (validFiles.length === 0) return;
    if (selectedImages.length + validFiles.length > 10) { setAlertMessage("한 번에 최대 10장까지만 업로드할 수 있습니다."); return; }
    try {
      const processedBase64Images = await Promise.all(validFiles.map(file => processImage(file)));
      setSelectedImages(prev => [...prev, ...processedBase64Images]);
    } catch (err) { setAlertMessage("이미지 처리 중 오류가 발생했습니다."); }
    e.target.value = '';
  };

  const removeSelectedImage = (indexToRemove) => setSelectedImages(prev => prev.filter((_, idx) => idx !== indexToRemove));
  
  const toggleUploadChildTag = (tagId) => setUploadData(prev => {
    const exists = prev.children.find(c => c.id === tagId);
    if (exists) return { ...prev, children: prev.children.filter(c => c.id !== tagId) };
    return { ...prev, children: [...prev.children, { id: tagId, count: 1 }] };
  });
  const handleUploadChildCountChange = (e, tagId, delta) => {
    e.stopPropagation();
    setUploadData(prev => ({ ...prev, children: prev.children.map(c => c.id === tagId ? { ...c, count: Math.max(1, c.count + delta) } : c) }));
  };
  const toggleUploadPet = () => setUploadData(prev => ({ ...prev, petCount: prev.petCount > 0 ? 0 : 1 }));
  const handleUploadPetCountChange = (e, delta) => { e.stopPropagation(); setUploadData(prev => ({ ...prev, petCount: Math.max(1, prev.petCount + delta) })); };

  const handleOpenEditModal = (e, photo) => {
    e.stopPropagation();
    setEditData({
      id: photo.id, headCount: photo.headCount || 1, grandparents: photo.grandparents || 'none', parents: photo.parents || 'none',
      children: photo.children || [], petCount: photo.petCount || 0, memo: photo.memo || '', imageUrl: photo.imageUrl
    });
  };

  const toggleEditChildTag = (tagId) => setEditData(prev => {
    const exists = prev.children.find(c => c.id === tagId);
    if (exists) return { ...prev, children: prev.children.filter(c => c.id !== tagId) };
    return { ...prev, children: [...prev.children, { id: tagId, count: 1 }] };
  });
  const handleEditChildCountChange = (e, tagId, delta) => {
    e.stopPropagation();
    setEditData(prev => ({ ...prev, children: prev.children.map(c => c.id === tagId ? { ...c, count: Math.max(1, c.count + delta) } : c) }));
  };
  const toggleEditPet = () => setEditData(prev => ({ ...prev, petCount: prev.petCount > 0 ? 0 : 1 }));
  const handleEditPetCountChange = (e, delta) => { e.stopPropagation(); setEditData(prev => ({ ...prev, petCount: Math.max(1, prev.petCount + delta) })); };

  const handlePosingEditSave = async () => {
    if (!editData || !user) return;
    setIsPosingUploading(true);
    try {
      const childrenTags = editData.children.map(c => c.id);
      // 공용 데이터 저장 경로로 변경 (artifacts/appId/public/data/posing_refs)
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'posing_refs', editData.id), {
        headCount: parseInt(editData.headCount), grandparents: editData.grandparents, parents: editData.parents,
        children: editData.children, childrenTags: childrenTags, petCount: editData.petCount, memo: editData.memo,
      });
      setEditData(null);
    } catch (error) { setAlertMessage("수정 중 오류가 발생했습니다."); } 
    finally { setIsPosingUploading(false); }
  };

  const toggleFilterChildTag = (tagId) => setFilters(prev => {
    const exists = prev.children.find(c => c.id === tagId);
    if (exists) return { ...prev, children: prev.children.filter(c => c.id !== tagId) };
    return { ...prev, children: [...prev.children, { id: tagId, count: 1 }] };
  });
  const handleFilterChildCountChange = (e, tagId, delta) => {
    e.stopPropagation();
    setFilters(prev => ({ ...prev, children: prev.children.map(c => c.id === tagId ? { ...c, count: Math.max(1, c.count + delta) } : c) }));
  };

  const handlePosingUpload = async () => {
    if (selectedImages.length === 0 || !user) return;
    setIsPosingUploading(true);
    try {
      const childrenTags = uploadData.children.map(c => c.id);
      const commonData = {
        headCount: parseInt(uploadData.headCount), grandparents: uploadData.grandparents, parents: uploadData.parents,
        children: uploadData.children, childrenTags: childrenTags, petCount: uploadData.petCount, memo: uploadData.memo, 
        isFavorite: false, createdAt: serverTimestamp(),
      };
      // 공용 데이터 저장 경로로 변경 (artifacts/appId/public/data/posing_refs)
      const uploadPromises = selectedImages.map(imgDataUrl => addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'posing_refs'), { imageUrl: imgDataUrl, ...commonData }));
      await Promise.all(uploadPromises);
      setIsPosingUploadModalOpen(false);
      setSelectedImages([]);
      setUploadData({ headCount: 3, grandparents: 'none', parents: 'both', children: [], petCount: 0, memo: '' });
    } catch (error) { setAlertMessage("일부 이미지 저장에 실패했습니다. (용량 제한 등)"); } 
    finally { setIsPosingUploading(false); }
  };

  const handlePosingDelete = async (e, docId) => {
    e.stopPropagation(); 
    if (!window.confirm('이 레퍼런스를 삭제하시겠습니까?')) return;
    // 공용 데이터 경로에서 삭제
    try { await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'posing_refs', docId)); if (viewingPhotoId === docId) setViewingPhotoId(null); } catch (e) { console.error(e); }
  };

  const handleToggleFavorite = async (e, docId, currentStatus) => {
    e.stopPropagation();
    if (!user) return;
    // 공용 데이터 경로에서 업데이트
    try { await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'posing_refs', docId), { isFavorite: !currentStatus }); } catch (error) { console.error(error); }
  };

  const filteredPhotos = useMemo(() => {
    return photos.filter(photo => {
      if (filters.onlyFavorites && !photo.isFavorite) return false;
      if (filters.headCount !== 'all' && photo.headCount !== parseInt(filters.headCount)) return false;
      if (filters.grandparents !== 'all' && photo.grandparents !== filters.grandparents) return false;
      if (filters.parents !== 'all' && photo.parents !== filters.parents) return false;
      if (filters.includePets && (!photo.petCount || photo.petCount < 1)) return false;
      if (filters.children.length > 0) {
        const hasMatch = filters.children.every(filterChild => {
            if (photo.children && typeof photo.children[0] !== 'string') {
                const match = photo.children.find(pc => pc.id === filterChild.id);
                return match && match.count === filterChild.count;
            } else { return (photo.childrenTags || photo.children || []).includes(filterChild.id); }
        });
        if (!hasMatch) return false;
      }
      return true;
    });
  }, [photos, filters]);
  
  const activeFilterCount = useMemo(() => {
      let count = 0;
      if (filters.onlyFavorites) count++;
      if (filters.headCount !== 'all') count++;
      if (filters.grandparents !== 'all') count++;
      if (filters.parents !== 'all') count++;
      if (filters.includePets) count++;
      count += filters.children.length;
      return count;
  }, [filters]);

  const handleNextPhoto = (e) => { e?.stopPropagation(); if (!viewingPhotoId) return; const idx = filteredPhotos.findIndex(p => p.id === viewingPhotoId); if (idx > -1) setViewingPhotoId(filteredPhotos[(idx + 1) % filteredPhotos.length].id); };
  const handlePrevPhoto = (e) => { e?.stopPropagation(); if (!viewingPhotoId) return; const idx = filteredPhotos.findIndex(p => p.id === viewingPhotoId); if (idx > -1) setViewingPhotoId(filteredPhotos[(idx - 1 + filteredPhotos.length) % filteredPhotos.length].id); };
  
  const touchStart = useRef(null);
  const touchEnd = useRef(null);
  const onTouchStart = (e) => { touchEnd.current = null; touchStart.current = e.targetTouches[0].clientX; };
  const onTouchMove = (e) => { touchEnd.current = e.targetTouches[0].clientX; };
  const onTouchEnd = () => {
    if (!touchStart.current || !touchEnd.current) return;
    const distance = touchStart.current - touchEnd.current;
    if (distance > 50) handleNextPhoto();
    if (distance < -50) handlePrevPhoto();
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
        if (!viewingPhotoId) return;
        if (e.key === 'ArrowRight') handleNextPhoto();
        if (e.key === 'ArrowLeft') handlePrevPhoto();
        if (e.key === 'Escape') setViewingPhotoId(null);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [viewingPhotoId, filteredPhotos]);

  const getLabel = (options, value) => options.find(o => o.value === value)?.label || value;
  
  const renderChildTag = (childItem) => {
    if (typeof childItem === 'string') {
        const label = CHILD_OPTIONS.find(c => c.id === childItem)?.label.split(' ')[0] + ' ' + CHILD_OPTIONS.find(c => c.id === childItem)?.label.split(' ')[1];
        return <span className="text-[10px] md:text-xs bg-neutral-700 px-1.5 py-0.5 rounded text-neutral-300">{label}</span>;
    }
    const label = CHILD_OPTIONS.find(c => c.id === childItem.id)?.label.split(' ')[0] + ' ' + CHILD_OPTIONS.find(c => c.id === childItem.id)?.label.split(' ')[1];
    return (
        <span className="text-[10px] md:text-xs bg-neutral-700 px-1.5 py-0.5 rounded text-neutral-300 flex items-center gap-1">
            {label}
            {childItem.count > 1 && <span className="text-lime-400 font-bold text-[10px] bg-neutral-800 px-1 rounded-full">{childItem.count}</span>}
        </span>
    );
  };

  const viewingPhoto = useMemo(() => filteredPhotos.find(p => p.id === viewingPhotoId), [filteredPhotos, viewingPhotoId]);

  // --- Shared Filter Content Component ---
  const FilterContentControls = () => (
    <div className="space-y-6">
      <div className="bg-lime-400/5 p-3 rounded-lg border border-lime-400/20">
        <button onClick={() => setFilters(prev => ({...prev, onlyFavorites: !prev.onlyFavorites}))} className="w-full flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-lime-400 font-medium"><Heart className={`w-4 h-4 ${filters.onlyFavorites ? 'fill-lime-400 text-lime-400' : ''}`} />즐겨찾는 시안만 보기</div>
            <div className={`w-8 h-4 rounded-full transition-colors relative ${filters.onlyFavorites ? 'bg-lime-400' : 'bg-neutral-700'}`}>
                <div className={`absolute top-0.5 left-0.5 w-3 h-3 bg-neutral-950 rounded-full transition-transform ${filters.onlyFavorites ? 'translate-x-4' : ''}`} />
            </div>
        </button>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">총 인원수</label>
        <select value={filters.headCount} onChange={(e) => setFilters({...filters, headCount: e.target.value})} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg p-2.5 focus:border-lime-500 outline-none text-sm transition-colors">
          <option value="all">모든 인원</option>
          {[...Array(20)].map((_, i) => (<option key={i} value={i + 1}>{i + 1}인</option>))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">조부모 구성</label>
        <select value={filters.grandparents} onChange={(e) => setFilters({...filters, grandparents: e.target.value})} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg p-2.5 focus:border-lime-500 outline-none text-sm">
          <option value="all">전체</option>
          {GRANDPARENT_OPTIONS.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">부모 구성</label>
        <select value={filters.parents} onChange={(e) => setFilters({...filters, parents: e.target.value})} className="w-full bg-neutral-900 border border-neutral-600 rounded-lg p-2.5 focus:border-lime-500 outline-none text-sm">
          <option value="all">전체</option>
          {PARENT_OPTIONS.map(opt => (<option key={opt.value} value={opt.value}>{opt.label}</option>))}
        </select>
      </div>

      <div className="space-y-3">
        <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">자녀 구성 및 인원</label>
        <div className="flex flex-col gap-2">
          {CHILD_OPTIONS.map(child => {
            const selectedItem = filters.children.find(c => c.id === child.id);
            const isSelected = !!selectedItem;
            const count = selectedItem ? selectedItem.count : 0;
            return (
                <div key={child.id} className={`rounded-lg border transition-all overflow-hidden flex flex-col ${isSelected ? 'bg-lime-400/10 border-lime-400' : 'bg-neutral-900 border-neutral-700 hover:border-neutral-500'}`}>
                  <button onClick={() => toggleFilterChildTag(child.id)} className={`w-full p-2.5 text-left flex items-center gap-2 ${isSelected ? 'text-white' : 'text-neutral-400'}`}>
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${isSelected ? 'border-lime-400 bg-lime-400' : 'border-neutral-600'}`}>
                          {isSelected && <Check className="w-3 h-3 text-neutral-950" />}
                      </div>
                      <span className="truncate text-sm">{child.label}</span>
                  </button>
                  {isSelected && (
                      <div className="flex items-center justify-between bg-lime-900/30 px-3 py-1.5 border-t border-lime-500/30">
                          <span className="text-xs text-lime-400 font-semibold">{count}명</span>
                          <div className="flex items-center gap-1">
                              <button onClick={(e) => handleFilterChildCountChange(e, child.id, -1)} className="p-1 hover:bg-lime-500/20 rounded text-lime-400" disabled={count <= 1}><Minus className="w-3 h-3" /></button>
                              <button onClick={(e) => handleFilterChildCountChange(e, child.id, 1)} className="p-1 hover:bg-lime-500/20 rounded text-lime-400"><Plus className="w-3 h-3" /></button>
                          </div>
                      </div>
                  )}
                </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold text-neutral-400 uppercase tracking-wider">반려동물</label>
        <button onClick={() => setFilters(prev => ({...prev, includePets: !prev.includePets}))} className={`w-full p-2.5 rounded-lg border flex items-center gap-2 transition-all ${filters.includePets ? 'bg-lime-400/10 border-lime-400 text-white' : 'bg-neutral-900 border-neutral-700 text-neutral-400 hover:border-neutral-500'}`}>
            <div className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 ${filters.includePets ? 'border-lime-400 bg-lime-400' : 'border-neutral-600'}`}>
                {filters.includePets && <Check className="w-3 h-3 text-neutral-950" />}
            </div>
            <Dog className="w-4 h-4" />
            <span className="text-sm">반려견 포함</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-neutral-950 text-neutral-200 font-sans selection:bg-lime-500/30 overflow-hidden">
      
      {/* ==========================================
          [좌측] 사이드바 (Sidebar Menu)
          ========================================== */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-neutral-900 border-r border-neutral-800 flex flex-col shrink-0 transition-all duration-300 z-50`}>
        <div className={`p-4 md:p-6 flex items-center ${isSidebarOpen ? 'justify-between' : 'justify-center'} border-b border-neutral-800`}>
          {isSidebarOpen && (
            <h1 className="text-2xl font-bold text-white flex flex-col gap-1 overflow-hidden whitespace-nowrap">
              <span>Beanute</span>
              <span className="text-lime-400 text-sm">Studio Workspace</span>
            </h1>
          )}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition-colors flex-shrink-0">
            <Menu size={24} />
          </button>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4 overflow-y-auto custom-scrollbar">
          {isSidebarOpen ? (
            <div className="text-xs font-semibold text-neutral-500 mb-4 px-2 tracking-wider">WORKSPACE</div>
          ) : (
            <div className="h-6"></div>
          )}
          
          <button onClick={() => setCurrentView('archive')} title={!isSidebarOpen ? 'AI Archive' : ''} className={`w-full flex items-center ${isSidebarOpen ? 'gap-3 px-4 justify-start' : 'justify-center px-0'} py-3 rounded-xl transition-all font-medium ${currentView === 'archive' ? 'bg-lime-400 text-neutral-950 shadow-lg shadow-lime-500/10' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>
            <Folder size={20} className="shrink-0" /> 
            {isSidebarOpen && <span className="whitespace-nowrap">AI Archive</span>}
          </button>
          
          <button onClick={() => setCurrentView('grid')} title={!isSidebarOpen ? 'IG Grid' : ''} className={`w-full flex items-center ${isSidebarOpen ? 'gap-3 px-4 justify-start' : 'justify-center px-0'} py-3 rounded-xl transition-all font-medium ${currentView === 'grid' ? 'bg-lime-400 text-neutral-950 shadow-lg shadow-lime-500/10' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>
            <LayoutGrid size={20} className="shrink-0" /> 
            {isSidebarOpen && <span className="whitespace-nowrap">IG Grid</span>}
          </button>

          <button onClick={() => setCurrentView('thread')} title={!isSidebarOpen ? 'Thread' : ''} className={`w-full flex items-center ${isSidebarOpen ? 'gap-3 px-4 justify-start' : 'justify-center px-0'} py-3 rounded-xl transition-all font-medium ${currentView === 'thread' ? 'bg-lime-400 text-neutral-950 shadow-lg shadow-lime-500/10' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>
            <MessageCircle size={20} className="shrink-0" /> 
            {isSidebarOpen && <span className="whitespace-nowrap">Thread</span>}
          </button>

          <button onClick={() => setCurrentView('blog')} title={!isSidebarOpen ? 'Blog' : ''} className={`w-full flex items-center ${isSidebarOpen ? 'gap-3 px-4 justify-start' : 'justify-center px-0'} py-3 rounded-xl transition-all font-medium ${currentView === 'blog' ? 'bg-lime-400 text-neutral-950 shadow-lg shadow-lime-500/10' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>
            <FileText size={20} className="shrink-0" /> 
            {isSidebarOpen && <span className="whitespace-nowrap">Blog</span>}
          </button>

          {isSidebarOpen ? (
            <div className="text-xs font-semibold text-neutral-500 mt-8 mb-4 px-2 tracking-wider">LIBRARY</div>
          ) : (
            <div className="h-6 mt-4"></div>
          )}
          
          <button onClick={() => setCurrentView('posing')} title={!isSidebarOpen ? 'Posing Library' : ''} className={`w-full flex items-center ${isSidebarOpen ? 'gap-3 px-4 justify-start' : 'justify-center px-0'} py-3 rounded-xl transition-all font-medium ${currentView === 'posing' ? 'bg-lime-400 text-neutral-950 shadow-lg shadow-lime-500/10' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'}`}>
            <Camera size={20} className="shrink-0" /> 
            {isSidebarOpen && <span className="whitespace-nowrap">Posing Library</span>}
          </button>

          {isSidebarOpen ? (
            <div className="text-xs font-semibold text-neutral-500 mt-8 mb-4 px-2 tracking-wider">SYSTEM</div>
          ) : (
            <div className="h-6 mt-4"></div>
          )}
          
          <button onClick={() => setCurrentView('settings')} title={!isSidebarOpen ? '환경 설정' : ''} className={`w-full flex items-center ${isSidebarOpen ? 'gap-3 px-4 justify-start' : 'justify-center px-0'} py-3 rounded-xl transition-all font-medium ${currentView === 'settings' ? 'bg-neutral-800 text-white border border-neutral-700' : 'text-neutral-500 hover:bg-neutral-800 hover:text-white border border-transparent'}`}>
            <Settings size={20} className="shrink-0" /> 
            {isSidebarOpen && <span className="whitespace-nowrap">환경 설정</span>}
          </button>
        </nav>

        <div className="p-4 border-t border-neutral-800 shrink-0">
          <div className={`bg-neutral-950 rounded-xl flex flex-col justify-center ${isSidebarOpen ? 'p-4 space-y-2' : 'p-2 py-4 space-y-4 items-center'}`}>
            {isSidebarOpen ? (
              <>
                <div className="flex items-center gap-2 text-xs text-neutral-400">
                  <HardDrive size={14} className={isDriveConnected ? "text-lime-400 shrink-0" : "text-neutral-600 shrink-0"}/> 
                  <span className="whitespace-nowrap">{isDriveConnected ? 'Drive 연동됨' : 'Drive 미연동'}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-neutral-400">
                  <BrainCircuit size={14} className="text-purple-400 shrink-0"/> <span className="whitespace-nowrap">Gemini AI 활성</span>
                </div>
              </>
            ) : (
              <>
                <HardDrive size={18} className={isDriveConnected ? "text-lime-400 shrink-0" : "text-neutral-600 shrink-0"} title={isDriveConnected ? "Drive 연동됨" : "Drive 미연동"}/>
                <BrainCircuit size={18} className="text-purple-400 shrink-0" title="Gemini AI 활성"/>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* ==========================================
          [우측] 메인 콘텐츠 영역
          ========================================== */}
      <main className="flex-1 overflow-y-auto relative bg-neutral-950">
        <div className={`mx-auto ${currentView === 'blog' || currentView === 'thread' ? 'max-w-7xl' : 'max-w-6xl'} p-4 md:p-8 h-full`}>
          
          {/* --------------------------------------
              View 1: AI Archive
              -------------------------------------- */}
          {currentView === 'archive' && (
            <div className="space-y-10 animate-in fade-in duration-500 pb-24">
              <header>
                <h2 className="text-3xl font-bold text-white mb-2">AI Archive</h2>
                <p className="text-neutral-400">원본 업로드 및 스마트 자동 분류 시스템</p>
              </header>

              <section className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-lime-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10">
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-white">
                    <UploadCloud className="text-lime-400" />새로운 촬영 원본 업로드
                  </h3>
                  {!isArchiveUploading ? (
                    <label className="border-2 border-dashed border-neutral-700 hover:border-lime-500/50 bg-neutral-950/50 rounded-2xl p-12 flex flex-col items-center justify-center cursor-pointer transition-colors group">
                      <div className="bg-neutral-800 p-4 rounded-full mb-4 group-hover:scale-110 transition-transform">
                        <UploadCloud size={32} className="text-lime-400" />
                      </div>
                      <p className="text-lg font-medium text-neutral-300">클릭하여 사진을 선택하세요 (최대 15MB 원본)</p>
                      <p className="text-sm text-neutral-500 mt-2">썸네일 압축(200KB), AI 자동 태깅, 구글 드라이브 전송이 진행됩니다.</p>
                      <input type="file" accept="image/*" className="hidden" onChange={handleArchiveUpload} ref={fileInputRef}/>
                    </label>
                  ) : (
                    <div className="border border-neutral-800 bg-neutral-950 rounded-2xl p-8 flex flex-col justify-center">
                      <div className="flex justify-between text-sm mb-4 text-neutral-400">
                        <span className={archiveUploadProgress.step >= 1 ? "text-lime-400" : ""}>1. 썸네일 압축</span>
                        <span className={archiveUploadProgress.step >= 2 ? "text-purple-400 font-bold" : ""}>2. AI 태깅</span>
                        <span className={archiveUploadProgress.step >= 3 ? "text-blue-400" : ""}>3. Drive 전송</span>
                        <span className={archiveUploadProgress.step >= 4 ? "text-lime-400 font-bold" : ""}>4. DB 저장</span>
                      </div>
                      <div className="w-full bg-neutral-800 rounded-full h-3 overflow-hidden mb-6">
                        <div className="h-full bg-gradient-to-r from-lime-400 to-green-500 transition-all duration-500" style={{ width: `${(archiveUploadProgress.step / 4) * 100}%` }}/>
                      </div>
                      <div className="flex items-center gap-3 text-white justify-center">
                        <div className="w-5 h-5 border-2 border-lime-400 border-t-transparent rounded-full animate-spin" />
                        <p className="text-lg font-medium">{archiveUploadProgress.text}</p>
                      </div>
                    </div>
                  )}
                </div>
              </section>

              <section>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                  <h3 className="text-xl font-semibold flex items-center gap-2 text-white"><Folder className="text-lime-400" />아카이브</h3>
                  <div className="flex flex-wrap gap-2 items-center">
                    <Filter size={20} className="text-neutral-500 mr-2 self-center" />
                    {categories.map(cat => (
                      <div key={cat} onClick={() => setActiveFilter(cat)} className={`flex items-center px-4 py-1.5 rounded-full text-sm font-medium transition-colors cursor-pointer group ${activeFilter === cat ? 'bg-lime-400 text-neutral-950' : 'bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-white'}`}>
                        {cat}
                        {cat !== '전체' && (<button onClick={(e) => { e.stopPropagation(); setDeleteConfirmCategory(cat); }} className={`ml-2 -mr-1 p-0.5 rounded-full transition-colors opacity-0 group-hover:opacity-100 ${activeFilter === cat ? 'hover:bg-lime-500/50 text-neutral-950' : 'hover:bg-neutral-600 text-neutral-400 hover:text-red-400'}`}><X size={12} /></button>)}
                      </div>
                    ))}
                    {isAddingCategory ? (
                      <form onSubmit={handleAddCategory} className="flex items-center ml-1">
                        <input type="text" autoFocus value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} onBlur={() => { if (!newCategoryName.trim()) setIsAddingCategory(false); }} placeholder="태그명 입력 후 엔터" className="bg-neutral-800 border border-lime-500 text-neutral-200 px-3 py-1.5 rounded-full text-sm w-36 focus:outline-none transition-colors" />
                      </form>
                    ) : (<button onClick={() => setIsAddingCategory(true)} className="px-3 py-1.5 rounded-full text-sm font-medium border border-dashed border-neutral-600 text-neutral-400 hover:text-lime-400 hover:border-lime-400 transition-colors flex items-center gap-1 ml-1"><Plus size={14} /> 추가</button>)}
                  </div>
                </div>

                {filteredGallery.length > 0 ? (
                  <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
                    {filteredGallery.map((item) => (
                      <div key={item.id} className="break-inside-avoid bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden group hover:border-neutral-600 transition-colors">
                        <div className="relative">
                          <img src={item.thumbnail} alt="Thumbnail" className="w-full h-auto object-cover bg-neutral-800" />
                          <div className="absolute inset-0 bg-gradient-to-t from-neutral-950/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-4">
                            <a href={item.driveLink} target="_blank" rel="noreferrer" className="flex-1 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white py-2 rounded-lg font-medium text-sm border border-white/20 flex items-center justify-center gap-2 transition-colors mr-2">
                                <HardDrive size={16} /> 원본 다운로드 (Drive)
                            </a>
                            <button onClick={() => handleDeleteArchive(item.id)} className="bg-red-500/80 hover:bg-red-600 backdrop-blur-sm text-white p-2 rounded-lg transition-colors"><Trash2 size={16} /></button>
                          </div>
                        </div>
                        <div className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex flex-wrap gap-1.5 flex-1 pr-2">
                              {item.tags.map((tag, idx) => (<span key={idx} className="bg-neutral-800 border border-neutral-700/50 text-xs px-2 py-1 rounded-md text-lime-400 font-medium">#{tag}</span>))}
                            </div>
                            <button onClick={() => openTagEditor(item)} className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-lime-400 rounded-md transition-colors shrink-0"><Edit2 size={14} /></button>
                          </div>
                          <p className="text-xs text-neutral-500 flex items-center gap-1 font-mono break-all"><Folder size={12} /> {item.folderName}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (<div className="text-center py-20 bg-neutral-900 border border-neutral-800 rounded-2xl"><Search size={48} className="text-neutral-600 mx-auto mb-4" /><p className="text-neutral-400">데이터베이스에 저장된 사진이 없습니다.</p></div>)}
              </section>
            </div>
          )}

          {/* --------------------------------------
              View 2: IG Grid
              -------------------------------------- */}
          {currentView === 'grid' && (
            <div className="space-y-8 animate-in fade-in duration-500 flex flex-col items-center pb-24">
              <header className="w-full max-w-3xl flex flex-col gap-6">
                <div><h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3"><Instagram className="text-lime-400" size={32} /> Instagram Grid</h2><p className="text-neutral-400">업로드 전 4:5 비율로 피드 배열과 캡션을 미리 구성해보세요.</p></div>
                <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {accounts.map(acc => (<button key={acc} onClick={() => setActiveAccount(acc)} className={`px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${activeAccount === acc ? 'bg-neutral-800 text-lime-400 border border-neutral-700' : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900'}`}>{acc}</button>))}
                  </div>
                  <button onClick={() => setSelectedPost({ id: Date.now().toString(), images: [], caption: '' })} className="shrink-0 bg-lime-400 text-neutral-950 px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-lime-500 transition-colors ml-4"><Plus size={16} /> 새 게시물</button>
                </div>
              </header>

              <div className="w-full max-w-3xl bg-neutral-900 border border-neutral-800 p-1 rounded-xl">
                <div className="grid grid-cols-3 gap-1">
                  {currentGridPosts.map((post, index) => (
                    <div key={post.id} draggable onDragStart={(e) => handleDragStart(e, index)} onDragEnter={(e) => handleDragEnter(e, index)} onDragEnd={handleDrop} onDragOver={(e) => e.preventDefault()} onClick={() => setSelectedPost(post)} className="group relative bg-neutral-800 aspect-[4/5] cursor-grab active:cursor-grabbing hover:opacity-90 transition-opacity overflow-hidden">
                      {post.images && post.images.length > 0 ? (<img src={post.images[0]} alt="Post" className="w-full h-full object-cover pointer-events-none" />) : (<div className="w-full h-full flex flex-col items-center justify-center text-neutral-600"><ImageIcon size={32} className="mb-2" /><span className="text-xs font-medium">No Image</span></div>)}
                      {post.images && post.images.length > 1 && (<button onClick={(e) => { e.stopPropagation(); setLightboxPost(post); setCurrentSlideIndex(0); }} className="absolute top-2 right-2 drop-shadow-md z-10 hover:scale-110 transition-transform cursor-pointer group/layer"><Layers size={22} className="text-white fill-white/20 group-hover/layer:text-lime-400 transition-colors" /></button>)}
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center pointer-events-none transition-opacity"><GripHorizontal size={32} className="text-white drop-shadow-lg" /></div>
                    </div>
                  ))}
                  {Array.from({ length: Math.max(0, 9 - currentGridPosts.length) }).map((_, i) => (<div key={`empty-${i}`} className="bg-neutral-900 aspect-[4/5] flex items-center justify-center border border-dashed border-neutral-800"><ImageIcon size={24} className="text-neutral-800" /></div>))}
                </div>
              </div>
            </div>
          )}

          {/* --------------------------------------
              View 3: Thread
              -------------------------------------- */}
          {currentView === 'thread' && (
            <div className="h-full flex flex-col animate-in fade-in duration-500 pb-8">
              <header className="mb-6 flex flex-col gap-4 shrink-0">
                <div>
                  <h2 className="text-3xl font-bold text-white flex items-center gap-3"><MessageCircle className="text-lime-400" size={32} /> Thread</h2>
                  <p className="text-neutral-400 mt-2">계정별로 스레드 콘텐츠를 기획하고 관리하세요.</p>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide border-b border-neutral-800">
                  {threadAccounts.map(acc => (<button key={acc} onClick={() => { setActiveThreadAccount(acc); setActiveThreadId(null); }} className={`px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${activeThreadAccount === acc ? 'bg-neutral-800 text-lime-400 border border-neutral-700' : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900'}`}>{acc}</button>))}
                </div>
              </header>

              <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0">
              {/* Left Panel: Calendar & List */}
              <div className="w-full md:w-[320px] bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col shrink-0">
                
                {/* Thread Calendar */}
                <div className="mb-2">
                  <div className="flex justify-between items-center mb-4 px-2">
                    <h3 className="font-bold text-sm text-white">
                      {currentCalendarDate.getFullYear()}년 {currentCalendarDate.getMonth() + 1}월
                    </h3>
                    <div className="flex gap-1">
                      <button onClick={() => setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() - 1, 1))} className="p-1 bg-neutral-800 rounded hover:bg-neutral-700 text-white"><ChevronLeft size={14}/></button>
                      <button onClick={() => setCurrentCalendarDate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth() + 1, 1))} className="p-1 bg-neutral-800 rounded hover:bg-neutral-700 text-white"><ChevronRight size={14}/></button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-7 gap-1 text-center mb-1">
                    {['일', '월', '화', '수', '목', '금', '토'].map(day => <div key={day} className="text-[10px] font-semibold text-neutral-500">{day}</div>)}
                  </div>
                  
                  <div className="grid grid-cols-7 gap-0.5">
                    {Array.from({ length: getFirstDayOfMonth(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth()) }).map((_, i) => <div key={`empty-${i}`} />)}
                    {Array.from({ length: getDaysInMonth(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth()) }).map((_, i) => {
                      const day = i + 1;
                      const dateStr = toISODate(new Date(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth(), day));
                      
                      const isStart = dateStr === threadDateRange.start;
                      const isEnd = dateStr === threadDateRange.end;
                      const isSelected = isStart || isEnd;
                      const isInRange = threadDateRange.end && dateStr > threadDateRange.start && dateStr < threadDateRange.end;

                      const hasThread = currentAccountThreads.some(t => t.date === dateStr);
                      const isToday = dateStr === toISODate(new Date());

                      return (
                        <div key={day} className="aspect-square w-full relative p-0.5">
                          {isInRange && <div className="absolute inset-y-0.5 -inset-x-0 bg-lime-400/20" />}
                          {isStart && threadDateRange.end && <div className="absolute inset-y-0.5 right-0 w-1/2 bg-lime-400/20" />}
                          {isEnd && <div className="absolute inset-y-0.5 left-0 w-1/2 bg-lime-400/20" />}

                          <button
                            onClick={() => handleCalendarClick(dateStr)}
                            className={`
                              w-full h-full flex flex-col items-center justify-center rounded-lg relative text-xs transition-all z-10
                              ${isSelected ? 'bg-lime-400 text-neutral-950 font-bold shadow-md' : isInRange ? 'text-lime-400 font-bold hover:bg-lime-400/30' : 'text-neutral-300 hover:bg-neutral-800'}
                              ${isToday && !isSelected && !isInRange ? 'border border-lime-400/50' : ''}
                            `}
                          >
                            <span>{day}</span>
                            {hasThread && <div className={`w-1 h-1 rounded-full absolute bottom-1 ${isSelected ? 'bg-neutral-950' : 'bg-lime-400'}`} />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <hr className="border-neutral-800 my-4" />

                <div className="flex items-center justify-between mb-4 px-2">
                  <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                    <MessageCircle size={16} className="text-lime-400"/> 스레드 ({filteredThreads.length})
                  </h3>
                  <button 
                    onClick={() => { setThreadDraft({ text: '', media: [], date: threadDateRange.start || toISODate(new Date()) }); setActiveThreadId('new'); setIsEditingThread(false); }} 
                    className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors" title="새 스레드 작성"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                
                <div className="space-y-1 overflow-y-auto flex-1 custom-scrollbar pr-1">
                  {filteredThreads.length === 0 ? (
                    <div className="text-center py-8 text-neutral-500 text-xs">선택한 기간에<br/>DB에 등록된 스레드가 없습니다.</div>
                  ) : (
                    filteredThreads.map(thread => (
                      <button
                        key={thread.id}
                        onClick={() => { setActiveThreadId(thread.id); setIsEditingThread(false); }}
                        className={`w-full text-left p-3 rounded-xl transition-all flex flex-col gap-1 border border-transparent ${activeThreadId === thread.id ? 'bg-lime-400/10 border-lime-400/20' : 'hover:bg-neutral-800'}`}
                      >
                        <div className={`font-medium text-sm line-clamp-2 ${activeThreadId === thread.id ? 'text-lime-400' : 'text-neutral-200'}`}>
                          {thread.text || '(텍스트 없음)'}
                        </div>
                        <div className="text-xs text-neutral-500 flex items-center gap-2 mt-1">
                          <span>{thread.date}</span>
                          {thread.media && thread.media.length > 0 && <span className="bg-neutral-800 px-1.5 rounded text-[10px] flex items-center gap-1"><ImageIcon size={10}/>{thread.media.length}</span>}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Right Panel: Detail or Write Form */}
              <div className="flex-1 bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-col overflow-hidden shadow-2xl relative min-w-0">
                {activeThreadId === 'new' || isEditingThread ? (
                  // Write Form
                  <div className="flex flex-col h-full">
                    <div className="p-5 md:p-6 border-b border-neutral-800 flex justify-between items-center bg-neutral-900">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">{activeThreadId === 'new' ? '새 쓰레드 작성' : '쓰레드 수정'}</h3>
                      <button onClick={() => { if (activeThreadId === 'new') setActiveThreadId(null); else setIsEditingThread(false); }} className="text-neutral-400 hover:text-white"><X size={20} /></button>
                    </div>
                    
                    <div className="bg-neutral-900 px-5 pt-4 pb-2 md:px-6">
                        <span className="text-xs text-lime-400 font-medium bg-lime-400/10 px-2 py-0.5 rounded-full inline-block">현재 계정: {activeThreadAccount}</span>
                    </div>

                    <div className="p-5 md:p-6 space-y-4 flex-1 overflow-y-auto custom-scrollbar bg-neutral-900 flex flex-col pt-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold text-neutral-400">발행 예정일:</span>
                        <input 
                          type="date" 
                          value={threadDraft.date} 
                          onChange={(e) => setThreadDraft({...threadDraft, date: e.target.value})}
                          className="bg-neutral-950 border border-neutral-700 rounded-lg px-3 py-1.5 text-white text-sm outline-none focus:border-lime-400"
                        />
                      </div>

                      <textarea 
                        className="w-full min-h-[150px] bg-neutral-950 border border-neutral-800 rounded-xl p-4 text-neutral-200 placeholder-neutral-600 focus:outline-none focus:border-lime-500 resize-none font-sans text-sm custom-scrollbar flex-1"
                        placeholder="어떤 이야기를 공유할까요?"
                        value={threadDraft.text}
                        onChange={(e) => setThreadDraft({ ...threadDraft, text: e.target.value })}
                      />

                      {/* Media Preview Area */}
                      {threadDraft.media.length > 0 && (
                        <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar shrink-0">
                          {threadDraft.media.map((m, idx) => (
                            <div key={idx} className="relative w-24 h-24 shrink-0 rounded-lg overflow-hidden border border-neutral-700">
                              {m.type === 'image' ? (
                                <img src={m.url} className="w-full h-full object-cover" alt="preview" />
                              ) : (
                                <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                                  <Video size={24} className="text-neutral-500" />
                                </div>
                              )}
                              <button onClick={() => setThreadDraft(prev => ({...prev, media: prev.media.filter((_, i) => i !== idx)}))} className="absolute top-1 right-1 bg-black/60 text-white p-1 rounded-full"><X size={12}/></button>
                            </div>
                          ))}
                        </div>
                      )}

                      <label className="flex items-center justify-center gap-2 w-full py-6 border-2 border-dashed border-neutral-700 rounded-xl cursor-pointer hover:border-lime-400 text-neutral-400 hover:text-lime-400 transition-colors bg-neutral-950 shrink-0">
                        <ImageIcon size={20} /> <Video size={20} />
                        <span className="text-sm font-medium">사진 또는 영상 첨부 (최대 15MB)</span>
                        <input type="file" accept="image/*, video/*" multiple className="hidden" onChange={handleThreadMediaUpload}/>
                      </label>
                    </div>

                    <div className="p-4 border-t border-neutral-800 flex justify-end bg-neutral-900 shrink-0">
                      <button onClick={saveThread} className="bg-lime-400 hover:bg-lime-500 text-neutral-950 px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-lime-500/20 transition-all">
                        저장하기
                      </button>
                    </div>
                  </div>
                ) : activeThreadId && selectedThread ? (
                  // Detail View
                  <div className="flex flex-col h-full bg-neutral-900">
                    <div className="p-5 md:p-6 border-b border-neutral-800 flex justify-between items-center">
                      <h3 className="text-lg font-bold text-white flex items-center gap-2">스레드 미리보기</h3>
                      <button onClick={() => setActiveThreadId(null)} className="text-neutral-400 hover:text-white"><X size={20} /></button>
                    </div>
                    <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
                        
                       <div className="flex items-center justify-between mb-6 border-b border-neutral-800 pb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-neutral-800 rounded-full flex items-center justify-center">
                              <span className="text-lime-400 font-bold text-lg">B</span>
                            </div>
                            <div>
                              <div className="font-bold text-white">{activeThreadAccount}</div>
                              <div className="text-xs text-neutral-500">{selectedThread.date}</div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button onClick={() => { setThreadDraft({ text: selectedThread.text, media: selectedThread.media || [], date: selectedThread.date }); setIsEditingThread(true); }} className="p-2 bg-neutral-800 hover:bg-lime-500/20 text-neutral-400 hover:text-lime-400 rounded-lg transition-colors" title="수정">
                              <Edit2 size={16} />
                            </button>
                            <button onClick={() => deleteThread(selectedThread.id)} className="p-2 bg-neutral-800 hover:bg-red-500/20 text-neutral-400 hover:text-red-400 rounded-lg transition-colors" title="삭제">
                              <Trash2 size={16} />
                            </button>
                          </div>
                       </div>
                       
                       <div className="pl-0 md:pl-14">
                           <p className="text-sm text-neutral-200 whitespace-pre-wrap leading-relaxed mb-6">
                             {selectedThread.text}
                           </p>

                           {selectedThread.media && selectedThread.media.length > 0 && (
                             <div className={`grid gap-2 mb-2 ${selectedThread.media.length === 1 ? 'grid-cols-1 max-w-md' : 'grid-cols-2 max-w-xl'}`}>
                                {selectedThread.media.map((m, idx) => (
                                  <div 
                                    key={idx} 
                                    className={`relative rounded-xl overflow-hidden border border-neutral-800 bg-neutral-950 cursor-pointer ${selectedThread.media.length === 1 ? '' : 'aspect-square'}`}
                                    onClick={() => setThreadLightboxMedia(m)}
                                  >
                                    {m.type === 'image' ? (
                                      <img src={m.url} alt="media" className="w-full h-full object-cover" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center relative">
                                        <video src={m.url} className="w-full h-full object-cover opacity-50" />
                                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                          <Video size={32} className="text-white drop-shadow-md" />
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                             </div>
                           )}

                           <div className="flex gap-4 mt-6 text-neutral-500 border-t border-neutral-800 pt-4">
                              <Heart size={20} className="cursor-pointer hover:text-red-400 transition-colors" />
                              <MessageCircle size={20} className="cursor-pointer hover:text-white transition-colors" />
                              <GripHorizontal size={20} className="cursor-pointer hover:text-white transition-colors" />
                           </div>
                       </div>
                    </div>
                  </div>
                ) : (
                  // Empty State
                  <div className="flex flex-col items-center justify-center h-full text-neutral-500 p-6 text-center">
                     <MessageCircle size={48} className="mb-4 text-neutral-700"/>
                     <p>왼쪽 패널에서 스레드를 선택하거나<br/>새 스레드를 작성하세요.</p>
                  </div>
                )}
              </div>
              </div>
            </div>
          )}

          {/* --------------------------------------
              View 4: Blog
              -------------------------------------- */}
          {currentView === 'blog' && (
            <div className="h-full flex flex-col animate-in fade-in duration-500 pb-8">
              <header className="mb-6 flex flex-col gap-4 shrink-0">
                <div>
                  <h2 className="text-3xl font-bold text-white flex items-center gap-3"><FileText className="text-lime-400" size={32} /> Blog</h2>
                  <p className="text-neutral-400 mt-2">계정별로 블로그 포스팅을 작성하고 관리하세요.</p>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide border-b border-neutral-800">
                  {blogAccounts.map(acc => (<button key={acc} onClick={() => { setActiveBlogAccount(acc); setActiveBlogId(null); }} className={`px-5 py-2 rounded-full text-sm font-bold whitespace-nowrap transition-colors ${activeBlogAccount === acc ? 'bg-neutral-800 text-lime-400 border border-neutral-700' : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900'}`}>{acc}</button>))}
                </div>
              </header>

              <div className="flex-1 flex flex-col md:flex-row gap-6 min-h-0">
              {/* Blog List Panel */}
              <div className="w-full md:w-[320px] bg-neutral-900 border border-neutral-800 rounded-2xl p-4 flex flex-col shrink-0">
                
                {/* Blog Calendar */}
                <div className="mb-2">
                  <div className="flex justify-between items-center mb-4 px-2">
                    <h3 className="font-bold text-sm text-white">
                      {blogCalendarDate.getFullYear()}년 {blogCalendarDate.getMonth() + 1}월
                    </h3>
                    <div className="flex gap-1">
                      <button onClick={() => setBlogCalendarDate(new Date(blogCalendarDate.getFullYear(), blogCalendarDate.getMonth() - 1, 1))} className="p-1 bg-neutral-800 rounded hover:bg-neutral-700 text-white"><ChevronLeft size={14}/></button>
                      <button onClick={() => setBlogCalendarDate(new Date(blogCalendarDate.getFullYear(), blogCalendarDate.getMonth() + 1, 1))} className="p-1 bg-neutral-800 rounded hover:bg-neutral-700 text-white"><ChevronRight size={14}/></button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-7 gap-1 text-center mb-1">
                    {['일', '월', '화', '수', '목', '금', '토'].map(day => <div key={day} className="text-[10px] font-semibold text-neutral-500">{day}</div>)}
                  </div>
                  
                  <div className="grid grid-cols-7 gap-0.5">
                    {Array.from({ length: getFirstDayOfMonth(blogCalendarDate.getFullYear(), blogCalendarDate.getMonth()) }).map((_, i) => <div key={`empty-${i}`} />)}
                    {Array.from({ length: getDaysInMonth(blogCalendarDate.getFullYear(), blogCalendarDate.getMonth()) }).map((_, i) => {
                      const day = i + 1;
                      const dateStr = toISODate(new Date(blogCalendarDate.getFullYear(), blogCalendarDate.getMonth(), day));
                      
                      const isStart = dateStr === blogDateRange.start;
                      const isEnd = dateStr === blogDateRange.end;
                      const isSelected = isStart || isEnd;
                      const isInRange = blogDateRange.end && dateStr > blogDateRange.start && dateStr < blogDateRange.end;

                      const hasBlog = currentAccountBlogs.some(b => b.date === dateStr);
                      const isToday = dateStr === toISODate(new Date());

                      return (
                        <div key={day} className="aspect-square w-full relative p-0.5">
                          {isInRange && <div className="absolute inset-y-0.5 -inset-x-0 bg-lime-400/20" />}
                          {isStart && blogDateRange.end && <div className="absolute inset-y-0.5 right-0 w-1/2 bg-lime-400/20" />}
                          {isEnd && <div className="absolute inset-y-0.5 left-0 w-1/2 bg-lime-400/20" />}

                          <button
                            onClick={() => handleBlogCalendarClick(dateStr)}
                            className={`
                              w-full h-full flex flex-col items-center justify-center rounded-lg relative text-xs transition-all z-10
                              ${isSelected ? 'bg-lime-400 text-neutral-950 font-bold shadow-md' : isInRange ? 'text-lime-400 font-bold hover:bg-lime-400/30' : 'text-neutral-300 hover:bg-neutral-800'}
                              ${isToday && !isSelected && !isInRange ? 'border border-lime-400/50' : ''}
                            `}
                          >
                            <span>{day}</span>
                            {hasBlog && <div className={`w-1 h-1 rounded-full absolute bottom-1 ${isSelected ? 'bg-neutral-950' : 'bg-lime-400'}`} />}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <hr className="border-neutral-800 my-4" />

                <div className="flex items-center justify-between mb-4 px-2">
                  <h3 className="font-bold text-white flex items-center gap-2 text-sm">
                    <FileText size={16} className="text-lime-400"/> 문서 ({filteredBlogs.length})
                  </h3>
                  <button onClick={createNewBlog} className="p-1.5 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg transition-colors" title="선택한 날짜에 새 문서 추가">
                    <Plus size={14} />
                  </button>
                </div>
                
                <div className="space-y-1 overflow-y-auto flex-1 custom-scrollbar">
                  {filteredBlogs.length === 0 ? (
                    <div className="text-center py-8 text-neutral-500 text-xs">선택한 기간에<br/>DB에 작성된 문서가 없습니다.</div>
                  ) : (
                    filteredBlogs.map(blog => (
                      <button
                        key={blog.id}
                        onClick={() => setActiveBlogId(blog.id)}
                        className={`w-full text-left p-3 rounded-xl transition-all flex flex-col gap-1 border border-transparent ${activeBlogId === blog.id ? 'bg-lime-400/10 border-lime-400/20' : 'hover:bg-neutral-800'}`}
                      >
                        <div className={`font-medium text-sm truncate ${activeBlogId === blog.id ? 'text-lime-400' : 'text-neutral-200'}`}>
                          {blog.title || '제목 없음'}
                        </div>
                        <div className="text-xs text-neutral-500 flex items-center gap-2">
                          <span>{blog.date}</span>
                          {blog.tags && blog.tags.length > 0 && <span className="bg-neutral-800 px-1.5 rounded text-[10px]">{blog.tags[0]}</span>}
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>

              {/* Blog Editor Panel */}
              {activeBlog ? (
                <div className="flex-1 bg-white rounded-2xl flex flex-col overflow-hidden shadow-2xl relative min-w-0">
                  <div className="p-6 md:p-10 overflow-y-auto flex-1 custom-scrollbar text-neutral-900">
                    
                    {/* Header Area */}
                    <div className="border border-blue-200 rounded-xl p-6 bg-blue-50/30 mb-8 space-y-4 relative">
                       <button onClick={deleteActiveBlog} className="absolute top-4 right-4 text-red-400 hover:bg-red-50 p-2 rounded-lg transition-colors" title="문서 삭제"><Trash2 size={18}/></button>
                       <div className="mb-2">
                           <span className="text-xs text-blue-600 font-bold bg-blue-100 px-2 py-1 rounded-full">계정: {activeBlogAccount}</span>
                       </div>
                       <input 
                         type="text" 
                         value={activeBlog.title || ''} 
                         onChange={(e) => updateActiveBlogLocally({...activeBlog, title: e.target.value})}
                         className="w-full text-2xl font-bold bg-transparent border-none outline-none placeholder-neutral-400"
                         placeholder="제목을 입력하세요"
                       />
                       
                       <div className="flex flex-col sm:flex-row gap-4 text-sm">
                         <div className="flex-1 flex items-center border border-neutral-200 rounded-lg overflow-hidden bg-white">
                           <span className="px-3 text-blue-500 bg-blue-50 border-r border-neutral-200 font-medium">외부링크</span>
                           <input 
                             type="text" 
                             value={activeBlog.link || ''}
                             onChange={(e) => updateActiveBlogLocally({...activeBlog, link: e.target.value})}
                             className="flex-1 p-2 outline-none" 
                             placeholder="(선택) 외부 블로그 원문 링크"
                           />
                         </div>
                         <div className="w-full sm:w-48 flex items-center border border-neutral-200 rounded-lg overflow-hidden bg-white">
                           <span className="px-3 text-neutral-500 bg-neutral-50 border-r border-neutral-200 font-medium">날짜</span>
                           <input 
                             type="date" 
                             value={activeBlog.date || ''}
                             onChange={(e) => updateActiveBlogLocally({...activeBlog, date: e.target.value})}
                             className="flex-1 p-2 outline-none text-neutral-600" 
                           />
                         </div>
                       </div>

                       <div className="flex items-start gap-3 pt-2">
                         <span className="text-sm font-bold text-neutral-500 mt-1">태그</span>
                         <div className="flex-1 border border-neutral-200 rounded-lg p-3 bg-white flex flex-col gap-2">
                           <div className="flex flex-wrap gap-1">
                             {(activeBlog.tags || []).map(tag => (
                               <span key={tag} className="bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                 {tag} <button onClick={() => updateActiveBlogLocally({...activeBlog, tags: activeBlog.tags.filter(t=>t!==tag)})}><X size={10}/></button>
                               </span>
                             ))}
                           </div>
                           <div className="flex items-center gap-2">
                              <input 
                                type="text" 
                                id={`tag-input-${activeBlogId}`}
                                placeholder="태그명 입력 후 엔터" 
                                className="flex-1 text-sm outline-none bg-transparent"
                                onKeyDown={(e) => {
                                  if(e.key === 'Enter' && e.target.value.trim()) {
                                    const val = e.target.value.trim();
                                    const tags = activeBlog.tags || [];
                                    if(!tags.includes(val)) updateActiveBlogLocally({...activeBlog, tags: [...tags, val]});
                                    e.target.value = '';
                                  }
                                }}
                              />
                           </div>
                         </div>
                       </div>
                    </div>

                    {/* Blocks Area */}
                    <div className="bg-neutral-50 rounded-xl p-4 md:p-6 min-h-[400px]">
                      <h4 className="text-sm font-bold text-blue-500 mb-4 flex items-center gap-2">
                        <LayoutGrid size={16} /> 본문 블록 에디터
                      </h4>

                      <div className="space-y-4 mb-8">
                        {(activeBlog.blocks || []).map((block, index) => {
                          const currentAlign = block.align || (['ul', 'ol', 'callout'].includes(block.type) ? 'left' : 'center');
                          
                          return (
                          <div key={block.id} className="group relative border border-neutral-200 bg-white rounded-xl p-4 shadow-sm hover:border-blue-300 transition-colors">
                            {/* Block Controls */}
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <span className="bg-neutral-800 text-white text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">{block.type.toUpperCase()}</span>
                                <div className="flex items-center gap-1 bg-neutral-50 border border-neutral-200 rounded p-0.5">
                                  <button onClick={() => updateBlogBlock(block.id, 'align', 'left')} className={`p-1.5 rounded transition-colors ${currentAlign === 'left' ? 'bg-white shadow-sm text-blue-500' : 'text-neutral-400 hover:bg-neutral-200'}`}><AlignLeft size={12} /></button>
                                  <button onClick={() => updateBlogBlock(block.id, 'align', 'center')} className={`p-1.5 rounded transition-colors ${currentAlign === 'center' ? 'bg-white shadow-sm text-blue-500' : 'text-neutral-400 hover:bg-neutral-200'}`}><AlignCenter size={12} /></button>
                                  <button onClick={() => updateBlogBlock(block.id, 'align', 'right')} className={`p-1.5 rounded transition-colors ${currentAlign === 'right' ? 'bg-white shadow-sm text-blue-500' : 'text-neutral-400 hover:bg-neutral-200'}`}><AlignRight size={12} /></button>
                                </div>
                              </div>
                              <button onClick={() => removeBlogBlock(block.id)} className="text-neutral-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"><X size={14} /></button>
                            </div>

                            {/* Block Content Render */}
                            {block.type === 'h1' && (
                              <input type="text" value={block.content || ''} onChange={(e) => updateBlogBlock(block.id, 'content', e.target.value)} className={`w-full text-2xl font-black border-none outline-none placeholder-neutral-300 ${currentAlign === 'center' ? 'text-center' : currentAlign === 'right' ? 'text-right' : 'text-left'}`} placeholder="제목 1 (대제목)을 입력하세요" />
                            )}
                            {block.type === 'h2' && (
                              <input type="text" value={block.content || ''} onChange={(e) => updateBlogBlock(block.id, 'content', e.target.value)} className={`w-full text-xl font-bold border-none outline-none placeholder-neutral-300 ${currentAlign === 'center' ? 'text-center' : currentAlign === 'right' ? 'text-right' : 'text-left'}`} placeholder="제목 2 (중제목)을 입력하세요" />
                            )}
                            {block.type === 'text' && (
                              <textarea value={block.content || ''} onChange={(e) => updateBlogBlock(block.id, 'content', e.target.value)} className={`w-full text-sm leading-relaxed border-none outline-none resize-none placeholder-neutral-300 min-h-[60px] ${currentAlign === 'center' ? 'text-center' : currentAlign === 'right' ? 'text-right' : 'text-left'} custom-scrollbar`} placeholder="본문 내용을 입력하세요" />
                            )}
                            {block.type === 'ul' && (
                              <div className="flex items-start gap-2 px-4 md:px-8">
                                <span className="text-xl leading-none pt-0.5 text-neutral-400">•</span>
                                <textarea value={block.content || ''} onChange={(e) => updateBlogBlock(block.id, 'content', e.target.value)} className={`flex-1 text-sm leading-relaxed border-none outline-none resize-none placeholder-neutral-300 min-h-[40px] ${currentAlign === 'center' ? 'text-center' : currentAlign === 'right' ? 'text-right' : 'text-left'} custom-scrollbar`} placeholder="글머리 기호 목록 내용을 입력하세요" />
                              </div>
                            )}
                            {block.type === 'ol' && (
                              <div className="flex items-start gap-2 px-4 md:px-8">
                                <span className="text-sm font-bold pt-1 text-neutral-400">1.</span>
                                <textarea value={block.content || ''} onChange={(e) => updateBlogBlock(block.id, 'content', e.target.value)} className={`flex-1 text-sm leading-relaxed border-none outline-none resize-none placeholder-neutral-300 min-h-[40px] ${currentAlign === 'center' ? 'text-center' : currentAlign === 'right' ? 'text-right' : 'text-left'} custom-scrollbar`} placeholder="번호 매기기 목록 내용을 입력하세요" />
                              </div>
                            )}
                            {block.type === 'quote' && (
                              <div className={`border-l-4 border-blue-500 pl-4 py-2 my-2 bg-neutral-50`}>
                                 <textarea value={block.content || ''} onChange={(e) => updateBlogBlock(block.id, 'content', e.target.value)} className={`w-full text-sm italic text-neutral-700 bg-transparent border-none outline-none resize-none min-h-[50px] ${currentAlign === 'center' ? 'text-center' : currentAlign === 'right' ? 'text-right' : 'text-left'} custom-scrollbar`} placeholder="인용구를 입력하세요" />
                              </div>
                            )}
                            {block.type === 'callout' && (
                              <div className="flex items-start gap-3 bg-white border border-neutral-200 shadow-sm rounded-lg p-4">
                                <span className="text-xl">💡</span>
                                <textarea value={block.content || ''} onChange={(e) => updateBlogBlock(block.id, 'content', e.target.value)} className={`flex-1 bg-transparent border-none outline-none resize-none text-sm text-neutral-900 placeholder-neutral-400 min-h-[40px] ${currentAlign === 'center' ? 'text-center' : currentAlign === 'right' ? 'text-right' : 'text-left'} custom-scrollbar`} placeholder="강조할 내용을 입력하세요" />
                              </div>
                            )}
                            {block.type === 'link' && (
                              <div className="flex flex-col gap-2 border border-neutral-200 rounded-lg p-3 bg-neutral-50 max-w-xl mx-auto">
                                <div className="flex items-center gap-2">
                                   <Link2 size={16} className="text-blue-500 shrink-0" />
                                   <input type="text" value={block.content || ''} onChange={(e) => updateBlogBlock(block.id, 'content', e.target.value)} placeholder="링크 텍스트 (예: 예약 바로가기)" className="flex-1 bg-white border border-neutral-200 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-400" />
                                </div>
                                <input type="text" value={block.url || ''} onChange={(e) => updateBlogBlock(block.id, 'url', e.target.value)} placeholder="https://..." className="w-full bg-white border border-neutral-200 rounded px-2 py-1.5 text-sm outline-none focus:border-blue-400 text-neutral-500" />
                              </div>
                            )}
                            {block.type === 'image' && (
                              <div className="flex flex-col items-center">
                                {block.url ? (
                                  <div className="relative inline-block border border-neutral-200 rounded-lg overflow-hidden max-w-full">
                                    <img src={block.url} alt="block img" className="max-h-[300px] object-contain" />
                                    <button onClick={() => updateBlogBlock(block.id, 'url', '')} className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-md hover:bg-red-500 transition-colors"><Trash2 size={14}/></button>
                                  </div>
                                ) : (
                                  <label className="w-full h-32 border-2 border-dashed border-blue-200 bg-blue-50 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 transition-colors">
                                    <ImageIcon size={24} className="text-blue-400 mb-2" />
                                    <span className="text-sm font-medium text-blue-500">이미지 첨부</span>
                                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleBlogImageUpload(e, block.id)} />
                                  </label>
                                )}
                                <input type="text" value={block.caption || ''} onChange={(e) => updateBlogBlock(block.id, 'caption', e.target.value)} className="w-full max-w-md text-center text-xs text-neutral-500 mt-2 border border-neutral-200 rounded p-1.5 outline-none" placeholder="캡션을 입력하세요" />
                              </div>
                            )}
                            {block.type === 'slide' && (
                              <div className="flex flex-col items-center gap-2">
                                <div className="flex gap-2 overflow-x-auto w-full p-3 border border-neutral-200 rounded-lg min-h-[120px] items-center bg-neutral-50 custom-scrollbar">
                                  {(block.urls || []).map((u, i) => (
                                     <div key={i} className="relative h-28 w-28 shrink-0 rounded-lg overflow-hidden border border-neutral-200 shadow-sm">
                                        <img src={u} className="w-full h-full object-cover" alt="slide" />
                                        <button onClick={() => updateBlogBlock(block.id, 'urls', block.urls.filter((_, idx) => idx !== i))} className="absolute top-1 right-1 bg-black/60 text-white rounded p-1 hover:bg-red-500"><X size={12}/></button>
                                     </div>
                                  ))}
                                  <label className="h-28 w-28 shrink-0 border-2 border-dashed border-blue-200 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-blue-100 hover:border-blue-400 text-blue-400 transition-colors">
                                     <Plus size={20} className="mb-1" />
                                     <span className="text-[10px] font-medium">사진 추가</span>
                                     <input type="file" multiple accept="image/*" className="hidden" onChange={async (e) => {
                                         const files = Array.from(e.target.files);
                                         const compressed = await Promise.all(files.map(f => createThumbnail(f)));
                                         updateBlogBlock(block.id, 'urls', [...(block.urls || []), ...compressed]);
                                     }} />
                                  </label>
                                </div>
                                <span className="text-[10px] text-neutral-400">여러 장의 이미지를 추가해 슬라이드를 구성하세요.</span>
                              </div>
                            )}
                            {block.type === 'video' && (
                              <div className="flex flex-col items-center w-full">
                                {block.url ? (
                                  <div className="relative inline-block border border-neutral-200 rounded-lg overflow-hidden max-w-full w-full max-w-md bg-black">
                                    <video src={block.url} controls className="w-full max-h-[300px]" />
                                    <button onClick={() => updateBlogBlock(block.id, 'url', '')} className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded-md hover:bg-red-500 transition-colors"><Trash2 size={14}/></button>
                                  </div>
                                ) : (
                                  <label className="w-full h-32 border-2 border-dashed border-purple-200 bg-purple-50 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-purple-400 transition-colors">
                                    <Video size={24} className="text-purple-400 mb-2" />
                                    <span className="text-sm font-medium text-purple-500">영상 첨부 (15MB 이하)</span>
                                    <input type="file" accept="video/*" className="hidden" onChange={(e) => {
                                      const file = e.target.files[0];
                                      if(file) updateBlogBlock(block.id, 'url', URL.createObjectURL(file));
                                    }} />
                                  </label>
                                )}
                              </div>
                            )}
                            {block.type === 'beforeAfter' && (
                              <div className="flex flex-col md:flex-row gap-4 w-full">
                                {['beforeUrl', 'afterUrl'].map((f, i) => (
                                  <div key={f} className="flex-1 flex flex-col items-center border border-neutral-200 rounded-lg p-3 bg-neutral-50 shadow-sm">
                                     <span className="text-xs font-bold text-neutral-500 mb-2 uppercase tracking-wider bg-white px-2 py-1 rounded border border-neutral-100">{i === 0 ? 'Before' : 'After'}</span>
                                     {block[f] ? (
                                       <div className="relative w-full aspect-square rounded-lg overflow-hidden border border-neutral-200">
                                         <img src={block[f]} className="w-full h-full object-cover"/>
                                         <button onClick={() => updateBlogBlock(block.id, f, '')} className="absolute top-2 right-2 bg-black/60 text-white p-1.5 rounded hover:bg-red-500"><Trash2 size={12}/></button>
                                       </div>
                                     ) : (
                                       <label className="w-full aspect-square border-2 border-dashed border-neutral-300 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-neutral-100 hover:border-blue-400 text-neutral-400 transition-colors">
                                         <Plus size={20} className="mb-1" />
                                         <span className="text-[10px] font-medium">사진 추가</span>
                                         <input type="file" accept="image/*" className="hidden" onChange={async (e) => {
                                           const file = e.target.files[0];
                                           if(file) updateBlogBlock(block.id, f, await createThumbnail(file));
                                         }}/>
                                       </label>
                                     )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )})}
                      </div>

                      {/* Toolbar */}
                      <div className="border border-neutral-200 bg-white rounded-xl p-4 shadow-sm">
                        <div className="grid grid-cols-4 gap-2">
                          <button onClick={() => addBlogBlock('h1')} className="flex flex-col items-center justify-center py-3 border border-neutral-100 rounded-lg hover:bg-blue-50 hover:border-blue-200 text-neutral-600 transition-colors"><Heading1 size={20} className="mb-1 text-neutral-400"/><span className="text-[10px] font-bold">제목 1</span></button>
                          <button onClick={() => addBlogBlock('h2')} className="flex flex-col items-center justify-center py-3 border border-neutral-100 rounded-lg hover:bg-blue-50 hover:border-blue-200 text-neutral-600 transition-colors"><Heading2 size={20} className="mb-1 text-neutral-400"/><span className="text-[10px] font-bold">제목 2</span></button>
                          <button onClick={() => addBlogBlock('text')} className="flex flex-col items-center justify-center py-3 border border-neutral-100 rounded-lg hover:bg-blue-50 hover:border-blue-200 text-neutral-600 transition-colors"><Type size={20} className="mb-1 text-neutral-400"/><span className="text-[10px] font-bold">텍스트</span></button>
                          <button onClick={() => addBlogBlock('ul')} className="flex flex-col items-center justify-center py-3 border border-neutral-100 rounded-lg hover:bg-blue-50 hover:border-blue-200 text-neutral-600 transition-colors"><List size={20} className="mb-1 text-neutral-400"/><span className="text-[10px] font-bold">글머리기호</span></button>
                          
                          <button onClick={() => addBlogBlock('ol')} className="flex flex-col items-center justify-center py-3 border border-neutral-100 rounded-lg hover:bg-blue-50 hover:border-blue-200 text-neutral-600 transition-colors"><ListOrdered size={20} className="mb-1 text-neutral-400"/><span className="text-[10px] font-bold">번호매기기</span></button>
                          <button onClick={() => addBlogBlock('quote')} className="flex flex-col items-center justify-center py-3 border border-neutral-100 rounded-lg hover:bg-blue-50 hover:border-blue-200 text-neutral-600 transition-colors"><Quote size={20} className="mb-1 text-neutral-400"/><span className="text-[10px] font-bold">인용구</span></button>
                          <button onClick={() => addBlogBlock('image')} className="flex flex-col items-center justify-center py-3 border border-neutral-100 rounded-lg hover:bg-blue-50 hover:border-blue-200 text-neutral-600 transition-colors"><ImageIcon size={20} className="mb-1 text-neutral-400"/><span className="text-[10px] font-bold">사진</span></button>
                          <button onClick={() => addBlogBlock('slide')} className="flex flex-col items-center justify-center py-3 border border-neutral-100 rounded-lg hover:bg-blue-50 hover:border-blue-200 text-neutral-600 transition-colors"><GalleryHorizontalEnd size={20} className="mb-1 text-neutral-400"/><span className="text-[10px] font-bold">슬라이드</span></button>
                          
                          <button onClick={() => addBlogBlock('video')} className="flex flex-col items-center justify-center py-3 border border-neutral-100 rounded-lg hover:bg-blue-50 hover:border-blue-200 text-neutral-600 transition-colors"><Video size={20} className="mb-1 text-neutral-400"/><span className="text-[10px] font-bold">영상</span></button>
                          <button onClick={() => addBlogBlock('beforeAfter')} className="flex flex-col items-center justify-center py-3 border border-neutral-100 rounded-lg hover:bg-blue-50 hover:border-blue-200 text-neutral-600 transition-colors"><SplitSquareHorizontal size={20} className="mb-1 text-neutral-400"/><span className="text-[10px] font-bold">Bef/Aft</span></button>
                          <button onClick={() => addBlogBlock('callout')} className="flex flex-col items-center justify-center py-3 border border-neutral-100 rounded-lg hover:bg-blue-50 hover:border-blue-200 text-neutral-600 transition-colors"><Lightbulb size={20} className="mb-1 text-yellow-500"/><span className="text-[10px] font-bold">콜아웃</span></button>
                          <button onClick={() => addBlogBlock('link')} className="flex flex-col items-center justify-center py-3 border border-neutral-100 rounded-lg hover:bg-blue-50 hover:border-blue-200 text-neutral-600 transition-colors"><Link2 size={20} className="mb-1 text-blue-500"/><span className="text-[10px] font-bold">링크</span></button>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Footer Actions */}
                  <div className="bg-neutral-50 border-t border-neutral-200 p-4 flex justify-end gap-3 shrink-0">
                    <button className="px-6 py-2.5 rounded-lg font-bold text-sm bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-colors flex items-center gap-2" onClick={saveBlogToDB}>
                      <Save size={16} /> 데이터베이스에 저장
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex-1 bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-col items-center justify-center text-neutral-500 min-h-[400px]">
                  <FileText size={48} className="mb-4 text-neutral-700"/>
                  <p>선택된 날짜 범위 내에 문서가 없습니다.<br/>좌측 패널에서 '+ 새 문서'를 클릭해 작성하세요.</p>
                </div>
              )}
              </div>
            </div>
          )}

          {/* --------------------------------------
              View 5: Posing Library
              -------------------------------------- */}
          {currentView === 'posing' && (
            <div className="space-y-8 animate-in fade-in duration-500 relative pb-24">
              <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                    <Camera className="text-lime-400" size={32} /> Posing Library
                  </h2>
                  <p className="text-neutral-400">가족 구성에 맞는 포즈 레퍼런스를 탐색하고 관리하세요.</p>
                </div>
                <button 
                  onClick={() => setIsPosingUploadModalOpen(true)}
                  className="bg-lime-400 hover:bg-lime-500 text-neutral-950 px-5 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors shadow-lg shadow-lime-500/10 shrink-0"
                >
                  <Upload size={18} /> 시안 업로드
                </button>
              </header>

              <div className="flex flex-col lg:flex-row gap-6">
                
                {/* Desktop Sidebar: Filters */}
                <aside className="hidden lg:block w-72 shrink-0">
                  <div className="bg-neutral-900 p-5 rounded-2xl border border-neutral-800 shadow-sm sticky top-8">
                    <div className="flex items-center justify-between mb-6 border-b border-neutral-800 pb-3">
                      <div className="flex items-center gap-2 text-white">
                        <Filter className="w-5 h-5 text-lime-400" />
                        <h2 className="font-semibold text-lg">필터 검색</h2>
                      </div>
                      <button 
                        onClick={() => setFilters({ headCount: 'all', grandparents: 'all', parents: 'all', children: [], includePets: false, onlyFavorites: false })}
                        className="text-xs text-neutral-400 hover:text-lime-400 transition-colors"
                      >
                        초기화
                      </button>
                    </div>
                    <FilterContentControls />
                  </div>
                </aside>

                {/* Right Content: Gallery */}
                <div className="flex-1 w-full min-w-0">
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="text-lg font-medium text-neutral-300">
                      검색 결과 <span className="text-lime-400 font-bold ml-1">{filteredPhotos.length}</span>건
                    </h3>
                    
                    {/* Mobile Reset Button */}
                    <div className="lg:hidden">
                        {(activeFilterCount > 0) && (
                            <button 
                                onClick={() => setFilters({ headCount: 'all', grandparents: 'all', parents: 'all', children: [], includePets: false, onlyFavorites: false })}
                                className="text-xs text-lime-400 border border-lime-400/30 bg-lime-400/10 px-3 py-1.5 rounded-full"
                            >
                                필터 초기화
                            </button>
                        )}
                    </div>
                  </div>

                  {filteredPhotos.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-neutral-500 border-2 border-dashed border-neutral-800 rounded-2xl bg-neutral-900/30">
                      <ImageIcon className="w-16 h-16 mb-4 opacity-20" />
                      <p className="text-lg text-center px-4">해당 조건의 레퍼런스가 없습니다.</p>
                      <p className="text-sm mt-2 text-center px-4">필터를 초기화하거나 시안을 업로드해주세요.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-6">
                      {filteredPhotos.map(photo => (
                        <div 
                          key={photo.id} 
                          onClick={() => setViewingPhotoId(photo.id)}
                          className="group relative bg-neutral-900 rounded-xl overflow-hidden border border-neutral-800 hover:border-lime-500 transition-all cursor-pointer flex flex-col"
                        >
                          {/* Image */}
                          <div className="aspect-[4/5] bg-neutral-950 overflow-hidden relative">
                            <img 
                              src={photo.imageUrl} 
                              alt="Posing Reference" 
                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            />
                            
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors duration-300 flex items-center justify-center">
                                <Maximize2 className="text-white opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all drop-shadow-lg w-8 h-8 hidden md:block" />
                            </div>
                            
                            {/* Top Action Buttons */}
                            <div className="absolute top-2 left-2 md:top-3 md:left-3 z-10">
                              <button 
                                onClick={(e) => handleToggleFavorite(e, photo.id, photo.isFavorite)}
                                className={`p-1.5 md:p-2 rounded-full transition-all backdrop-blur-sm ${photo.isFavorite ? 'bg-lime-400/20 text-lime-400 hover:bg-lime-400/40' : 'bg-black/50 text-white/70 hover:text-white hover:bg-black/70'}`}
                                title={photo.isFavorite ? "즐겨찾기 해제" : "즐겨찾기 추가"}
                              >
                                <Heart className={`w-3.5 h-3.5 md:w-5 md:h-5 ${photo.isFavorite ? 'fill-current' : ''}`} />
                              </button>
                            </div>

                            <div className="absolute top-2 right-2 md:top-3 md:right-3 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity z-10 flex gap-1 md:gap-2">
                              <button 
                                onClick={(e) => handleOpenEditModal(e, photo)}
                                className="p-1.5 md:p-2 bg-black/50 text-white rounded-full hover:bg-neutral-600 transition-colors backdrop-blur-sm"
                                title="설정 및 수정"
                              >
                                <Settings className="w-3.5 h-3.5 md:w-4 md:h-4" />
                              </button>
                              <button 
                                onClick={(e) => handlePosingDelete(e, photo.id)}
                                className="p-1.5 md:p-2 bg-black/50 text-white rounded-full hover:bg-red-600 transition-colors backdrop-blur-sm"
                                title="삭제"
                              >
                                <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                              </button>
                            </div>
                          </div>

                          {/* Info Card */}
                          <div className="p-3 md:p-4 flex-1 flex flex-col gap-2 md:gap-3">
                            <div className="flex justify-between items-start">
                              <div className="flex items-center gap-2">
                                <span className="bg-neutral-800 text-neutral-200 text-[10px] md:text-xs font-bold px-2 py-1 rounded">
                                  {photo.headCount}인
                                </span>
                              </div>
                            </div>

                            <div className="space-y-1">
                              {photo.grandparents !== 'none' && (
                                <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-sm text-neutral-300">
                                  <UserPlus className="w-3 h-3 md:w-3.5 md:h-3.5 text-lime-400 flex-shrink-0" />
                                  <span className="truncate">{getLabel(GRANDPARENT_OPTIONS, photo.grandparents)}</span>
                                </div>
                              )}
                              {photo.parents !== 'none' && (
                                <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-sm text-neutral-300">
                                  <Users className="w-3 h-3 md:w-3.5 md:h-3.5 text-blue-400 flex-shrink-0" />
                                  <span className="truncate">{getLabel(PARENT_OPTIONS, photo.parents)}</span>
                                </div>
                              )}
                              {(photo.children?.length > 0 || (Array.isArray(photo.children) && photo.children.length > 0)) && (
                                <div className="flex items-start gap-1.5 md:gap-2 text-[10px] md:text-sm text-neutral-300 mt-1">
                                  <Baby className="w-3 h-3 md:w-3.5 md:h-3.5 text-yellow-400 mt-0.5 flex-shrink-0" />
                                  <div className="flex flex-wrap gap-1">
                                    {photo.children.map((c, idx) => (
                                        <React.Fragment key={idx}>
                                            {renderChildTag(c)}
                                        </React.Fragment>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {photo.petCount > 0 && (
                                <div className="flex items-center gap-1.5 md:gap-2 text-[10px] md:text-sm text-neutral-300 mt-1">
                                    <Dog className="w-3 h-3 md:w-3.5 md:h-3.5 text-lime-400 flex-shrink-0" />
                                    <span className="text-[10px] md:text-xs bg-neutral-700 px-1.5 py-0.5 rounded text-neutral-300">
                                        반려견 {photo.petCount}마리
                                    </span>
                                </div>
                              )}
                            </div>

                            {photo.memo && (
                                <div className="mt-auto pt-2 md:pt-3 border-t border-neutral-800 flex items-start gap-1.5 md:gap-2 text-[10px] md:text-xs text-neutral-400">
                                    <AlignLeft className="w-3 h-3 md:w-3.5 md:h-3.5 flex-shrink-0 mt-0.5 text-neutral-500" />
                                    <p className="line-clamp-2 leading-relaxed">{photo.memo}</p>
                                </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Mobile Filter Floating Button */}
              <button
                onClick={() => setIsMobileFilterOpen(true)}
                className="lg:hidden fixed bottom-6 right-6 bg-lime-400 text-neutral-950 p-4 rounded-full shadow-[0_4px_20px_rgba(163,230,53,0.4)] z-[90] flex items-center justify-center transition-transform hover:scale-105 active:scale-95"
              >
                <Filter size={24} />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border-2 border-neutral-950">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
          )}

          {/* --------------------------------------
              View 6: 환경 설정 (Settings)
              -------------------------------------- */}
          {currentView === 'settings' && (
            <div className="space-y-10 animate-in fade-in duration-500 max-w-3xl mx-auto pb-24">
              <header>
                <h2 className="text-3xl font-bold text-white mb-2 flex items-center gap-3"><Settings className="text-lime-400" size={32} /> 환경 설정</h2>
                <p className="text-neutral-400">인스타그램 다중 계정 및 아카이브 시스템 관리를 설정합니다.</p>
              </header>

              <section className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Instagram className="text-purple-400" size={24} /> 인스타그램 계정 관리</h3>
                <form onSubmit={handleAddAccount} className="flex gap-3 mb-8">
                  <input type="text" placeholder="새로운 인스타그램 계정 이름" className="flex-1 bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-3 text-neutral-200 focus:outline-none focus:border-lime-500" value={newAccountName} onChange={(e) => setNewAccountName(e.target.value)} />
                  <button type="submit" className="bg-lime-400 hover:bg-lime-500 text-neutral-950 px-6 py-3 rounded-xl font-bold transition-colors whitespace-nowrap">계정 추가</button>
                </form>
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-neutral-500 px-2">등록된 계정 목록 ({accounts.length})</div>
                  {accounts.map(acc => (
                    <div key={acc} className="flex items-center justify-between bg-neutral-950 border border-neutral-800 p-4 rounded-xl">
                      <div className="flex items-center gap-3"><div className="w-10 h-10 bg-neutral-800 rounded-full flex items-center justify-center"><Instagram size={18} className="text-neutral-400" /></div><span className="font-medium text-neutral-200">{acc}</span></div>
                      <button onClick={() => handleDeleteAccount(acc)} className="p-2 text-neutral-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"><Trash2 size={18} /></button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><MessageCircle className="text-blue-400" size={24} /> 스레드 계정 관리</h3>
                <form onSubmit={handleAddThreadAccount} className="flex gap-3 mb-8">
                  <input type="text" placeholder="새로운 스레드 계정 이름" className="flex-1 bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-3 text-neutral-200 focus:outline-none focus:border-lime-500" value={newThreadAccountName} onChange={(e) => setNewThreadAccountName(e.target.value)} />
                  <button type="submit" className="bg-lime-400 hover:bg-lime-500 text-neutral-950 px-6 py-3 rounded-xl font-bold transition-colors whitespace-nowrap">계정 추가</button>
                </form>
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-neutral-500 px-2">등록된 계정 목록 ({threadAccounts.length})</div>
                  {threadAccounts.map(acc => (
                    <div key={acc} className="flex items-center justify-between bg-neutral-950 border border-neutral-800 p-4 rounded-xl">
                      <div className="flex items-center gap-3"><div className="w-10 h-10 bg-neutral-800 rounded-full flex items-center justify-center"><MessageCircle size={18} className="text-neutral-400" /></div><span className="font-medium text-neutral-200">{acc}</span></div>
                      <button onClick={() => handleDeleteThreadAccount(acc)} className="p-2 text-neutral-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"><Trash2 size={18} /></button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><FileText className="text-orange-400" size={24} /> 블로그 계정 관리</h3>
                <form onSubmit={handleAddBlogAccount} className="flex gap-3 mb-8">
                  <input type="text" placeholder="새로운 블로그 계정 이름" className="flex-1 bg-neutral-950 border border-neutral-700 rounded-xl px-4 py-3 text-neutral-200 focus:outline-none focus:border-lime-500" value={newBlogAccountName} onChange={(e) => setNewBlogAccountName(e.target.value)} />
                  <button type="submit" className="bg-lime-400 hover:bg-lime-500 text-neutral-950 px-6 py-3 rounded-xl font-bold transition-colors whitespace-nowrap">계정 추가</button>
                </form>
                <div className="space-y-3">
                  <div className="text-sm font-semibold text-neutral-500 px-2">등록된 계정 목록 ({blogAccounts.length})</div>
                  {blogAccounts.map(acc => (
                    <div key={acc} className="flex items-center justify-between bg-neutral-950 border border-neutral-800 p-4 rounded-xl">
                      <div className="flex items-center gap-3"><div className="w-10 h-10 bg-neutral-800 rounded-full flex items-center justify-center"><FileText size={18} className="text-neutral-400" /></div><span className="font-medium text-neutral-200">{acc}</span></div>
                      <button onClick={() => handleDeleteBlogAccount(acc)} className="p-2 text-neutral-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"><Trash2 size={18} /></button>
                    </div>
                  ))}
                </div>
              </section>

              <section className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><HardDrive className="text-blue-400" size={24} /> 구글 드라이브 연동</h3>
                <div className="space-y-4">
                  <div className="text-sm text-neutral-400 leading-relaxed">
                    스튜디오 구글 드라이브 계정을 연동하여, 업로드 시 원본 이미지를 자동으로 폴더링하고 고객에게 제공할 공유 링크를 생성합니다.
                  </div>
                  {isDriveConnected ? (
                      <div className="flex items-center justify-between bg-neutral-950 border border-neutral-800 p-4 rounded-xl">
                          <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center">
                                  <HardDrive size={18} className="text-blue-400" />
                              </div>
                              <div>
                                  <span className="font-bold text-white block">연동 완료</span>
                                  <span className="text-xs text-neutral-500">{driveAccount}</span>
                              </div>
                          </div>
                          <button onClick={handleDriveDisconnect} className="bg-neutral-800 hover:bg-red-500/20 hover:text-red-400 text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors border border-transparent hover:border-red-500/30">연동 해제</button>
                      </div>
                  ) : (
                      <button onClick={handleDriveConnect} className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors w-full sm:w-auto shadow-lg shadow-blue-500/20">
                          <HardDrive size={18} /> Google 계정으로 연동하기
                      </button>
                  )}
                </div>
              </section>

              <section className="bg-neutral-900 border border-neutral-800 rounded-3xl p-8">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><BrainCircuit className="text-lime-400" size={24} /> AI 태깅 프롬프트 설정</h3>
                <div className="space-y-4">
                  <div className="text-sm text-neutral-400 leading-relaxed">AI가 사진을 분석할 때 사용할 명령어(Prompt)를 커스텀할 수 있습니다.</div>
                  <textarea value={tempPrompt} onChange={(e) => setTempPrompt(e.target.value)} className="w-full h-40 bg-neutral-950 border border-neutral-700 rounded-xl p-4 text-neutral-200 focus:outline-none focus:border-lime-500 resize-none font-sans text-sm custom-scrollbar" />
                  <div className="flex justify-end gap-3 mt-4">
                    <button onClick={() => setTempPrompt(DEFAULT_AI_PROMPT)} className="px-6 py-3 rounded-xl font-bold text-neutral-400 hover:text-white hover:bg-neutral-800">기본값으로 초기화</button>
                    <button onClick={async () => { await saveSettingsToDB({ aiPrompt: tempPrompt }); setAlertMessage('AI 태깅 프롬프트가 저장되었습니다.'); }} className="bg-lime-400 hover:bg-lime-500 text-neutral-950 px-6 py-3 rounded-xl font-bold">명령어 저장</button>
                  </div>
                </div>
              </section>
            </div>
          )}

        </div>
      </main>

      {/* ==========================================
          [Overlays & Modals]
          ========================================== */}
      
      {/* Archive Tag Edit Modal */}
      {editingTagsItem && (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl w-full max-w-md p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">태그 수정</h3>
              <button onClick={() => setEditingTagsItem(null)} className="text-neutral-400 hover:text-white transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="mb-6 rounded-xl overflow-hidden border border-neutral-800 aspect-video bg-neutral-950 flex items-center justify-center">
              <img src={editingTagsItem.thumbnail} alt="preview" className="max-w-full max-h-full object-contain" />
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                {tempTags.map((tag, idx) => (
                  <span key={idx} className="flex items-center gap-1 bg-lime-400/10 border border-lime-400/20 text-lime-400 text-sm px-3 py-1.5 rounded-lg">
                    #{tag}
                    <button onClick={() => handleRemoveTag(tag)} className="ml-1 hover:text-white hover:bg-lime-400/30 rounded-full p-0.5 transition-colors">
                      <X size={14} />
                    </button>
                  </span>
                ))}
                {tempTags.length === 0 && <span className="text-sm text-neutral-500 italic">등록된 태그가 없습니다.</span>}
              </div>

              <form onSubmit={handleAddTag} className="flex gap-2">
                <input 
                  type="text" 
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  placeholder="새 태그 입력 (엔터로 추가)"
                  className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-sm text-neutral-200 focus:outline-none focus:border-lime-500 transition-colors"
                />
                <button type="submit" className="bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors">
                  추가
                </button>
              </form>
            </div>

            <div className="mt-8">
              <button onClick={handleSaveTags} className="w-full bg-lime-400 hover:bg-lime-500 text-neutral-950 py-3 rounded-xl font-bold transition-colors">
                변경사항 저장
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmThreadAcc && (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl max-w-sm w-full text-center shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">스레드 계정 삭제</h3>
            <p className="text-neutral-400 mb-6 text-sm leading-relaxed">
              <strong className="text-white">'{deleteConfirmThreadAcc}'</strong> 계정과<br/>관련된 모든 스레드 데이터가 삭제됩니다.<br/>계속하시겠습니까?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirmThreadAcc(null)} className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-3 rounded-xl font-bold transition-colors">취소</button>
              <button onClick={executeDeleteThreadAccount} className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-3 rounded-xl font-bold transition-colors">삭제하기</button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmBlogAcc && (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl max-w-sm w-full text-center shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">블로그 계정 삭제</h3>
            <p className="text-neutral-400 mb-6 text-sm leading-relaxed">
              <strong className="text-white">'{deleteConfirmBlogAcc}'</strong> 계정과<br/>관련된 모든 블로그 데이터가 삭제됩니다.<br/>계속하시겠습니까?
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirmBlogAcc(null)} className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-3 rounded-xl font-bold transition-colors">취소</button>
              <button onClick={executeDeleteBlogAccount} className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-3 rounded-xl font-bold transition-colors">삭제하기</button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmCategory && (
        <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-2xl max-w-sm w-full text-center shadow-2xl">
            <h3 className="text-xl font-bold text-white mb-2">필터 삭제</h3>
            <p className="text-neutral-400 mb-6 text-sm">
              <strong className="text-white">'{deleteConfirmCategory}'</strong> 필터를 삭제하시겠습니까?<br/>
              <span className="text-xs text-neutral-500 mt-1 block">(사진에 등록된 태그 자체는 유지됩니다.)</span>
            </p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirmCategory(null)} className="flex-1 bg-neutral-800 hover:bg-neutral-700 text-white px-4 py-3 rounded-xl font-bold transition-colors">취소</button>
              <button onClick={executeDeleteCategory} className="flex-1 bg-red-500 hover:bg-red-600 text-white px-4 py-3 rounded-xl font-bold transition-colors">삭제하기</button>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: rgba(163, 230, 53, 0.2); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background-color: rgba(163, 230, 53, 0.4); }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}} />
    </div>
  );
}