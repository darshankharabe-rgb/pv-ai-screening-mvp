import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity,
  AlertCircle,
  Archive,
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  ClipboardCheck,
  Database,
  FileSearch,
  FileText,
  Folder,
  Microscope,
  Search,
  Share2,
  ShieldCheck,
  SlidersHorizontal,
  Tags,
  Target,
  Trash2,
  Upload,
  Users,
  X,
} from 'lucide-react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

type ScreeningResult = {
  verdict?: 'RELEVANT' | 'NOT_RELEVANT' | 'UNCERTAIN' | string;
  confidence?: number;
  reason?: string;
  entities?: {
    adverse_event?: string;
    drug?: string;
    patient?: string;
  };
};

type ReviewPaper = {
  id: string;
  title: string;
  journal: string;
  published: string;
  authors: string;
  match: number;
  matchNote: string;
  abstract: string;
  tags: Array<{ icon: typeof Microscope; label: string }>;
  priority: 'high' | 'medium' | 'low';
  confidenceLevel?: 'HIGH' | 'MEDIUM' | 'LOW' | 'REJECT';
  drugMatchLevel?: string;
  eventMatchLevel?: string;
  couplingStrength?: 'STRONG' | 'MEDIUM' | 'WEAK' | 'NONE';
  causalityStrength?: 'EXPLICIT' | 'IMPLIED' | 'NONE';
  centrality?: 'CENTRAL' | 'NON-CENTRAL';
  finalDecision?: 'INCLUDE' | 'EXCLUDE';
};

type SearchPaper = {
  title?: string;
  abstract?: string;
  source?: string;
  pmid?: string;
};

type AppTab = 'search' | 'review' | 'archives';

const fallbackPapers: ReviewPaper[] = [
  {
    id: 'fallback-1',
    title: 'Novel Allosteric Modulation of EGFR in Erlotinib-Resistant Non-Small Cell Lung Cancer Models',
    journal: 'Journal of Medicinal Chemistry',
    published: 'Oct 2023',
    authors: 'Chen, L., Martinez, J., et al.',
    match: 98,
    matchNote: 'High structural similarity',
    abstract:
      'This study identifies a novel binding pocket adjacent to the ATP-binding site of the epidermal growth factor receptor. Utilizing high-throughput virtual screening followed by X-ray crystallography, the authors report durable kinase inhibition in resistant cell models.',
    tags: [
      { icon: Microscope, label: 'In Vitro' },
      { icon: FileSearch, label: 'Crystallography' },
    ],
    priority: 'high',
  },
  {
    id: 'fallback-2',
    title: 'Computational Assessment of Kinase Selectivity Profiles Using Machine Learning Approaches',
    journal: 'Nature Chemical Biology',
    published: 'Sep 2023',
    authors: 'Gupta, R., Wang, H.',
    match: 84,
    matchNote: 'Methodology match',
    abstract:
      'A machine learning framework predicts kinome-wide selectivity from limited empirical screening data. Structural fingerprints and thermodynamic metrics are combined to flag off-target interactions across a large panel of human kinases.',
    tags: [
      { icon: Database, label: 'In Silico' },
      { icon: FileText, label: 'Large Dataset' },
    ],
    priority: 'medium',
  },
];

function cleanVerdict(value?: string) {
  if (!value) return 'UNCERTAIN';
  return value.replace('_', ' ');
}

function confidencePercent(result: ScreeningResult | null) {
  return Math.round(((result?.confidence ?? 0.82) > 1 ? result?.confidence ?? 82 : (result?.confidence ?? 0.82) * 100));
}

function buildReviewPapers(result: ScreeningResult | null, inputText: string): ReviewPaper[] {
  if (!result) return fallbackPapers;

  const event = result.entities?.adverse_event || 'Safety signal under review';
  const drug = result.entities?.drug || 'Candidate therapy';
  const patient = result.entities?.patient || 'Human patient profile';
  const verdict = result.verdict || 'UNCERTAIN';
  const confidence = confidencePercent(result);
  const isRelevant = verdict === 'RELEVANT';

  return [
    {
      id: 'analysis-1',
      title: `${drug}: ${event}`,
      journal: 'AI Screening Result',
      published: 'Current run',
      authors: patient,
      match: confidence,
      matchNote: isRelevant ? 'Likely ICSR signal' : verdict === 'NOT_RELEVANT' ? 'Low safety relevance' : 'Needs manual review',
      abstract: result.reason || inputText || 'The model returned a screening result without a narrative reason.',
      tags: [
        { icon: ShieldCheck, label: cleanVerdict(verdict) },
        { icon: Activity, label: event },
      ],
      priority: isRelevant ? 'high' : verdict === 'UNCERTAIN' ? 'medium' : 'low',
    },
    ...fallbackPapers,
  ];
}

function scorePaper(paper: SearchPaper, index: number, result: ScreeningResult | null) {
  const title = (paper.title || '').toLowerCase();
  const abstract = (paper.abstract || '').toLowerCase();
  const text = `${title} ${abstract}`;
  
  const drug = (result?.entities?.drug || '').toLowerCase();
  const event = (result?.entities?.adverse_event || '').toLowerCase();
  
  // 1. DRUG MATCH (Max 100%)
  let drugScore = 0;
  let drugMatchLevel = '0%';
  if (drug && text.includes(drug)) { drugScore = 100; drugMatchLevel = '100% (Exact)'; }
  else if (drug && drug.split(' ').some(d => d.length > 4 && text.includes(d))) { drugScore = 60; drugMatchLevel = '60% (Class)'; }
  else { drugMatchLevel = '0% (Unrelated)'; }
  
  // 2. EVENT MATCH (Max 100%)
  let eventScore = 0;
  let eventMatchLevel = '0%';
  if (event && text.includes(event)) { eventScore = 100; eventMatchLevel = '100% (Exact)'; }
  else if (event && event.split(' ').some(e => e.length > 4 && text.includes(e))) { eventScore = 80; eventMatchLevel = '80% (Syndrome)'; }
  else if (text.includes('adverse') || text.includes('toxicity') || text.includes('reaction')) { eventScore = 40; eventMatchLevel = '40% (System)'; }
  else { eventMatchLevel = '10% (Broad)'; eventScore = 10; }
  
  // 3. DRUG-EVENT COUPLING (Max 100%)
  const sentences = text.split('. ');
  const sameSentence = sentences.some(s => drug && event && s.includes(drug) && s.includes(event));
  const causalLink = sentences.some(s => drug && event && s.includes(drug) && s.includes(event) && (s.includes('induced') || s.includes('caused by') || s.includes('associated with') || s.includes('secondary to') || s.includes('attributed to')));
  const caseDesc = text.includes('case report') || text.includes('case series') || text.includes('-year-old');
  
  let couplingStrength: 'STRONG' | 'MEDIUM' | 'WEAK' | 'NONE' = 'NONE';
  let couplingScore = 0;
  
  const bothPresent = drugScore > 0 && eventScore > 0;
  const bothCentral = drug && event && title.includes(drug) && title.includes(event);
  
  if (bothPresent && (causalLink || caseDesc)) { 
      couplingStrength = 'STRONG'; 
      couplingScore = 100; 
  } else if (bothPresent && (bothCentral || sameSentence)) { 
      couplingStrength = 'MEDIUM'; 
      couplingScore = 75; 
  } else if (bothPresent) { 
      couplingStrength = 'WEAK'; 
      couplingScore = 40; 
  }
  
  // 4. CAUSALITY STRENGTH (Max 100%)
  const strongCausalityKeywords = ['caused by', 'induced by', 'attributed to', 'dechallenge', 'rechallenge', 'biopsy confirmed', 'probable culprit'];
  const impliedCausalityKeywords = ['associated with', 'suspected', 'possible', 'related to', 'induced'];
  
  let causalityStrength: 'EXPLICIT' | 'IMPLIED' | 'NONE' = 'NONE';
  let causalityScore = 0;
  if (strongCausalityKeywords.some(kw => text.includes(kw))) { causalityStrength = 'EXPLICIT'; causalityScore = 100; }
  else if (impliedCausalityKeywords.some(kw => text.includes(kw))) { causalityStrength = 'IMPLIED'; causalityScore = 50; }
  
  // 6. CENTRALITY RULE
  let centrality: 'CENTRAL' | 'NON-CENTRAL' = 'NON-CENTRAL';
  if ((drug && title.includes(drug)) || (event && title.includes(event)) || title.includes('case report') || title.includes('induced')) {
    centrality = 'CENTRAL';
  }
  
  // 7. PENALTY RULES
  let penalties = 0;
  const incidentalKeywords = ['background', 'rarely', 'can cause', 'previously reported'];
  if (incidentalKeywords.some(kw => text.includes(kw))) penalties += 50;
  
  const reviewKeywords = ['review', 'meta-analysis', 'overview', 'systematic review'];
  if (reviewKeywords.some(kw => title.includes(kw))) penalties += 40;
  
  if (drugScore === 0) penalties += 60;
  if (eventScore <= 10) penalties += 50;
  
  // Relaxed penalty: don't heavily penalize missing causality if it's a central known toxicity summary
  if (causalityStrength === 'NONE' && centrality === 'NON-CENTRAL') penalties += 30;
  else if (causalityStrength === 'NONE') penalties += 10;
  
  // FINAL SCORING LOGIC
  let rawScore = (drugScore * 0.35) + (eventScore * 0.35) + (couplingScore * 0.20) + (causalityScore * 0.10);
  let finalScore = rawScore - penalties;
  
  // 8. REJECTION RULE
  let confidenceLevel: 'HIGH' | 'MEDIUM' | 'LOW' | 'REJECT' = 'MEDIUM';
  let finalDecision: 'INCLUDE' | 'EXCLUDE' = 'INCLUDE';
  
  // Relaxed Rejection: Only reject if coupling is NONE *and* it's non-central, OR completely irrelevant
  const failsCouplingAndCentrality = (couplingStrength === 'NONE' && centrality === 'NON-CENTRAL');
  
  if (failsCouplingAndCentrality || finalScore < 30) {
    confidenceLevel = 'REJECT';
    finalDecision = 'EXCLUDE';
  } else if (finalScore >= 70 || (couplingStrength === 'STRONG' && centrality === 'CENTRAL')) {
    confidenceLevel = 'HIGH';
  } else if (finalScore >= 45 || couplingStrength === 'MEDIUM' || couplingStrength === 'STRONG') {
    confidenceLevel = 'MEDIUM';
  } else {
    confidenceLevel = 'LOW';
  }

  const tieBreaker = Math.max(0, 5 - Math.floor(index / 5));

  return {
    score: Math.max(0, Math.min(99, Math.round(finalScore) + tieBreaker)),
    drugMatchLevel,
    eventMatchLevel,
    couplingStrength,
    causalityStrength,
    centrality,
    confidenceLevel,
    finalDecision
  };
}

function mapSearchPapers(papers: SearchPaper[], result: ScreeningResult | null, inputText: string): ReviewPaper[] {
  return papers
    .map((paper, index) => {
      const details = scorePaper(paper, index, result);
      
      let matchNote = details.confidenceLevel === 'HIGH' ? 'High causality confidence' 
        : details.confidenceLevel === 'MEDIUM' ? 'Probable safety signal'
        : details.confidenceLevel === 'LOW' ? 'Incidental or background mention'
        : 'Rejected / Excluded';
      
      return {
        id: paper.pmid || `paper-${index}`,
        title: paper.title || 'Untitled paper',
        journal: paper.source || 'Europe PMC',
        published: 'Indexed result',
        authors: paper.pmid ? `PMID: ${paper.pmid}` : 'Metadata unavailable',
        match: details.score,
        matchNote,
        abstract: paper.abstract || 'No abstract available.',
        tags: [
          { icon: ShieldCheck, label: details.finalDecision },
          { icon: Activity, label: result?.entities?.adverse_event || 'Safety Signal' },
        ],
        priority: details.confidenceLevel === 'HIGH' ? 'high' : details.confidenceLevel === 'MEDIUM' ? 'medium' : 'low',
        confidenceLevel: details.confidenceLevel,
        drugMatchLevel: details.drugMatchLevel,
        eventMatchLevel: details.eventMatchLevel,
        couplingStrength: details.couplingStrength,
        causalityStrength: details.causalityStrength,
        centrality: details.centrality,
        finalDecision: details.finalDecision,
      } satisfies ReviewPaper;
    })
    .sort((a, b) => b.match - a.match);
}

function loadArchivedPapers() {
  try {
    return JSON.parse(localStorage.getItem('pv_archived_papers') || '[]') as ReviewPaper[];
  } catch {
    return [];
  }
}

function apiUrl(path: string) {
  return `${API_BASE_URL}${path}`;
}

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [currentTab, setCurrentTab] = useState<AppTab>('search');
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [apiResult, setApiResult] = useState<ScreeningResult | null>(null);
  const [searchPapers, setSearchPapers] = useState<ReviewPaper[]>([]);
  const [handledIds, setHandledIds] = useState<string[]>([]);
  const [archivedPapers, setArchivedPapers] = useState<ReviewPaper[]>(loadArchivedPapers);
  const [acceptedCount, setAcceptedCount] = useState(0);
  const [rejectedCount, setRejectedCount] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const reviewPapers = useMemo(
    () => searchPapers.length > 0 ? searchPapers : buildReviewPapers(apiResult, inputText),
    [apiResult, inputText, searchPapers],
  );
  const queuedPapers = useMemo(
    () => reviewPapers.filter((paper) => !handledIds.includes(paper.id) && !archivedPapers.some((archived) => archived.id === paper.id)),
    [archivedPapers, handledIds, reviewPapers],
  );
  const topScore = queuedPapers[0]?.match ?? 0;

  useEffect(() => {
    localStorage.setItem('pv_archived_papers', JSON.stringify(archivedPapers));
  }, [archivedPapers]);

  useEffect(() => {
    const syncFromHistory = () => {
      const tab = new URLSearchParams(window.location.search).get('tab') as AppTab | null;
      setCurrentTab(tab === 'review' || tab === 'archives' ? tab : 'search');
    };
    syncFromHistory();
    window.addEventListener('popstate', syncFromHistory);
    return () => window.removeEventListener('popstate', syncFromHistory);
  }, []);

  const navigateTo = (tab: AppTab, push = true) => {
    setActivePage('dashboard');
    setCurrentTab(tab);
    if (push) {
      const url = tab === 'search' ? window.location.pathname : `${window.location.pathname}?tab=${tab}`;
      window.history.pushState({ tab }, '', url);
    }
  };

  const completePaper = (paper: ReviewPaper, action: 'accept' | 'reject' | 'archive') => {
    setHandledIds((ids) => ids.includes(paper.id) ? ids : [...ids, paper.id]);
    setSearchPapers((papers) => papers.filter((item) => item.id !== paper.id));
    if (action === 'accept') setAcceptedCount((count) => count + 1);
    if (action === 'reject') setRejectedCount((count) => count + 1);
    if (action === 'archive') {
      setArchivedPapers((papers) => papers.some((item) => item.id === paper.id) ? papers : [paper, ...papers]);
    }
  };

  const restorePaper = (paper: ReviewPaper) => {
    setArchivedPapers((papers) => papers.filter((item) => item.id !== paper.id));
    setHandledIds((ids) => ids.filter((id) => id !== paper.id));
    setSearchPapers((papers) => papers.some((item) => item.id === paper.id) ? papers : [paper, ...papers].sort((a, b) => b.match - a.match));
    navigateTo('review');
  };

  const handleAnalyze = async () => {
    if (!inputText.trim()) return;
    setIsAnalyzing(true);
    setErrorMsg(null);

    try {
      const response = await fetch(apiUrl('/screen'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drug_name: 'Unknown',
          title: 'Unknown',
          abstract: inputText,
        }),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || 'Failed to connect to the backend API');
      }

      const data = await response.json();
      const cleanJson = data.result.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedVerdict = JSON.parse(cleanJson);
      const query = [
        parsedVerdict.entities?.drug,
        parsedVerdict.entities?.adverse_event,
        inputText.split(/\s+/).slice(0, 12).join(' '),
      ].filter(Boolean).join(' ');
      const papersResponse = await fetch(apiUrl(`/search?query=${encodeURIComponent(query)}&limit=120`));
      const papersData = papersResponse.ok ? await papersResponse.json() : { results: [] };

      setApiResult(parsedVerdict);
      setSearchPapers(mapSearchPapers(papersData.results || [], parsedVerdict, inputText));
      setHandledIds([]);
      navigateTo('review');
    } catch (err: any) {
      const deployHint = API_BASE_URL.includes('127.0.0.1')
        ? ' Backend is still set to localhost. For Vercel, set VITE_API_BASE_URL to your deployed FastAPI URL.'
        : '';
      setErrorMsg(`${err.message || 'An error occurred during analysis'}.${deployHint}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const goToSearch = () => {
    navigateTo('search');
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background text-on-surface">
      <Sidebar activePage={activePage} onPageChange={setActivePage} onNewExperiment={goToSearch} />

      <div className="flex-1 flex flex-col md:ml-64 h-full overflow-hidden">
        <Header currentTab={currentTab} onTabChange={(tab) => navigateTo(tab as AppTab)} />

        <AnimatePresence mode="wait">
          {activePage !== 'dashboard' ? (
            <motion.main
              key={activePage}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 overflow-y-auto px-5 sm:px-10 py-8 bg-surface"
            >
              <div className="max-w-5xl">
                <button onClick={() => setActivePage('dashboard')} className="mb-5 text-primary label-md flex items-center gap-2 hover:text-primary-container">
                  <ArrowLeft className="w-4 h-4" />
                  Dashboard
                </button>
                <div className="bg-surface-container-lowest border border-outline-variant rounded p-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-surface-container-high text-primary p-3 rounded">
                      <ClipboardCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="headline-lg text-on-surface mb-2">
                        {activePage === 'active-runs' ? 'Active Runs' : activePage === 'database' ? 'Database' : activePage === 'settings' ? 'Settings' : activePage === 'support' ? 'Support' : 'System Logs'}
                      </h2>
                      <p className="body-md text-on-surface-variant max-w-2xl">
                        This workspace section is connected and ready for the next workflow. The screening dashboard remains the primary production surface for search, review, archive, and export.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.main>
          ) : currentTab === 'search' ? (
            <motion.main
              key="landing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-10 relative"
            >
              <div className="absolute inset-0 pointer-events-none clinical-grid opacity-30" />

              <div className="w-full max-w-3xl relative z-10">
                <div className="text-center mb-10">
                  <h2 className="headline-xl text-on-background mb-4">Pharmaco-vigilance Screener</h2>
                  <p className="body-lg text-on-surface-variant max-w-2xl mx-auto">
                    Input scientific literature titles and abstracts to identify Individual Case Safety Reports describing adverse drug reactions in human patients.
                  </p>
                </div>

                <div className="bg-surface-container-lowest p-6 rounded-lg border border-outline-variant shadow-sm relative">
                  <label className="block label-md text-on-surface mb-2" htmlFor="drug-description">
                    Drug Description Input
                  </label>
                  <div className="relative">
                    <textarea
                      id="drug-description"
                      value={inputText}
                      onChange={(event) => setInputText(event.target.value)}
                      className="w-full bg-surface text-on-background code-md border border-outline-variant rounded-lg p-4 focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none h-48"
                      placeholder='Paste scientific article title and abstract here, e.g. "A 65-year-old male treated with Ibuprofen developed gastrointestinal bleeding..."'
                    />
                    <div className="absolute bottom-4 right-4 flex gap-2">
                      <button className="text-on-surface-variant hover:text-primary transition-colors p-1.5 rounded-md hover:bg-surface-container" title="Upload source">
                        <Upload className="w-4 h-4" />
                      </button>
                      <button className="text-on-surface-variant hover:text-primary transition-colors p-1.5 rounded-md hover:bg-surface-container" title="Share source">
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="mt-4 p-3 bg-[#ffdad6] text-[#93000a] rounded-lg body-sm font-medium flex gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={handleAnalyze}
                      disabled={isAnalyzing || !inputText.trim()}
                      className="bg-primary text-on-primary px-6 py-2.5 rounded-lg label-md flex items-center gap-2 hover:bg-primary-container transition-all disabled:opacity-50"
                    >
                      {isAnalyzing ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Screening literature...
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4" />
                          Search Papers
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="mt-12 text-center">
                  <p className="label-md text-on-surface-variant mb-4">Recent Protocols & Tags</p>
                  <div className="flex flex-wrap justify-center gap-3">
                    {[
                      { icon: Activity, label: 'Adverse Reactions' },
                      { icon: ShieldCheck, label: 'Patient Safety' },
                      { icon: Tags, label: 'Drug Exposure' },
                      { icon: Users, label: 'Human Reports' },
                    ].map((tag) => (
                      <span
                        key={tag.label}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-surface-container border border-outline-variant rounded-lg label-md text-on-surface-variant cursor-pointer hover:bg-surface-container-high transition-colors"
                      >
                        <tag.icon className="w-4 h-4" />
                        {tag.label}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.main>
          ) : currentTab === 'archives' ? (
            <motion.main
              key="archives"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 overflow-y-auto px-5 sm:px-10 py-8 bg-surface"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between mb-5">
                <div>
                  <h2 className="headline-lg text-on-surface">Archives</h2>
                  <p className="body-md text-on-surface-variant">{archivedPapers.length} stored papers available for reuse or removal.</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => window.history.back()} className="bg-surface-container-lowest border border-outline-variant text-on-surface px-3 py-2 rounded label-md flex items-center gap-2 hover:bg-surface-container-high">
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>
                  <button onClick={() => window.history.forward()} className="bg-surface-container-lowest border border-outline-variant text-on-surface px-3 py-2 rounded label-md flex items-center gap-2 hover:bg-surface-container-high">
                    <ArrowRight className="w-4 h-4" />
                    Forward
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                {archivedPapers.map((paper) => (
                  <article key={paper.id} className="bg-surface-container-lowest border border-outline-variant p-4 rounded flex flex-col gap-3">
                    <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                      <div>
                        <h3 className="headline-md text-on-surface">{paper.title}</h3>
                        <p className="body-sm text-on-surface-variant">{paper.journal} · {paper.authors}</p>
                      </div>
                      <span className="bg-surface-container-high text-on-surface border border-outline-variant label-md px-3 py-1.5 rounded">{paper.match}% Match</span>
                    </div>
                    <p className="body-md text-on-surface-variant line-clamp-3">{paper.abstract}</p>
                    <div className="flex justify-end gap-2 pt-3 border-t border-surface-container-highest">
                      <button onClick={() => restorePaper(paper)} className="bg-secondary text-on-secondary px-3 py-2 rounded label-md flex items-center gap-2 hover:bg-on-secondary-container">
                        <Archive className="w-4 h-4" />
                        Restore
                      </button>
                      <button onClick={() => setArchivedPapers((papers) => papers.filter((item) => item.id !== paper.id))} className="border border-[#ba1a1a] text-[#ba1a1a] px-3 py-2 rounded label-md flex items-center gap-2 hover:bg-[#ffdad6]">
                        <Trash2 className="w-4 h-4" />
                        Remove
                      </button>
                    </div>
                  </article>
                ))}
                {archivedPapers.length === 0 && (
                  <div className="bg-surface-container-lowest border border-outline-variant p-8 text-center rounded">
                    <p className="headline-md text-on-surface mb-1">No archived papers yet</p>
                    <p className="body-md text-on-surface-variant">Use the folder button on a review card to store papers here.</p>
                  </div>
                )}
              </div>
            </motion.main>
          ) : (
            <motion.main
              key="results"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 min-h-0 overflow-hidden flex bg-surface"
            >
              <section className="flex-1 min-w-0 overflow-y-auto px-5 sm:px-10 py-8 flex flex-col gap-4">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <nav className="flex items-center gap-2 text-on-surface-variant body-sm mb-2">
                      <button onClick={goToSearch} className="hover:text-primary">New Search</button>
                      <ChevronRight className="w-3 h-3" />
                      <span className="text-on-surface font-medium">Review Queue</span>
                    </nav>
                    <h2 className="headline-lg text-on-surface">Review Queue: Safety Signals</h2>
                    <p className="body-md text-on-surface-variant">
                      Showing {queuedPapers.length} papers, highest confidence first.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="bg-surface-container-highest text-primary label-md px-3 py-2 rounded border border-outline-variant">
                      Sort: Relevance
                    </span>
                    <span className="bg-surface-container-lowest border border-outline-variant text-on-surface px-3 py-2 rounded label-md">
                      Accepted: {acceptedCount}
                    </span>
                    <span className="bg-surface-container-lowest border border-outline-variant text-on-surface px-3 py-2 rounded label-md">
                      Rejected: {rejectedCount}
                    </span>
                    <button onClick={() => navigateTo('archives')} className="bg-surface-container-lowest border border-outline-variant text-on-surface px-3 py-2 rounded label-md flex items-center gap-2 hover:bg-surface-container-high transition-colors">
                      <Database className="w-4 h-4" />
                      Archives
                    </button>
                    <button onClick={() => {
                      const blob = new Blob([JSON.stringify({ queuedPapers, archivedPapers, acceptedCount, rejectedCount }, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const link = document.createElement('a');
                      link.href = url;
                      link.download = 'pv-review-queue.json';
                      link.click();
                      URL.revokeObjectURL(url);
                    }} className="bg-primary text-on-primary px-3 py-2 rounded label-md flex items-center gap-2 hover:bg-primary-container transition-colors">
                      <FileText className="w-4 h-4" />
                      Export
                    </button>
                  </div>
                </div>

                {apiResult && (
                  <div className="bg-surface-container-lowest border border-outline-variant p-4 rounded flex gap-3 items-start">
                    <div className={`p-2 rounded ${apiResult.verdict === 'RELEVANT' ? 'bg-[#ffdad6] text-[#93000a]' : 'bg-secondary-container text-on-secondary-container'}`}>
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="label-md text-on-surface-variant mb-1">AI Reasoning</p>
                      <p className="body-md text-on-surface">{apiResult.reason || 'No reasoning returned by the screening API.'}</p>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-4">
                  {queuedPapers.map((paper) => (
                    <article
                      key={paper.id}
                      className="bg-surface-container-lowest border border-outline-variant p-4 flex flex-col gap-3 hover:bg-surface-bright transition-colors"
                    >
                      <div className="flex flex-col gap-3 xl:flex-row xl:justify-between xl:items-start">
                        <div className="min-w-0 flex-1">
                          <h3 className="headline-md mb-1 leading-tight">
                            {paper.id.match(/^\d+$/) ? (
                              <a href={`https://pubmed.ncbi.nlm.nih.gov/${paper.id}/`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                {paper.title}
                              </a>
                            ) : (
                              <span className="text-on-surface">{paper.title}</span>
                            )}
                          </h3>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2">
                            <span className="label-md text-primary">{paper.journal}</span>
                            <span className="body-sm text-on-surface-variant">Published: {paper.published}</span>
                            <span className="body-sm text-on-surface-variant">Authors: {paper.authors}</span>
                          </div>
                        </div>

                        <div className="flex xl:flex-col items-start xl:items-end gap-2 shrink-0">
                          <div
                            className={`border label-md px-3 py-1.5 rounded flex items-center gap-1.5 ${
                              paper.priority === 'high'
                                ? 'bg-secondary-container text-on-secondary-container border-secondary'
                                : 'bg-surface-container-high text-on-surface border-outline-variant'
                            }`}
                          >
                            <SlidersHorizontal className="w-4 h-4" />
                            {paper.match}% Match
                          </div>
                          <span className="body-sm text-on-surface-variant">{paper.matchNote}</span>
                        </div>
                      </div>

                      {(paper.confidenceLevel || paper.drugMatchLevel) && (
                        <div className="bg-surface-container py-2 px-3 rounded text-xs flex flex-wrap gap-x-4 gap-y-2 mt-1 mb-2 border border-outline-variant">
                          <div className="flex flex-col"><span className="text-on-surface-variant font-medium">Confidence:</span> <span className={paper.confidenceLevel === 'HIGH' ? 'text-primary font-bold' : paper.confidenceLevel === 'REJECT' ? 'text-[#ba1a1a] font-bold' : 'text-on-surface'}>{paper.confidenceLevel}</span></div>
                          <div className="flex flex-col"><span className="text-on-surface-variant font-medium">Drug Match:</span> <span className="text-on-surface">{paper.drugMatchLevel}</span></div>
                          <div className="flex flex-col"><span className="text-on-surface-variant font-medium">Event Match:</span> <span className="text-on-surface">{paper.eventMatchLevel}</span></div>
                          <div className="flex flex-col"><span className="text-on-surface-variant font-medium">Coupling:</span> <span className="text-on-surface">{paper.couplingStrength}</span></div>
                          <div className="flex flex-col"><span className="text-on-surface-variant font-medium">Causality:</span> <span className="text-on-surface">{paper.causalityStrength}</span></div>
                          <div className="flex flex-col"><span className="text-on-surface-variant font-medium">Centrality:</span> <span className="text-on-surface">{paper.centrality}</span></div>
                          <div className="flex flex-col"><span className="text-on-surface-variant font-medium">Decision:</span> <span className={paper.finalDecision === 'INCLUDE' ? 'text-[#146c2e] font-bold' : 'text-[#ba1a1a] font-bold'}>{paper.finalDecision}</span></div>
                        </div>
                      )}

                      <p className="body-md text-on-surface-variant line-clamp-3">{paper.abstract}</p>

                      <div className="flex flex-col gap-3 md:flex-row md:justify-between md:items-center mt-1 pt-3 border-t border-surface-container-highest">
                        <div className="flex flex-wrap gap-2">
                          {paper.tags.map((tag) => (
                            <span
                              key={`${paper.id}-${tag.label}`}
                              className="inline-flex items-center gap-1.5 bg-surface text-on-surface-variant code-md px-2 py-1 border border-outline-variant rounded"
                            >
                              <tag.icon className="w-3.5 h-3.5" />
                              {tag.label}
                            </span>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => completePaper(paper, 'archive')} className="w-10 h-10 flex items-center justify-center border border-outline-variant rounded text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface transition-colors" title="Archive for later">
                            <Folder className="w-4 h-4" />
                          </button>
                          <button onClick={() => completePaper(paper, 'reject')} className="w-10 h-10 flex items-center justify-center border border-[#ba1a1a] text-[#ba1a1a] rounded hover:bg-[#ffdad6] hover:text-[#93000a] transition-colors" title="Reject as irrelevant">
                            <X className="w-4 h-4" />
                          </button>
                          <button onClick={() => completePaper(paper, 'accept')} className="w-10 h-10 flex items-center justify-center bg-secondary text-on-secondary rounded hover:bg-on-secondary-container transition-colors shadow-sm" title="Accept and extract data">
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                  {queuedPapers.length === 0 && (
                    <div className="bg-surface-container-lowest border border-outline-variant p-8 text-center rounded">
                      <p className="headline-md text-on-surface mb-1">Review queue cleared</p>
                      <p className="body-md text-on-surface-variant">Accepted, rejected, or archived papers are no longer in the active queue.</p>
                    </div>
                  )}
                </div>
              </section>

              <aside className="hidden xl:flex w-80 bg-surface border-l border-outline-variant flex-col h-full overflow-y-auto">
                <div className="p-6 border-b border-outline-variant">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="headline-md text-on-surface">Active Parameters</h3>
                    <button onClick={() => setHandledIds([])} className="text-primary hover:text-primary-container label-md">Reset</button>
                  </div>

                  <div className="bg-surface-container-lowest border border-outline-variant p-3 rounded mb-4">
                    <span className="label-md text-on-surface-variant block mb-1">Primary Target</span>
                    <div className="flex items-center gap-2">
                      <Target className="text-primary w-5 h-5" />
                      <span className="body-md text-on-surface font-semibold">{apiResult?.entities?.drug || 'Safety signal'}</span>
                    </div>
                  </div>

                  <div className="bg-surface-container-lowest border border-outline-variant p-3 rounded">
                    <span className="label-md text-on-surface-variant block mb-1">Search Concept</span>
                    <div className="code-md text-on-surface break-words line-clamp-4">
                      {inputText}
                    </div>
                  </div>
                </div>

                <div className="p-6 flex flex-col gap-6 flex-1">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="label-md text-on-surface">Min. Relevance Score</label>
                      <span className="body-sm text-primary font-semibold">{topScore}%</span>
                    </div>
                    <div className="h-2 w-full bg-surface-container-highest rounded-full relative mt-2">
                      <div className="absolute left-0 top-0 h-full bg-primary rounded-full" style={{ width: `${topScore}%` }} />
                      <div
                        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-surface-container-lowest border-2 border-primary rounded-full shadow-sm"
                        style={{ left: `${topScore}%`, transform: 'translate(-50%, -50%)' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label-md text-on-surface block mb-2">Publication Date</label>
                    <select className="w-full bg-surface-container-lowest border border-outline-variant body-md py-2 px-3 rounded outline-none focus:border-primary focus:ring-1 focus:ring-primary">
                      <option>Past 12 Months</option>
                      <option>Past 3 Years</option>
                      <option>Past 5 Years</option>
                      <option>All Time</option>
                    </select>
                  </div>

                  <div>
                    <label className="label-md text-on-surface block mb-2">Study Methodology</label>
                    <div className="flex flex-col gap-2">
                      {['In Vitro Assays', 'In Vivo Models', 'Clinical Trials', 'In Silico / Computational'].map((method, index) => (
                        <label key={method} className="flex items-center gap-2 cursor-pointer">
                          <input
                            defaultChecked={index < 2}
                            className="w-4 h-4 text-primary bg-surface-container-lowest border-outline-variant rounded focus:ring-primary"
                            type="checkbox"
                          />
                          <span className="body-md text-on-surface">{method}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-outline-variant bg-surface-container-lowest mt-auto">
                  <button onClick={() => setSearchPapers((papers) => [...papers].sort((a, b) => b.match - a.match))} className="w-full bg-surface border border-outline text-on-surface label-md py-2 px-3 rounded hover:bg-surface-container-highest transition-colors flex items-center justify-center gap-2">
                    <Archive className="w-4 h-4" />
                    Apply Filters
                  </button>
                </div>
              </aside>
            </motion.main>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
