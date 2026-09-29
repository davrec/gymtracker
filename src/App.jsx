import React, { useState, useEffect } from 'react';
import { auth, db, loginWithGoogle, logout } from './firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { 
  Search, Plus, Trash2, LogIn, LogOut, Dumbbell, 
  NotebookPen, Calendar, Layers, PlusCircle, ChevronRight,
  X, Info, ArrowLeft, Download, Upload 
} from 'lucide-react';

const RAW_MEDIA_BASE_URL = "https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/";

export default function App() {
  const [user, setUser] = useState(null);
  const [exercises, setExercises] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBodyPart, setSelectedBodyPart] = useState('');
  const [loading, setLoading] = useState(true);

  // Gestione Schede
  const [routines, setRoutines] = useState([]);
  const [selectedRoutine, setSelectedRoutine] = useState(null);
  const [newRoutineName, setNewRoutineName] = useState('');
  const [isCreatingRoutine, setIsCreatingRoutine] = useState(false);

  // Modal Dettaglio Esercizio (Istruzioni IT + GIF)
  const [exerciseDetailModal, setExerciseDetailModal] = useState(null);

  // 1. STATO PER LA MODALE "NUOVO ESERCIZIO CUSTOM"
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newExForm, setNewExForm] = useState({
    name: '',
    body_part: 'chest',
    equipment: 'machine',
    target: '',
    instructionText: '',
    gif_url: ''
  });

  // Tab di navigazione ('my-routines' come predefinito | 'catalog')
  const [activeTab, setActiveTab] = useState('my-routines');

  const todayStr = new Date().toISOString().split('T')[0];

  // Auth Observer
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Caricamento Dataset Esercizi Locale
  useEffect(() => {
    fetch('/exercises.json')
      .then((res) => res.json())
      .then((data) => setExercises(data))
      .catch((err) => console.error("Errore nel caricamento del file exercises.json locale:", err));
  }, []);

  // Caricamento Schede da Firestore
  useEffect(() => {
    if (user) {
      loadUserRoutines();
    } else {
      setRoutines([]);
      setSelectedRoutine(null);
    }
  }, [user]);

  const loadUserRoutines = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'users', user.uid, 'routines'));
      const list = [];
      querySnapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setRoutines(list);
    } catch (err) {
      console.error("Errore caricamento schede:", err);
    }
  };

  // Creazione Nuova Scheda
  const handleCreateRoutine = async (e) => {
    e.preventDefault();
    if (!newRoutineName.trim() || !user) return;

    const routineId = `routine_${Date.now()}`;
    const newRoutine = {
      id: routineId,
      name: newRoutineName.trim(),
      startDate: todayStr,
      exercises: []
    };

    await setDoc(doc(db, 'users', user.uid, 'routines', routineId), {
      name: newRoutine.name,
      startDate: newRoutine.startDate,
      exercises: []
    });

    setRoutines([...routines, newRoutine]);
    setSelectedRoutine(newRoutine);
    setNewRoutineName('');
    setIsCreatingRoutine(false);
  };

  // Eliminazione Scheda
  const handleDeleteRoutine = async (routineId) => {
    if (!user || !window.confirm("Sei sicuro di voler eliminare questa scheda?")) return;
    await deleteDoc(doc(db, 'users', user.uid, 'routines', routineId));
    const updated = routines.filter((r) => r.id !== routineId);
    setRoutines(updated);
    if (selectedRoutine && selectedRoutine.id === routineId) {
      setSelectedRoutine(null);
    }
  };

  // Salvataggio Modifiche Esercizi della Scheda
  const saveRoutine = async (updatedRoutine) => {
    if (!user) return;
    setSelectedRoutine(updatedRoutine);
    setRoutines(routines.map(r => r.id === updatedRoutine.id ? updatedRoutine : r));

    const routineRef = doc(db, 'users', user.uid, 'routines', updatedRoutine.id);
    await setDoc(routineRef, {
      name: updatedRoutine.name,
      startDate: updatedRoutine.startDate,
      exercises: updatedRoutine.exercises
    }, { merge: true });
  };

  // Aggiungi esercizio alla scheda attiva
  const addToRoutine = (exercise) => {
    if (!selectedRoutine) {
      alert("Seleziona o crea prima una scheda a cui aggiungere questo esercizio!");
      setActiveTab('my-routines');
      return;
    }

    const fullDetails = exercises.find(e => e.id === exercise.id) || exercise;

    const newEntry = {
      id: exercise.id,
      name: exercise.name,
      weight: '',
      setsReps: '3x10',
      notes: '',
      gif_url: fullDetails.gif_url || '',
      body_part: fullDetails.body_part || '',
      target: fullDetails.target || '',
      equipment: fullDetails.equipment || '',
      instructions: fullDetails.instructions || {},
      instruction_steps: fullDetails.instruction_steps || {}
    };

    const updated = {
      ...selectedRoutine,
      exercises: [...selectedRoutine.exercises, newEntry]
    };

    saveRoutine(updated);
  };

  // Aggiorna Campi (Peso, Reps, Note)
  const updateExerciseField = (index, field, value) => {
    const updatedExercises = [...selectedRoutine.exercises];
    updatedExercises[index][field] = value;
    saveRoutine({ ...selectedRoutine, exercises: updatedExercises });
  };

  // Rimuovi Esercizio dalla Scheda
  const removeFromRoutine = (index) => {
    const updatedExercises = selectedRoutine.exercises.filter((_, i) => i !== index);
    saveRoutine({ ...selectedRoutine, exercises: updatedExercises });
  };

  // 2. FUNZIONE PER SALVARE UN NUOVO ESERCIZIO PERSONALIZZATO
  const handleSaveNewExercise = (e) => {
    e.preventDefault();
    if (!newExForm.name.trim()) return;

    const newExerciseObj = {
      id: `custom_${Date.now()}`,
      name: newExForm.name.toLowerCase().trim(),
      category: newExForm.body_part,
      body_part: newExForm.body_part,
      equipment: newExForm.equipment || 'personalizzato',
      target: newExForm.target || newExForm.body_part,
      instructions: {
        it: newExForm.instructionText || "Istruzioni non specificate."
      },
      instruction_steps: {
        it: newExForm.instructionText ? [newExForm.instructionText] : []
      },
      muscle_group: newExForm.target || newExForm.body_part,
      secondary_muscles: [],
      image: "",
      gif_url: newExForm.gif_url || "",
      created_at: new Date().toISOString(),
      attribution: "Personalizzato"
    };

    // Aggiungiamo l'esercizio all'inizio della lista in memoria
    setExercises([newExerciseObj, ...exercises]);

    // Resettiamo il form e chiudiamo la modale
    setNewExForm({
      name: '',
      body_part: 'chest',
      equipment: 'machine',
      target: '',
      instructionText: '',
      gif_url: ''
    });
    setIsAddModalOpen(false);
  };

  // 1. ESPORTA TUTTE LE SCHEDE IN UN FILE JSON
const handleExportRoutines = () => {
  if (routines.length === 0) {
    alert("Non hai schede da esportare!");
    return;
  }
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(routines, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `mie_schede_gymtracker_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
};

// 2. IMPORTA LE SCHEDE DA UN FILE JSON
const handleImportRoutines = (event) => {
  const fileReader = new FileReader();
  if (event.target.files && event.target.files[0]) {
    fileReader.readAsText(event.target.files[0], "UTF-8");
    fileReader.onload = async (e) => {
      try {
        const importedData = JSON.parse(e.target.result);
        if (!Array.isArray(importedData)) {
          alert("Formato file non valido. Deve essere un array di schede.");
          return;
        }

        // Se l'utente è loggato, salviamo le schede ordinate anche su Firestore
        if (user) {
          for (const routine of importedData) {
            const routineId = routine.id || `routine_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
            await setDoc(doc(db, 'users', user.uid, 'routines', routineId), {
              name: routine.name || 'Scheda Importata',
              startDate: routine.startDate || todayStr,
              exercises: routine.exercises || []
            }, { merge: true });
          }
          await loadUserRoutines(); // Ricarica le schede da Firestore
        } else {
          // Se offline / non loggato, aggiorna solo lo stato locale
          setRoutines((prev) => [...prev, ...importedData]);
        }
        alert("Schede importate con successo!");
      } catch (err) {
        console.error("Errore importazione:", err);
        alert("Si è verificato un errore durante l'importazione del file.");
      }
    };
  }
};

  // Estrazione Parti del Corpo per il Filtro
  const allBodyParts = Array.from(
    new Set(exercises.map((ex) => ex.body_part).filter(Boolean))
  ).sort();

  // Filtro Esercizi Catalogo
  const filteredExercises = exercises.filter((ex) => {
    const matchesName = ex.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesBodyPart = selectedBodyPart ? ex.body_part === selectedBodyPart : true;
    return matchesName && matchesBodyPart;
  });

  if (loading) return <div className="p-8 text-center text-gray-400 bg-gray-950 min-h-screen">Caricamento in corso...</div>;

  return (
    <div className="min-h-screen bg-gray-950 text-white pb-24 font-sans select-none">
      
      {/* HEADER SUPERIORE */}
      <header className="bg-gray-900 border-b border-gray-800 p-4 sticky top-0 z-20 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-2">
          <Dumbbell className="text-blue-500" size={24} />
          <h1 className="font-bold text-lg tracking-wide">GymTracker</h1>
        </div>

        {user ? (
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 hidden sm:inline">{user.displayName || user.email}</span>
            <button
              onClick={logout}
              className="bg-red-950/60 hover:bg-red-900 text-red-300 p-2 rounded-lg border border-red-800/50 transition"
              title="Esci"
            >
              <LogOut size={18} />
            </button>
          </div>
        ) : (
          <button
            onClick={loginWithGoogle}
            className="bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition"
          >
            <LogIn size={16} /> Accedi
          </button>
        )}
      </header>

      {/* CONTENUTO PRINCIPALE */}
      <main className="max-w-3xl mx-auto p-4">
        
        {/* --- TAB 1: LE MIE SCHEDE --- */}
        {activeTab === 'my-routines' && (
          <div>
            {!user ? (
              <div className="text-center py-16 bg-gray-900/50 rounded-2xl border border-gray-800 p-6">
                <LogIn size={40} className="mx-auto mb-3 text-blue-500" />
                <p className="text-base font-semibold">Accedi con Google</p>
                <p className="text-xs text-gray-400 mt-1 mb-4">Salva le tue schede personalizzate e sincronizzale su tutti i tuoi dispositivi.</p>
                <button
                  onClick={loginWithGoogle}
                  className="bg-blue-600 px-5 py-2.5 rounded-xl text-sm font-semibold inline-flex items-center gap-2"
                >
                  Accedi ora
                </button>
              </div>
            ) : selectedRoutine ? (
              
              /* VISTA DETTAGLIO SCHEDA APERTA */
              <div className="space-y-4">
                <button
                  onClick={() => setSelectedRoutine(null)}
                  className="flex items-center gap-1 text-xs font-semibold text-blue-400 hover:underline mb-2"
                >
                  <ArrowLeft size={16} /> Torna a tutte le schede
                </button>

                <div className="bg-gray-900 p-4 rounded-2xl border border-gray-800 flex justify-between items-start">
                  <div className="space-y-1 flex-1">
                    <input
                      type="text"
                      value={selectedRoutine.name}
                      onChange={(e) => saveRoutine({ ...selectedRoutine, name: e.target.value })}
                      className="text-xl font-bold bg-transparent text-white focus:outline-none border-b border-transparent focus:border-blue-500 w-full"
                    />
                    <div className="flex items-center gap-2 text-xs text-gray-400 pt-1">
                      <Calendar size={13} className="text-blue-400" />
                      <span>Data inizio:</span>
                      <input
                        type="date"
                        value={selectedRoutine.startDate || todayStr}
                        onChange={(e) => saveRoutine({ ...selectedRoutine, startDate: e.target.value })}
                        className="bg-gray-950 border border-gray-800 rounded-md px-2 py-0.5 text-xs text-white focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteRoutine(selectedRoutine.id)}
                    className="text-gray-500 hover:text-red-400 p-2 transition ml-2"
                    title="Elimina scheda"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>

                {/* LISTA ESERCIZI DELLA SCHEDA */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center px-1">
                    <h3 className="text-sm font-semibold text-gray-300">Esercizi ({selectedRoutine.exercises.length})</h3>
                    <button
                      onClick={() => setActiveTab('catalog')}
                      className="text-xs text-blue-400 flex items-center gap-1 hover:underline"
                    >
                      <PlusCircle size={14} /> Aggiungi Esercizio
                    </button>
                  </div>

                  {selectedRoutine.exercises.length === 0 ? (
                    <div className="text-center py-12 bg-gray-900/30 rounded-2xl border border-dashed border-gray-800 p-6">
                      <Dumbbell size={32} className="mx-auto mb-2 text-gray-600" />
                      <p className="text-sm font-medium text-gray-400">Nessun esercizio presente</p>
                      <p className="text-xs text-gray-500 mt-1">Vai nel tab "Esercizi" per sceglierne qualcuno dal catalogo.</p>
                    </div>
                  ) : (
                    selectedRoutine.exercises.map((item, index) => {
                      const fullExData = exercises.find(e => e.id === item.id) || item;
                      return (
                        <div key={index} className="bg-gray-900 p-4 rounded-2xl border border-gray-800/80 space-y-3">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <h4 className="font-bold text-base text-white capitalize">{item.name}</h4>
                              <button
                                onClick={() => setExerciseDetailModal(fullExData)}
                                className="text-xs text-blue-400 flex items-center gap-1 font-medium mt-1 hover:underline"
                              >
                                <Info size={13} /> Scheda Tecnica & GIF
                              </button>
                            </div>

                            <button
                              onClick={() => removeFromRoutine(index)}
                              className="text-gray-500 hover:text-red-400 p-1 transition"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-2.5">
                            <div>
                              <label className="text-[11px] text-gray-400 block mb-1">Peso (kg)</label>
                              <input
                                type="text"
                                placeholder="es. 80"
                                value={item.weight}
                                onChange={(e) => updateExerciseField(index, 'weight', e.target.value)}
                                className="w-full bg-gray-950 border border-gray-800 px-3 py-2 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="text-[11px] text-gray-400 block mb-1">Serie x Reps</label>
                              <input
                                type="text"
                                placeholder="es. 4x8"
                                value={item.setsReps}
                                onChange={(e) => updateExerciseField(index, 'setsReps', e.target.value)}
                                className="w-full bg-gray-950 border border-gray-800 px-3 py-2 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="text-[11px] text-gray-400 mb-1 flex items-center gap-1">
                              <NotebookPen size={11} /> Note personale
                            </label>
                            <textarea
                              placeholder="Note su tempi di recupero, impostazione o esecuzione..."
                              value={item.notes}
                              onChange={(e) => updateExerciseField(index, 'notes', e.target.value)}
                              className="w-full bg-gray-950 border border-gray-800 px-3 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 h-14 resize-none"
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            ) : (

              /* VISTA LISTA DELLE SCHEDE */
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold tracking-tight">Le Mie Schede</h2>
                  <div className="flex items-center gap-2">
                    {/* Pulsante Importa */}
                    <label className="bg-gray-800 hover:bg-gray-700 text-gray-300 p-2 rounded-xl text-xs font-semibold cursor-pointer flex items-center gap-1 transition" title="Importa Schede">
                      <Upload size={16} />
                      <span className="hidden sm:inline">Importa</span>
                      <input type="file" accept=".json" onChange={handleImportRoutines} className="hidden" />
                    </label>

                    {/* Pulsante Esporta */}
                    <button
                      onClick={handleExportRoutines}
                      className="bg-gray-800 hover:bg-gray-700 text-gray-300 p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition"
                      title="Esporta Schede"
                    >
                      <Download size={16} />
                      <span className="hidden sm:inline">Esporta</span>
                    </button>

                    {/* Pulsante Nuova Scheda */}
                    <button
                      onClick={() => setIsCreatingRoutine(!isCreatingRoutine)}
                      className="bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
                    >
                      <Plus size={16} /> Nuova Scheda
                    </button>
                  </div>
                </div>

                {isCreatingRoutine && (
                  <form onSubmit={handleCreateRoutine} className="bg-gray-900 p-4 rounded-2xl border border-gray-800 space-y-3">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Crea Nuova Scheda</h3>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Nome (es. Scheda A - Petto & Tricipiti)..."
                        value={newRoutineName}
                        onChange={(e) => setNewRoutineName(e.target.value)}
                        className="flex-1 bg-gray-950 border border-gray-800 px-3 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                        autoFocus
                      />
                      <button
                        type="submit"
                        className="bg-blue-600 px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-500"
                      >
                        Salva
                      </button>
                    </div>
                  </form>
                )}

                {routines.length === 0 ? (
                  <div className="text-center py-16 bg-gray-900/30 rounded-2xl border border-dashed border-gray-800 p-6">
                    <Layers size={40} className="mx-auto mb-3 text-gray-600" />
                    <p className="text-base font-semibold text-gray-300">Nessuna scheda creata</p>
                    <p className="text-xs text-gray-500 mt-1 mb-4">Crea la tua prima scheda di allenamento per iniziare.</p>
                    <button
                      onClick={() => setIsCreatingRoutine(true)}
                      className="bg-blue-600 px-4 py-2 rounded-xl text-xs font-semibold"
                    >
                      + Crea la tua prima scheda
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {routines.map((routine) => (
                      <div
                        key={routine.id}
                        onClick={() => setSelectedRoutine(routine)}
                        className="bg-gray-900 p-4 rounded-2xl border border-gray-800 hover:border-gray-700 transition cursor-pointer flex justify-between items-center active:bg-gray-850"
                      >
                        <div className="space-y-1">
                          <h3 className="font-bold text-base text-white">{routine.name}</h3>
                          <div className="flex items-center gap-3 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <Calendar size={12} className="text-blue-400" />
                              {routine.startDate || 'Data non specificata'}
                            </span>
                            <span>•</span>
                            <span>{routine.exercises?.length || 0} esercizi</span>
                          </div>
                        </div>

                        <ChevronRight size={20} className="text-gray-500" />
                      </div>
                    ))}
                  </div>
                )}
              </div>

            )}
          </div>
        )}

        {/* --- TAB 2: CATALOGO ESERCIZI --- */}
        {activeTab === 'catalog' && (
          <div className="space-y-4">
            
            {/* 3. BARRA SUPERIORE CON PULSANTE "+ CREA NUOVO ESERCIZIO" */}
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold tracking-tight">Catalogo Esercizi</h2>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Plus size={16} /> Crea Esercizio
              </button>
            </div>

            {/* Ricerca e Filtro */}
            <div className="flex flex-col gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Cerca tra tutti gli esercizi..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-800 pl-10 pr-4 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <select
                value={selectedBodyPart}
                onChange={(e) => setSelectedBodyPart(e.target.value)}
                className="w-full bg-gray-900 border border-gray-800 px-3 py-2.5 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 capitalize"
              >
                <option value="">Tutte le parti del corpo</option>
                {allBodyParts.map((part) => (
                  <option key={part} value={part}>
                    {part}
                  </option>
                ))}
              </select>
            </div>

            {/* Lista Esercizi */}
            <div className="space-y-3">
              {filteredExercises.slice(0, 30).map((ex) => {
                const gifSrc = ex.gif_url
                  ? (ex.gif_url.startsWith('http') ? ex.gif_url : `${RAW_MEDIA_BASE_URL}${ex.gif_url}`)
                  : null;

                return (
                  <div key={ex.id} className="bg-gray-900 p-3.5 rounded-2xl border border-gray-800/80 flex gap-3.5 items-center">
                    {gifSrc ? (
                      <img
                        src={gifSrc}
                        alt={ex.name}
                        className="w-16 h-16 object-cover rounded-xl bg-gray-950 border border-gray-800 shrink-0 cursor-pointer"
                        onClick={() => setExerciseDetailModal(ex)}
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-950 rounded-xl flex items-center justify-center text-[10px] text-gray-500 border border-gray-800 shrink-0 text-center p-1">
                        No Media
                      </div>
                    )}

                    <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExerciseDetailModal(ex)}>
                      <h3 className="font-semibold text-sm truncate capitalize">{ex.name}</h3>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {ex.body_part && (
                          <span className="bg-blue-950 text-blue-300 text-[10px] px-2 py-0.5 rounded-md border border-blue-900 capitalize">
                            {ex.body_part}
                          </span>
                        )}
                        {ex.equipment && (
                          <span className="bg-gray-800 text-gray-300 text-[10px] px-2 py-0.5 rounded-md border border-gray-700 capitalize">
                            {ex.equipment}
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => addToRoutine(ex)}
                      className="bg-blue-600 active:scale-95 text-white p-2.5 rounded-xl font-medium flex items-center justify-center shrink-0 transition"
                      title="Aggiungi alla scheda selezionata"
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </main>

      {/* --- MODAL DETTAGLIO ESERCIZIO --- */}
      {exerciseDetailModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-gray-900 border border-gray-800 w-full max-w-lg rounded-t-3xl sm:rounded-3xl max-h-[90vh] overflow-y-auto p-5 space-y-4">
            
            <div className="flex justify-between items-start sticky top-0 bg-gray-900 pt-1 pb-2 border-b border-gray-800">
              <div>
                <h3 className="font-bold text-lg text-white capitalize">{exerciseDetailModal.name}</h3>
                <span className="text-xs text-blue-400 capitalize">{exerciseDetailModal.target || exerciseDetailModal.category || 'Esercizio'}</span>
              </div>
              <button
                onClick={() => setExerciseDetailModal(null)}
                className="bg-gray-800 text-gray-400 hover:text-white p-1.5 rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            {exerciseDetailModal.gif_url && (
              <div className="bg-gray-950 rounded-2xl overflow-hidden border border-gray-800 flex justify-center p-2">
                <img
                  src={exerciseDetailModal.gif_url.startsWith('http') ? exerciseDetailModal.gif_url : `${RAW_MEDIA_BASE_URL}${exerciseDetailModal.gif_url}`}
                  alt={exerciseDetailModal.name}
                  className="max-h-64 object-contain rounded-xl"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-gray-950 p-3 rounded-xl border border-gray-800">
                <span className="text-gray-400 block mb-1">Zona Target:</span>
                <span className="font-semibold text-blue-400 capitalize">
                  {exerciseDetailModal.body_part || exerciseDetailModal.muscle_group || 'N/D'}
                </span>
              </div>
              <div className="bg-gray-950 p-3 rounded-xl border border-gray-800">
                <span className="text-gray-400 block mb-1">Attrezzatura:</span>
                <span className="font-semibold text-gray-200 capitalize">
                  {exerciseDetailModal.equipment || 'Corpo libero'}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-gray-300 uppercase tracking-wider">Come eseguirlo correttamente:</h4>
              
              {(exerciseDetailModal.instructions?.it || exerciseDetailModal.instructions?.en) && (
                <p className="text-xs text-gray-300 leading-relaxed bg-gray-950 p-3.5 rounded-xl border border-gray-800">
                  {exerciseDetailModal.instructions?.it || exerciseDetailModal.instructions?.en}
                </p>
              )}

              {((exerciseDetailModal.instruction_steps?.it && exerciseDetailModal.instruction_steps.it.length > 0) ||
                (exerciseDetailModal.instruction_steps?.en && exerciseDetailModal.instruction_steps.en.length > 0)) && (
                <ol className="list-decimal list-inside space-y-2 text-xs text-gray-300 leading-relaxed bg-gray-950 p-4 rounded-xl border border-gray-800">
                  {(exerciseDetailModal.instruction_steps?.it || exerciseDetailModal.instruction_steps?.en).map((step, idx) => (
                    <li key={idx} className="pl-1">{step}</li>
                  ))}
                </ol>
              )}
            </div>

            <button
              onClick={() => setExerciseDetailModal(null)}
              className="w-full bg-blue-600 py-3 rounded-xl font-semibold text-xs text-white"
            >
              Chiudi
            </button>
          </div>
        </div>
      )}

      {/* --- 4. MODAL PER CREARE UN NUOVO ESERCIZIO PERSONALIZZATO --- */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 border border-gray-800 w-full max-w-lg rounded-3xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
            
            <div className="flex justify-between items-center border-b border-gray-800 pb-3">
              <h3 className="font-bold text-lg text-white">Nuovo Esercizio Personalizzato</h3>
              <button 
                onClick={() => setIsAddModalOpen(false)} 
                className="p-1 text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveNewExercise} className="space-y-3">
              <div>
                <label className="text-xs text-gray-400 block mb-1">Nome Esercizio *</label>
                <input
                  type="text"
                  required
                  placeholder="es. Converging Chest Press"
                  value={newExForm.name}
                  onChange={(e) => setNewExForm({ ...newExForm, name: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 px-3 py-2 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs text-gray-400 block mb-1">Zona Muscolare</label>
                  <select
                    value={newExForm.body_part}
                    onChange={(e) => setNewExForm({ ...newExForm, body_part: e.target.value })}
                    className="w-full bg-gray-950 border border-gray-800 px-3 py-2 rounded-xl text-sm text-white capitalize focus:outline-none focus:border-blue-500"
                  >
                    <option value="chest">chest (petto)</option>
                    <option value="back">back (schiena)</option>
                    <option value="shoulders">shoulders (spalle)</option>
                    <option value="upper arms">upper arms (braccia)</option>
                    <option value="upper legs">upper legs (gambe)</option>
                    <option value="waist">waist (addome)</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs text-gray-400 block mb-1">Attrezzatura</label>
                  <input
                    type="text"
                    placeholder="es. machine, dumbbell..."
                    value={newExForm.equipment}
                    onChange={(e) => setNewExForm({ ...newExForm, equipment: e.target.value })}
                    className="w-full bg-gray-950 border border-gray-800 px-3 py-2 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Istruzioni (in Italiano)</label>
                <textarea
                  rows="3"
                  placeholder="Spiega brevemente come eseguire l'esercizio..."
                  value={newExForm.instructionText}
                  onChange={(e) => setNewExForm({ ...newExForm, instructionText: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 px-3 py-2 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="text-xs text-gray-400 block mb-1">Link GIF o Immagine (Opzionale)</label>
                <input
                  type="text"
                  placeholder="https://... (lascia vuoto se non ne hai una)"
                  value={newExForm.gif_url}
                  onChange={(e) => setNewExForm({ ...newExForm, gif_url: e.target.value })}
                  className="w-full bg-gray-950 border border-gray-800 px-3 py-2 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 py-3 rounded-xl font-semibold text-xs text-white flex items-center justify-center gap-2 transition mt-2"
              >
                <Plus size={16} /> Aggiungi al Catalogo
              </button>
            </form>
          </div>
        </div>
      )}

      {/* NAVIGAZIONE IN BASSO */}
      <nav className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800 flex justify-around items-center p-2 z-30 backdrop-blur-lg bg-opacity-90">
        <button
          onClick={() => setActiveTab('my-routines')}
          className={`flex flex-col items-center py-1.5 px-6 rounded-xl transition ${
            activeTab === 'my-routines' ? 'text-blue-500 font-semibold' : 'text-gray-400'
          }`}
        >
          <Layers size={20} />
          <span className="text-[10px] mt-1">Le Mie Schede</span>
        </button>

        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex flex-col items-center py-1.5 px-6 rounded-xl transition ${
            activeTab === 'catalog' ? 'text-blue-500 font-semibold' : 'text-gray-400'
          }`}
        >
          <Dumbbell size={20} />
          <span className="text-[10px] mt-1">Esercizi</span>
        </button>
      </nav>

    </div>
  );
}