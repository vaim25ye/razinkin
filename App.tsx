import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SURVEY_QUESTIONS } from './constants';
import { QuestionCard } from './components/QuestionCard';
import { Sidebar } from './components/Sidebar';
import { TableView } from './components/TableView';
import { SurveyAnswer, CompletedSurvey, QuestionType } from './types';
import { exportToExcel } from './utils/export';
import { sendToGoogleSheets } from './utils/googleSheets';
import { GoogleSheetsSettings } from './components/GoogleSheetsSettings';
import { Save, Plus, ArrowUp, Download, Settings, Table, FileText, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { clsx } from 'clsx';

function App() {
  // State
  const [viewMode, setViewMode] = useState<'form' | 'table'>('form');
  const [answers, setAnswers] = useState<SurveyAnswer>({});
  const [completedSurveys, setCompletedSurveys] = useState<CompletedSurvey[]>([]);
  const [activeQuestionId, setActiveQuestionId] = useState<number>(1);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [googleScriptUrl, setGoogleScriptUrl] = useState('');
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success' | 'error'>('idle');
  
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Load from local storage on mount
  useEffect(() => {
    const savedSurveys = localStorage.getItem('medical_surveys');
    const savedUrl = localStorage.getItem('google_script_url');
    if (savedSurveys) {
      try {
        setCompletedSurveys(JSON.parse(savedSurveys));
      } catch (e) {
        console.error("Failed to parse saved surveys");
      }
    }
    if (savedUrl) setGoogleScriptUrl(savedUrl);
  }, []);

  // Save to local storage whenever list changes
  useEffect(() => {
    localStorage.setItem('medical_surveys', JSON.stringify(completedSurveys));
  }, [completedSurveys]);

  const handleAnswerChange = (questionId: number, value: any, preventAutoScroll = false) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
    setActiveQuestionId(questionId);
  };

  // Validation Logic
  const isFormComplete = useMemo(() => {
    return SURVEY_QUESTIONS.every(q => {
      const val = answers[q.id];
      if (!val) return false;
      if (Array.isArray(val)) return val.length > 0;
      if (typeof val === 'string') return val.trim().length > 0;
      if (typeof val === 'object') return Object.keys(val).length > 0;
      return false;
    });
  }, [answers]);

  const saveCurrentSurvey = async () => {
    if (!isFormComplete) {
      alert("Пожалуйста, ответьте на все вопросы перед сохранением.");
      return;
    }

    const newSurvey: CompletedSurvey = {
      id: crypto.randomUUID(),
      timestamp: Date.now(),
      answers: answers,
      synced: false
    };

    // Optimistic UI update
    setCompletedSurveys(prev => [...prev, newSurvey]);
    setAnswers({}); 
    setActiveQuestionId(1);
    
    // Scroll to top
    if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Trigger Cloud Sync if configured
    if (googleScriptUrl) {
      setSyncStatus('syncing');
      try {
        const success = await sendToGoogleSheets(newSurvey, googleScriptUrl);
        if (success) {
          setSyncStatus('success');
          setCompletedSurveys(prev => prev.map(s => s.id === newSurvey.id ? { ...s, synced: true } : s));
          setTimeout(() => setSyncStatus('idle'), 3000);
        } else {
          setSyncStatus('error');
          alert('Анкета сохранена локально, но не удалось отправить в Google Таблицу. Проверьте ссылку скрипта.');
        }
      } catch (e) {
        setSyncStatus('error');
        alert('Ошибка соединения с Google Таблицей.');
      }
    }
  };

  const handleClearAll = () => {
    setCompletedSurveys([]);
    setAnswers({});
  };

  const handleSaveUrl = (url: string) => {
    setGoogleScriptUrl(url);
    localStorage.setItem('google_script_url', url);
  };
  
  // Calculate progress
  const answeredCount = Object.keys(answers).length;
  const progressPercent = Math.round((answeredCount / SURVEY_QUESTIONS.length) * 100);

  return (
    <div className="h-screen bg-slate-50 flex flex-col overflow-hidden font-sans text-slate-900 relative">
      
      {/* Global Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 z-30 shadow-soft shrink-0 relative">
          <div className="px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-tr from-blue-600 to-indigo-600 text-white p-2 rounded-lg shadow-lg">
                  <Table className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-slate-800 tracking-tight">Оцифровка Анкет</h1>
                  <p className="text-xs text-slate-500 font-medium">Система ввода данных</p>
                </div>
              </div>

              {/* View Toggle */}
              <div className="flex bg-slate-100/80 p-1 rounded-xl shadow-inner border border-slate-200/50">
                <button 
                  onClick={() => setViewMode('form')}
                  className={clsx(
                    "px-4 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2", 
                    viewMode === 'form' ? "bg-white shadow-sm text-blue-600 ring-1 ring-black/5" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <FileText className="w-4 h-4" />
                  Анкета
                </button>
                <button 
                  onClick={() => setViewMode('table')}
                  className={clsx(
                    "px-4 py-1.5 rounded-lg text-sm font-semibold transition-all flex items-center gap-2", 
                    viewMode === 'table' ? "bg-white shadow-sm text-green-600 ring-1 ring-black/5" : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  <Table className="w-4 h-4" />
                  База
                  <span className="bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded-md text-[10px] min-w-[20px]">
                    {completedSurveys.length}
                  </span>
                </button>
              </div>

              <div className="flex items-center gap-3">
                 <button 
                   onClick={() => setIsSettingsOpen(true)}
                   className="p-2 text-slate-400 hover:text-blue-600 transition-colors rounded-full hover:bg-slate-100"
                   title="Настройки Google"
                 >
                   <Settings className="w-5 h-5" />
                 </button>
                 
                 {viewMode === 'form' && (
                   <button 
                     onClick={saveCurrentSurvey}
                     disabled={syncStatus === 'syncing' || !isFormComplete}
                     className={clsx(
                       "flex items-center gap-2 px-5 py-2 rounded-xl font-bold shadow-glow transition-all active:scale-95 text-white text-sm whitespace-nowrap",
                       syncStatus === 'syncing' ? "bg-slate-400 cursor-wait" : (
                         isFormComplete ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-300 cursor-not-allowed shadow-none"
                       )
                     )}
                   >
                     {syncStatus === 'syncing' ? '...' : (
                       <>
                         <Save className="w-4 h-4" />
                         <span>Сохранить</span>
                       </>
                     )}
                   </button>
                 )}
                 
                 {viewMode === 'table' && (
                   <button 
                     onClick={() => exportToExcel(completedSurveys)}
                     className="flex items-center gap-2 px-5 py-2 rounded-xl font-bold shadow-md transition-all active:scale-95 text-white bg-green-600 hover:bg-green-700 text-sm whitespace-nowrap"
                   >
                     <Download className="w-4 h-4" />
                     <span>Экспорт</span>
                   </button>
                 )}
              </div>
          </div>
          
          {/* Progress Bar (Visible only in Form mode) */}
          {viewMode === 'form' && (
            <div className="absolute bottom-0 left-0 w-full h-1 bg-slate-100">
               <div 
                 className="h-full bg-blue-600 transition-all duration-500 ease-out shadow-[0_0_10px_rgba(37,99,235,0.5)]"
                 style={{ width: `${progressPercent}%` }}
               />
            </div>
          )}
      </header>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Main Panel */}
        <div className={clsx(
          "flex-1 overflow-hidden flex flex-col transition-all duration-300",
          viewMode === 'form' ? "mr-0 lg:mr-80" : "mr-0"
        )}>
          {viewMode === 'form' ? (
             <div 
               ref={scrollContainerRef}
               className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth"
             >
               <div className="max-w-3xl mx-auto pb-40">
                  {SURVEY_QUESTIONS.map((q) => (
                    <QuestionCard
                      key={q.id}
                      question={q}
                      answer={answers[q.id]}
                      onChange={(val: any, preventScroll?: boolean) => handleAnswerChange(q.id, val, preventScroll)}
                      isActive={activeQuestionId === q.id}
                    />
                  ))}
                  
                  {/* End of Form Action */}
                  <div className="mt-12 p-8 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 text-center">
                      <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm text-blue-500">
                         <CheckCircle2 className="w-8 h-8" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-800 mb-2">Анкета заполнена</h3>
                      <p className="text-slate-500 mb-6">Проверьте ответы перед сохранением.</p>
                      <button 
                         onClick={saveCurrentSurvey}
                         disabled={!isFormComplete}
                         className={clsx(
                           "px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all active:scale-95 mx-auto flex items-center gap-2",
                           isFormComplete ? "bg-blue-600 hover:bg-blue-700 hover:shadow-blue-500/25" : "bg-slate-300 cursor-not-allowed"
                         )}
                       >
                         <Save className="w-5 h-5" />
                         Сохранить в базу
                       </button>
                  </div>
               </div>
             </div>
          ) : (
            <TableView data={completedSurveys} />
          )}
        </div>

        {/* Sidebar (Only visible in Form mode) */}
        {viewMode === 'form' && (
           <Sidebar 
             completedSurveys={completedSurveys} 
             onExport={() => exportToExcel(completedSurveys)}
             onClearAll={handleClearAll}
             currentId={""}
           />
        )}
        
      </div>

      <GoogleSheetsSettings 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        savedUrl={googleScriptUrl}
        onSaveUrl={handleSaveUrl}
      />
      
    </div>
  );
}

export default App;