import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity,
  Archive,
  Check,
  ChevronRight,
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
  Upload,
  Users,
  X,
} from 'lucide-react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

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
};

type SearchPaper = {
  title?: string;
  abstract?: string;
  source?: string;
  pmid?: string;
};

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
  const haystack = `${paper.title || ''} ${paper.abstract || ''}`.toLowerCase();
  const entities = [
    result?.entities?.drug,
    result?.entities?.adverse_event,
    'adverse',
    'patient',
    'case',
    'reaction',
    'safety',
  ].filter(Boolean) as string[];
  const hits = entities.reduce((sum, term) => sum + (haystack.includes(term.toLowerCase()) ? 1 : 0), 0);
  const base = Math.round(((result?.confidence ?? 0.72) > 1 ? result?.confidence ?? 72 : (result?.confidence ?? 0.72) * 100));
  return Math.max(50, Math.min(99, base + hits * 4 - Math.floor(index / 8)));
}

function mapSearchPapers(papers: SearchPaper[], result: ScreeningResult | null, inputText: string): ReviewPaper[] {
  return papers
    .map((paper, index) => {
      const match = scorePaper(paper, index, result);
      return {
        id: paper.pmid || `paper-${index}`,
        title: paper.title || 'Untitled paper',
        journal: paper.source || 'Europe PMC',
        published: 'Indexed result',
        authors: paper.pmid ? `PMID: ${paper.pmid}` : 'Metadata unavailable',
        match,
        matchNote: match >= 90 ? 'High confidence match' : match >= 75 ? 'Relevant safety signal' : 'Lower confidence match',
        abstract: paper.abstract || 'No abstract available.',
        tags: [
          { icon: ShieldCheck, label: result?.verdict ? cleanVerdict(result.verdict) : 'Screening Match' },
          { icon: Activity, label: result?.entities?.adverse_event || 'Safety Signal' },
        ],
        priority: match >= 90 ? 'high' : match >= 75 ? 'medium' : 'low',
      } satisfies ReviewPaper;
    })
    .sort((a, b) => b.match - a.match);
}

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [currentTab, setCurrentTab] = useState('search');
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [apiResult, setApiResult] = useState<ScreeningResult | null>(null);
  const [searchPapers, setSearchPapers] = useState<ReviewPaper[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const reviewPapers = useMemo(
    () => searchPapers.length > 0 ? searchPapers : buildReviewPapers(apiResult, inputText),
    [apiResult, inputText, searchPapers],
  );
  const topScore = reviewPapers[0]?.match ?? 0;

  const handleAnalyze = async () => {
    if (!inputText.trim()) return;
    setIsAnalyzing(true);
    setErrorMsg(null);

    try {
      const response = await fetch('http://127.0.0.1:8000/screen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          drug_name: 'Unknown',
          title: 'Unknown',
          abstract: inputText,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to connect to the backend API');
      }

      const data = await response.json();
      const cleanJson = data.result.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedVerdict = JSON.parse(cleanJson);
      const query = [
        parsedVerdict.entities?.drug,
        parsedVerdict.entities?.adverse_event,
        inputText.split(/\s+/).slice(0, 12).join(' '),
      ].filter(Boolean).join(' ');
      const papersResponse = await fetch(`http://127.0.0.1:8000/search?query=${encodeURIComponent(query)}&limit=120`);
      const papersData = papersResponse.ok ? await papersResponse.json() : { results: [] };

      setApiResult(parsedVerdict);
      setSearchPapers(mapSearchPapers(papersData.results || [], parsedVerdict, inputText));
      setCurrentTab('review');
      setShowResults(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const goToSearch = () => {
    setCurrentTab('search');
    setShowResults(false);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background text-on-surface">
      <Sidebar activePage={activePage} onPageChange={setActivePage} />

      <div className="flex-1 flex flex-col md:ml-64 h-full overflow-hidden">
        <Header currentTab={currentTab} onTabChange={setCurrentTab} />

        <AnimatePresence mode="wait">
          {!showResults ? (
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
                    <div className="mt-4 p-3 bg-[#ffdad6] text-[#93000a] rounded-lg body-sm font-medium">
                      Error: {errorMsg}
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
                          Searching...
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
                      Showing {reviewPapers.length} papers, highest confidence first.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <span className="bg-surface-container-highest text-primary label-md px-3 py-2 rounded border border-outline-variant">
                      Sort: Relevance
                    </span>
                    <button className="bg-surface-container-lowest border border-outline-variant text-on-surface px-3 py-2 rounded label-md flex items-center gap-2 hover:bg-surface-container-high transition-colors">
                      <Database className="w-4 h-4" />
                      Save to DB
                    </button>
                    <button className="bg-primary text-on-primary px-3 py-2 rounded label-md flex items-center gap-2 hover:bg-primary-container transition-colors">
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
                  {reviewPapers.map((paper) => (
                    <article
                      key={paper.id}
                      className="bg-surface-container-lowest border border-outline-variant p-4 flex flex-col gap-3 hover:bg-surface-bright transition-colors"
                    >
                      <div className="flex flex-col gap-3 xl:flex-row xl:justify-between xl:items-start">
                        <div className="min-w-0 flex-1">
                          <h3 className="headline-md text-on-surface mb-1 leading-tight">{paper.title}</h3>
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
                          <button className="w-10 h-10 flex items-center justify-center border border-outline-variant rounded text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface transition-colors" title="Archive for later">
                            <Folder className="w-4 h-4" />
                          </button>
                          <button className="w-10 h-10 flex items-center justify-center border border-[#ba1a1a] text-[#ba1a1a] rounded hover:bg-[#ffdad6] hover:text-[#93000a] transition-colors" title="Reject as irrelevant">
                            <X className="w-4 h-4" />
                          </button>
                          <button className="w-10 h-10 flex items-center justify-center bg-secondary text-on-secondary rounded hover:bg-on-secondary-container transition-colors shadow-sm" title="Accept and extract data">
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </section>

              <aside className="hidden xl:flex w-80 bg-surface border-l border-outline-variant flex-col h-full overflow-y-auto">
                <div className="p-6 border-b border-outline-variant">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="headline-md text-on-surface">Active Parameters</h3>
                    <button className="text-primary hover:text-primary-container label-md">Reset</button>
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
                  <button className="w-full bg-surface border border-outline text-on-surface label-md py-2 px-3 rounded hover:bg-surface-container-highest transition-colors flex items-center justify-center gap-2">
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
