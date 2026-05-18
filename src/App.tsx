import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  Share2, 
  Activity, 
  ShieldCheck, 
  Tags, 
  Users,
  Search,
  ArrowRight,
  ClipboardList,
  ChevronRight,
  Database,
  FileText
} from 'lucide-react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

export default function App() {
  const [activePage, setActivePage] = useState('dashboard');
  const [currentTab, setCurrentTab] = useState('search');
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [apiResult, setApiResult] = useState<any>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
          abstract: inputText
        })
      });
      if (!response.ok) {
        throw new Error('Failed to connect to the backend API');
      }
      const data = await response.json();
      let cleanJson = data.result.replace(/```json/g, '').replace(/```/g, '').trim();
      let parsedVerdict = JSON.parse(cleanJson);
      
      setApiResult(parsedVerdict);
      setShowResults(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred during analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const resultsData = apiResult ? [{
    id: '1',
    event: apiResult.entities?.adverse_event || 'Not specified',
    drug: apiResult.entities?.drug || 'Not specified',
    patient: apiResult.entities?.patient || 'Not specified',
    severity: apiResult.verdict === 'RELEVANT' ? 'High' : apiResult.verdict === 'UNCERTAIN' ? 'Medium' : 'Low',
    verdict: apiResult.verdict,
  }] : [];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar activePage={activePage} onPageChange={setActivePage} />
      
      <div className="flex-1 flex flex-col md:ml-64 h-full overflow-y-auto">
        <Header currentTab={currentTab} onTabChange={setCurrentTab} />
        
        <AnimatePresence mode="wait">
          {!showResults ? (
            <motion.main 
              key="landing"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex-1 flex flex-col items-center justify-center p-10 relative"
            >
              <div className="absolute inset-0 pointer-events-none clinical-grid opacity-30" />
              
              <div className="w-full max-w-3xl relative z-10">
                <div className="text-center mb-10">
                  <h2 className="headline-xl text-on-background mb-4">Pharmaco-vigilance Screener</h2>
                  <p className="body-lg text-on-surface-variant max-w-2xl mx-auto">
                    Input scientific literature titles and abstracts to identify Individual Case Safety Reports (ICSRs) describing adverse drug reactions in human patients.
                  </p>
                </div>

                <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant shadow-sm relative">
                  <label className="block label-md text-on-surface mb-2" htmlFor="drug-description">
                    Drug Description Input
                  </label>
                  <div className="relative">
                    <textarea
                      id="drug-description"
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      className="w-full bg-surface text-on-background code-md border border-outline-variant rounded-lg p-4 focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none h-48"
                      placeholder='Paste scientific article title and abstract here (e.g., "A 65-year-old male treated with Ibuprofen developed gastrointestinal bleeding...")'
                    />
                    <div className="absolute bottom-4 right-4 flex gap-2">
                      <button className="text-on-surface-variant hover:text-primary transition-colors p-1.5 rounded-md hover:bg-surface-container">
                        <Upload className="w-4 h-4" />
                      </button>
                      <button className="text-on-surface-variant hover:text-primary transition-colors p-1.5 rounded-md hover:bg-surface-container">
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  
                  {errorMsg && (
                    <div className="mt-4 p-3 bg-error-container text-on-error-container rounded-lg text-sm font-medium">
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
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Search className="w-4 h-4" />
                          Detect ICSRs
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="mt-12 text-center">
                  <p className="label-md text-on-surface-variant mb-4 tracking-widest">Recent Protocols & Tags</p>
                  <div className="flex flex-wrap justify-center gap-3">
                    {[
                      { icon: Activity, label: 'Adverse Reactions' },
                      { icon: ShieldCheck, label: 'Patient Safety' },
                      { icon: Tags, label: 'Drug Exposure' },
                      { icon: Users, label: 'Human Reports' },
                    ].map((tag) => (
                      <span 
                        key={tag.label}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-surface-container border border-outline-variant rounded-full label-md text-on-surface-variant cursor-pointer hover:bg-surface-container-high transition-colors"
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
              className="flex-1 p-8 overflow-y-auto"
            >
              <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                  <div>
                    <nav className="flex items-center gap-2 text-on-surface-variant body-sm mb-2">
                      <button onClick={() => setShowResults(false)} className="hover:text-primary">Screener</button>
                      <ChevronRight className="w-3 h-3" />
                      <span className="text-on-surface font-medium">Analysis Report</span>
                    </nav>
                    <h2 className="headline-lg text-on-background">Screening Results</h2>
                  </div>
                  
                  <div className="flex gap-3">
                    <button className="bg-white border border-outline-variant text-on-surface px-4 py-2 rounded-lg label-md flex items-center gap-2 hover:bg-surface-container transition-all">
                      <Database className="w-4 h-4" />
                      Save to DB
                    </button>
                    <button className="bg-primary text-on-primary px-4 py-2 rounded-lg label-md flex items-center gap-2 hover:bg-primary-container transition-all">
                      <FileText className="w-4 h-4" />
                      Export ICSRs
                    </button>
                  </div>
                </div>

                {apiResult && (
                  <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant mb-6 flex gap-4 items-center">
                    <div className={`p-3 rounded-full ${apiResult.verdict === 'RELEVANT' ? 'bg-[#ffdad6] text-[#93000a]' : apiResult.verdict === 'NOT_RELEVANT' ? 'bg-secondary-container text-on-secondary-container' : 'bg-[#fef3c7] text-[#92400e]'}`}>
                      {apiResult.verdict === 'RELEVANT' ? <ShieldCheck className="w-6 h-6" /> : <Activity className="w-6 h-6" />}
                    </div>
                    <div>
                      <p className="label-md text-on-surface-variant mb-1">AI Reasoning</p>
                      <p className="body-md text-on-surface font-medium">{apiResult.reason}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant">
                    <p className="label-md text-on-surface-variant mb-2">Verdict</p>
                    <h3 className={`headline-md ${apiResult?.verdict === 'RELEVANT' ? 'text-[#ba1a1a]' : apiResult?.verdict === 'NOT_RELEVANT' ? 'text-secondary' : 'text-[#d97706]'}`}>
                      {apiResult?.verdict || 'Unknown'}
                    </h3>
                    <p className="body-sm text-on-surface-variant mt-1 flex items-center gap-1 font-medium">
                      <ShieldCheck className="w-3 h-3" />
                      AI Determined
                    </p>
                  </div>
                  <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant">
                    <p className="label-md text-on-surface-variant mb-2">Detected Alerts</p>
                    <h3 className={`headline-md ${apiResult?.verdict === 'RELEVANT' ? 'text-[#ba1a1a]' : 'text-on-surface'}`}>
                      {apiResult?.verdict === 'RELEVANT' ? '01 Case Report' : '0 Case Reports'}
                    </h3>
                    <p className={`body-sm mt-1 font-medium ${apiResult?.verdict === 'RELEVANT' ? 'text-[#ba1a1a]' : 'text-on-surface-variant'}`}>
                      {apiResult?.verdict === 'RELEVANT' ? 'High Severity Found' : 'No issues found'}
                    </p>
                  </div>
                  <div className="bg-surface-container-lowest p-5 rounded-xl border border-outline-variant">
                    <p className="label-md text-on-surface-variant mb-2">Confidence Score</p>
                    <h3 className="headline-md">{Math.round((apiResult?.confidence || 0) * 100)}%</h3>
                    <div className="w-full bg-surface-container h-1.5 rounded-full mt-3">
                      <div className="bg-secondary h-full rounded-full" style={{ width: `${Math.round((apiResult?.confidence || 0) * 100)}%` }} />
                    </div>
                  </div>
                </div>

                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-outline-variant bg-surface-container-low">
                    <h3 className="label-md text-on-surface flex items-center gap-2">
                      <ClipboardList className="w-4 h-4" />
                      Individual Case Safety Reports
                    </h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-surface border-b border-outline-variant">
                          <th className="px-6 py-3 label-md text-on-surface-variant">Event Type</th>
                          <th className="px-6 py-3 label-md text-on-surface-variant">Suspect Drug</th>
                          <th className="px-6 py-3 label-md text-on-surface-variant">Patient Profile</th>
                          <th className="px-6 py-3 label-md text-on-surface-variant">Severity</th>
                          <th className="px-6 py-3 label-md text-on-surface-variant">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant">
                        {resultsData.map((row) => (
                          <tr key={row.id} className="hover:bg-surface-container-low transition-colors group">
                            <td className="px-6 py-4 body-md font-medium text-on-surface">{row.event}</td>
                            <td className="px-6 py-4 body-sm text-on-surface-variant font-mono">{row.drug}</td>
                            <td className="px-6 py-4 body-sm text-on-surface-variant">{row.patient}</td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                                row.severity === 'High' ? 'bg-[#ffdad6] text-[#93000a]' :
                                row.severity === 'Medium' ? 'bg-[#dae2ff] text-[#00419e]' :
                                'bg-secondary-container text-on-secondary-container'
                              }`}>
                                {row.severity}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button className="text-primary hover:underline label-md inline-flex items-center gap-1 group">
                                Review Case
                                <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                              </button>
                            </td>
                          </tr>
                        ))}
                        {resultsData.length === 0 && (
                          <tr>
                            <td colSpan={5} className="px-6 py-8 text-center text-on-surface-variant body-md">
                              No matching cases found.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-surface-container-low p-6 rounded-xl border border-outline-variant border-dashed">
                  <h4 className="label-md mb-2 text-on-surface">Original Input Preview</h4>
                  <p className="body-md text-on-surface-variant code-md leading-relaxed line-clamp-3">
                    {inputText}
                  </p>
                </div>
              </div>
            </motion.main>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
