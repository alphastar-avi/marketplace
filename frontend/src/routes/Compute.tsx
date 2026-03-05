import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Monitor, Plus, RefreshCw, Loader2, Copy } from 'lucide-react'
import { useMarketplace } from '../state/MarketplaceContext'
import FloatingBottomNav from '../components/navigation/FloatingBottomNav'
import GlassCard from '../components/ui/GlassCard'

export default function ComputeRoute() {
    const { computeGroups, refreshComputeGroups, createComputeGroup, checkComputeTitleUnique, user } = useMarketplace()
    const [showWizard, setShowWizard] = useState(false)
    const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1)

    // Wizard State
    const [title, setTitle] = useState('')
    const [pin, setPin] = useState('')
    const [isChecking, setIsChecking] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [isCopyingServer, setIsCopyingServer] = useState(false)
    const [isCopyingModel, setIsCopyingModel] = useState(false)
    const [isCopyingWorker, setIsCopyingWorker] = useState(false)
    const [isCopyingReqs, setIsCopyingReqs] = useState(false)

    // Pre-fetched script code
    const [serverCode, setServerCode] = useState('')
    const [modelCode, setModelCode] = useState('')
    const [workerCode, setWorkerCode] = useState('')
    const [reqsCode, setReqsCode] = useState('')

    // Helper for robust clipboard copy after async fetch
    const copyToClipboardRobust = async (text: string) => {
        if (!navigator.clipboard) {
            fallbackCopy(text);
            return;
        }
        try {
            await navigator.clipboard.writeText(text);
        } catch (err) {
            console.warn("navigator.clipboard.writeText failed, trying fallback...", err);
            fallbackCopy(text);
        }
    }

    const fallbackCopy = (text: string) => {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        // Avoid scrolling to bottom
        textArea.style.top = "0";
        textArea.style.left = "0";
        textArea.style.position = "fixed";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        try {
            document.execCommand('copy');
        } catch (err) {
            console.error('Fallback copy failed', err);
        }
        document.body.removeChild(textArea);
    }

    // URL state for step 2
    const [url, setUrl] = useState('')

    // Parameter states for step 3
    const [workerSize, setWorkerSize] = useState('')
    const [epoch, setEpoch] = useState('')
    const [batchSize, setBatchSize] = useState('')

    // View state for step 4
    const [activeTab, setActiveTab] = useState('host')
    const [selectedWorker, setSelectedWorker] = useState('0')

    useEffect(() => {
        refreshComputeGroups()
    }, [refreshComputeGroups])

    // Pre-fetch files on mount to avoid async clipboard restrictions
    useEffect(() => {
        const fetchScripts = async () => {
            try {
                const [serverRes, modelRes, workerRes, reqsRes] = await Promise.all([
                    fetch('https://raw.githubusercontent.com/alphastar-avi/computeShare/Prod/codeFetch/server.py'),
                    fetch('https://raw.githubusercontent.com/alphastar-avi/computeShare/Prod/codeFetch/model.py'),
                    fetch('https://raw.githubusercontent.com/alphastar-avi/computeShare/Prod/codeFetch/worker.py'),
                    fetch('https://raw.githubusercontent.com/alphastar-avi/computeShare/Prod/codeFetch/requirements.txt')
                ])
                if (serverRes.ok) setServerCode(await serverRes.text())
                if (modelRes.ok) setModelCode(await modelRes.text())
                if (workerRes.ok) setWorkerCode(await workerRes.text())
                if (reqsRes.ok) setReqsCode(await reqsRes.text())
            } catch (err) {
                console.error("Failed to pre-fetch scripts:", err)
            }
        }
        fetchScripts()
    }, [])

    const handleNextStep1 = async () => {
        if (!title.trim() || !pin.trim()) return
        setError(null)
        setIsChecking(true)
        try {
            const isUnique = await checkComputeTitleUnique(title)
            if (isUnique) {
                setWizardStep(2)
            } else {
                setError("This exact group title already exists. Please pick another one.")
            }
        } catch (err) {
            setError("Failed to validate title. Please try again.")
        } finally {
            setIsChecking(false)
        }
    }

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (isCreating || !url.trim()) return

        setError(null)
        setIsCreating(true)
        try {
            await createComputeGroup(title)
            // Reset Wizard
            setShowWizard(false)
            setWizardStep(1)
            setTitle('')
            setUrl('')
            setWorkerSize('')
            setEpoch('')
            setBatchSize('')
        } catch (err: any) {
            setError(err.message || "Failed to create compute group.")
        } finally {
            setIsCreating(false)
        }
    }

    const snippet = 'npx -y localtunnel --port 8000'

    return (
        <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#0b1220] to-[#061028] text-white font-sans pb-32">
            <div className="max-w-5xl mx-auto px-4 md:px-8 py-10 space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm uppercase tracking-[0.4em] text-white/50">Infrastructure</p>
                        <h1 className="text-3xl font-bold mt-2">ComputeShare</h1>
                        <p className="text-sm text-white/70 mt-1">Tap into shared computing power and deploy clusters globally.</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => refreshComputeGroups()}
                            className="p-2 rounded-full border border-white/10 text-white/50 hover:bg-white/5 transition hover:text-white"
                            title="Refresh"
                        >
                            <RefreshCw size={18} />
                        </button>
                    </div>
                </div>

                <div className="grid gap-4">
                    {computeGroups.length === 0 && (
                        <div className="p-12 rounded-2xl bg-white/5 border border-white/5 text-center text-white/50 flex flex-col items-center gap-4">
                            <div className="h-16 w-16 rounded-full bg-white/5 grid place-items-center">
                                <Monitor size={32} className="opacity-20" />
                            </div>
                            <p>No clusters found. Be the first to start one!</p>
                        </div>
                    )}
                    {computeGroups.map((group) => (
                        <div key={group.id} className="transition-all">
                            <GlassCard>
                                <div className="flex flex-col gap-4">
                                    <div className="flex flex-wrap items-center justify-between gap-3">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-xl font-semibold">{group.title}</h3>
                                                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1.5">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> Active
                                                </span>
                                            </div>
                                            <p className="text-sm text-white/70 mt-1">
                                                Owner: {group.owner?.name || 'Unknown'}
                                            </p>
                                        </div>
                                        <div className="flex items-center gap-4 text-sm">
                                            <div className="flex bg-white/5 px-3 py-1.5 rounded-full border border-white/10 text-white/80 font-medium">
                                                1 Node
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </GlassCard>
                        </div>
                    ))}
                </div>
            </div>

            {/* Floating Action Button */}
            <button
                onClick={() => {
                    setShowWizard(true)
                    setWizardStep(1)
                    setError(null)
                    setTitle('')
                    setPin('')
                    setUrl('')
                    setWorkerSize('')
                    setEpoch('')
                    setBatchSize('')
                }}
                className="fixed bottom-6 right-6 h-16 w-16 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-xl z-10"
            >
                <Plus size={22} />
            </button>

            <FloatingBottomNav />

            {/* Creation Wizard Modal */}
            <AnimatePresence>
                {showWizard && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm grid place-items-center px-4"
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="w-full max-w-2xl rounded-2xl bg-[#10172b] border border-white/10 p-6 space-y-4"
                        >
                            <div className="flex items-center justify-between">
                                <h2 className="text-xl font-semibold">
                                    {wizardStep === 1 && 'Name Your Group'}
                                    {wizardStep === 2 && 'Connect Your Machine'}
                                    {wizardStep === 3 && 'Training Parameters'}
                                    {wizardStep === 4 && 'Deployment Instructions'}
                                </h2>
                                <button
                                    type="button"
                                    onClick={() => !isChecking && !isCreating && setShowWizard(false)}
                                    className="text-white/60 hover:text-white"
                                >
                                    Close
                                </button>
                            </div>

                            {/* Wizard Header Progress */}
                            <div className="flex h-1 bg-white/5 rounded-full overflow-hidden mb-4">
                                <div className="flex-1 bg-blue-500 transition-colors" />
                                <div className={`flex-1 transition-colors ${wizardStep >= 2 ? 'bg-blue-500' : 'bg-transparent'}`} />
                                <div className={`flex-1 transition-colors ${wizardStep >= 3 ? 'bg-blue-500' : 'bg-transparent'}`} />
                                <div className={`flex-1 transition-colors ${wizardStep >= 4 ? 'bg-blue-500' : 'bg-transparent'}`} />
                            </div>

                            {error && (
                                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                    {error}
                                </div>
                            )}

                            {wizardStep === 1 ? (
                                <div className="grid gap-4">
                                    <p className="text-sm text-white/70">Choose a unique title for your shared compute cluster.</p>
                                    <label className="text-sm text-white/70">
                                        Group Title
                                        <input
                                            type="text"
                                            value={title}
                                            onChange={(e) => setTitle(e.target.value)}
                                            placeholder="e.g. AI Training Cluster Alpha"
                                            disabled={isChecking}
                                            className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 outline-none focus:border-white/30 transition text-white"
                                        />
                                    </label>

                                    <label className="text-sm text-white/70">
                                        PIN Code
                                        <input
                                            type="text"
                                            value={pin}
                                            onChange={(e) => setPin(e.target.value)}
                                            placeholder="Secure connection pin"
                                            disabled={isChecking}
                                            className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 outline-none focus:border-white/30 transition text-white"
                                        />
                                    </label>

                                    <button
                                        onClick={handleNextStep1}
                                        disabled={isChecking || !title.trim() || !pin.trim()}
                                        className={`w-full rounded-full py-2.5 font-semibold flex items-center justify-center gap-2 transition ${isChecking || !title.trim() || !pin.trim()
                                            ? 'bg-white/40 text-slate-900/60 cursor-not-allowed'
                                            : 'bg-white text-slate-900 hover:bg-white/90 cursor-pointer'
                                            }`}
                                    >
                                        {isChecking && <Loader2 className="animate-spin" size={18} />}
                                        {isChecking ? 'Checking...' : 'Next'}
                                    </button>
                                </div>
                            ) : wizardStep === 2 ? (
                                <form onSubmit={(e) => { e.preventDefault(); if (url.trim()) setWizardStep(3); }} className="grid gap-4">
                                    <p className="text-sm text-white/70">Run this command on your terminal and copy paste the url.</p>

                                    <div className="bg-[#0b1220] border border-white/10 rounded-xl p-3 font-mono text-sm flex items-center justify-between mt-1 gap-3">
                                        <div className="text-blue-400 break-all select-all">{snippet}</div>
                                        <button
                                            type="button"
                                            onClick={() => navigator.clipboard.writeText(snippet)}
                                            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors shrink-0"
                                            title="Copy command"
                                        >
                                            <Copy size={16} />
                                        </button>
                                    </div>

                                    <label className="text-sm text-white/70 mt-2">
                                        Public IP / URL
                                        <input
                                            type="url"
                                            value={url}
                                            onChange={(e) => setUrl(e.target.value)}
                                            placeholder="https://abcsdf23.loca.lt"
                                            disabled={isCreating}
                                            className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 outline-none focus:border-white/30 transition text-white"
                                            required
                                        />
                                    </label>
                                    <p className="text-xs text-white/40">Paste the URL generated by the tunneling service.</p>

                                    <div className="flex gap-3 mt-4">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setWizardStep(1)
                                                setError(null)
                                            }}
                                            disabled={isCreating}
                                            className="px-6 py-2.5 rounded-full text-white/70 hover:text-white hover:bg-white/5 transition-colors font-medium border border-white/10"
                                        >
                                            Back
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isCreating || !url.trim()}
                                            className={`flex-1 rounded-full py-2.5 font-semibold flex items-center justify-center gap-2 transition ${isCreating || !url.trim()
                                                ? 'bg-white/40 text-slate-900/60 cursor-not-allowed'
                                                : 'bg-white text-slate-900 hover:bg-white/90 cursor-pointer'
                                                }`}
                                        >
                                            Next
                                        </button>
                                    </div>
                                </form>
                            ) : wizardStep === 3 ? (
                                <form onSubmit={(e) => { e.preventDefault(); if (workerSize.trim() && epoch.trim() && batchSize.trim()) setWizardStep(4); }} className="grid gap-4">
                                    <p className="text-sm text-white/70">Configure your cluster hyperparameters for the network.</p>

                                    <label className="text-sm text-white/70">
                                        Worker Size
                                        <input
                                            type="number"
                                            value={workerSize}
                                            onChange={(e) => setWorkerSize(e.target.value)}
                                            placeholder="e.g. 4"
                                            className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 outline-none focus:border-white/30 transition text-white"
                                            required
                                        />
                                    </label>

                                    <label className="text-sm text-white/70">
                                        Epoch
                                        <input
                                            type="number"
                                            value={epoch}
                                            onChange={(e) => setEpoch(e.target.value)}
                                            placeholder="e.g. 100"
                                            className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 outline-none focus:border-white/30 transition text-white"
                                            required
                                        />
                                    </label>

                                    <label className="text-sm text-white/70">
                                        Batch Size
                                        <input
                                            type="number"
                                            value={batchSize}
                                            onChange={(e) => setBatchSize(e.target.value)}
                                            placeholder="e.g. 32"
                                            className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 outline-none focus:border-white/30 transition text-white"
                                            required
                                        />
                                    </label>

                                    <div className="flex gap-3 mt-4">
                                        <button
                                            type="button"
                                            onClick={() => { setError(null); setWizardStep(2); }}
                                            className="px-6 py-2.5 rounded-full text-white/70 hover:text-white hover:bg-white/5 transition-colors font-medium border border-white/10"
                                        >
                                            Back
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={!workerSize.trim() || !epoch.trim() || !batchSize.trim()}
                                            className={`flex-1 rounded-full py-2.5 font-semibold flex items-center justify-center gap-2 transition ${!workerSize.trim() || !epoch.trim() || !batchSize.trim()
                                                ? 'bg-white/40 text-slate-900/60 cursor-not-allowed'
                                                : 'bg-white text-slate-900 hover:bg-white/90 cursor-pointer'
                                                }`}
                                        >
                                            Next
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <form onSubmit={handleCreateSubmit} className="grid gap-4">
                                    <div className="text-sm text-white/70 leading-relaxed">
                                        <button
                                            type="button"
                                            disabled={isCopyingReqs}
                                            onClick={async () => {
                                                if (!reqsCode) {
                                                    alert("Requirements code is still loading or failed to load.");
                                                    return;
                                                }
                                                try {
                                                    setIsCopyingReqs(true)
                                                    await copyToClipboardRobust(reqsCode)
                                                } catch (err) {
                                                    console.error("Failed to copy requirements.txt:", err)
                                                } finally {
                                                    setIsCopyingReqs(false)
                                                }
                                            }}
                                            className="text-blue-400 hover:text-blue-300 transition-colors font-medium outline-none pr-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                            title="Copy requirements.txt snippet"
                                        >
                                            {isCopyingReqs ? 'Copying...' : 'Click here'}
                                        </button>
                                        <span>to copy the requirements and save it as <code className="text-white/90 bg-white/5 px-1.5 py-0.5 rounded ml-0.5">requirements.txt</code>, then run these commands:</span>
                                    </div>
                                    <div className="bg-[#0b1220] border border-white/10 rounded-xl p-4 font-mono text-sm relative group mt-1">
                                        <div className="text-emerald-400 break-all whitespace-pre-wrap">
                                            {`python3 -m venv .venv\nsource .venv/bin/activate\npip install -r requirements.txt`}
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => navigator.clipboard.writeText(`python3 -m venv .venv\nsource .venv/bin/activate\npip install -r requirements.txt`)}
                                            className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors opacity-0 group-hover:opacity-100"
                                            title="Copy setup commands"
                                        >
                                            <Copy size={16} />
                                        </button>
                                    </div>
                                    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('host')}
                                            className={`flex-1 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'host' ? 'bg-indigo-500 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                                                }`}
                                        >
                                            Host
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setActiveTab('worker')}
                                            className={`flex-1 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${activeTab === 'worker' ? 'bg-indigo-500 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'
                                                }`}
                                        >
                                            Worker
                                        </button>
                                    </div>

                                    {activeTab === 'host' ? (
                                        <div className="space-y-4">
                                            <div className="text-sm text-white/70 leading-relaxed">
                                                <button
                                                    type="button"
                                                    disabled={isCopyingServer}
                                                    onClick={async () => {
                                                        if (!serverCode) {
                                                            alert("Server code is still loading or failed to load.");
                                                            return;
                                                        }
                                                        try {
                                                            setIsCopyingServer(true)
                                                            await copyToClipboardRobust(serverCode)
                                                        } catch (err) {
                                                            console.error("Failed to copy server.py:", err)
                                                        } finally {
                                                            setIsCopyingServer(false)
                                                        }
                                                    }}
                                                    className="text-blue-400 hover:text-blue-300 transition-colors font-medium outline-none pr-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    title="Copy python snippet"
                                                >
                                                    {isCopyingServer ? 'Copying...' : 'Click here'}
                                                </button>
                                                <span>to copy the code and save it as <code className="text-white/90 bg-white/5 px-1.5 py-0.5 rounded ml-0.5">server.py</code></span>
                                            </div>

                                            <div className="text-sm text-white/70 leading-relaxed">
                                                <button
                                                    type="button"
                                                    disabled={isCopyingModel}
                                                    onClick={async () => {
                                                        if (!modelCode) {
                                                            alert("Model code is still loading or failed to load.");
                                                            return;
                                                        }
                                                        try {
                                                            setIsCopyingModel(true)
                                                            await copyToClipboardRobust(modelCode)
                                                        } catch (err) {
                                                            console.error("Failed to copy model.py:", err)
                                                        } finally {
                                                            setIsCopyingModel(false)
                                                        }
                                                    }}
                                                    className="text-blue-400 hover:text-blue-300 transition-colors font-medium outline-none pr-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    title="Copy model.py snippet"
                                                >
                                                    {isCopyingModel ? 'Copying...' : 'Click here'}
                                                </button>
                                                <span>to copy this code and save it as <code className="text-white/90 bg-white/5 px-1.5 py-0.5 rounded ml-0.5">model.py</code></span>
                                            </div>

                                            <div className="text-sm text-white/70 flex items-center gap-2 flex-wrap">
                                                <span>run using -</span>
                                                <div className="flex items-center gap-2 bg-[#0b1220] px-2 py-1 rounded border border-white/10 group pr-1">
                                                    <code className="text-indigo-400">
                                                        python server.py --pinSizEpo {pin || '<PIN>'} {workerSize || '<worker size>'} {epoch || '<epochs>'}
                                                    </code>
                                                    <button
                                                        type="button"
                                                        onClick={() => navigator.clipboard.writeText(`python server.py --pinSizEpo ${pin} ${workerSize} ${epoch}`)}
                                                        className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                                                        title="Copy run command"
                                                    >
                                                        <Copy size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <label className="text-sm text-white/70">
                                                Select Worker
                                                <div className="relative mt-1 border border-white/10 rounded-lg bg-white/5 overflow-hidden">
                                                    <select
                                                        value={selectedWorker}
                                                        onChange={(e) => setSelectedWorker(e.target.value)}
                                                        className="w-full bg-transparent px-3 py-2 outline-none appearance-none text-white focus:border-white/30 transition"
                                                    >
                                                        {Array.from({ length: parseInt(workerSize) || 4 }).map((_, i) => (
                                                            <option key={i} value={i} className="bg-[#0b1220] p-2 text-white">
                                                                Worker {i}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-white/50">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                                                    </div>
                                                </div>
                                            </label>

                                            <div className="text-sm text-white/70 leading-relaxed mt-2">
                                                <button
                                                    type="button"
                                                    disabled={isCopyingWorker}
                                                    onClick={async () => {
                                                        if (!workerCode) {
                                                            alert("Worker code is still loading or failed to load.");
                                                            return;
                                                        }
                                                        try {
                                                            setIsCopyingWorker(true)
                                                            const finalWorkerCode = workerCode.replace(/SERVER_URL\s*=\s*['"][^'"]*['"]/, `SERVER_URL = "${url}"`)
                                                            await copyToClipboardRobust(finalWorkerCode)
                                                        } catch (err) {
                                                            console.error("Failed to copy worker.py:", err)
                                                        } finally {
                                                            setIsCopyingWorker(false)
                                                        }
                                                    }}
                                                    className="text-blue-400 hover:text-blue-300 transition-colors font-medium outline-none pr-1 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    title="Copy python snippet"
                                                >
                                                    {isCopyingWorker ? 'Copying...' : 'Click here'}
                                                </button>
                                                <span>to copy the code and save it as <code className="text-white/90 bg-white/5 px-1.5 py-0.5 rounded ml-0.5">worker.py</code></span>
                                            </div>

                                            <div className="text-sm text-white/70 flex items-center gap-2 flex-wrap">
                                                <span>run using -</span>
                                                <div className="flex items-center gap-2 bg-[#0b1220] px-2 py-1 rounded border border-white/10 group pr-1">
                                                    <code className="text-cyan-400">
                                                        python worker.py --pinSizRanBatEpo {pin || '<PIN>'} {workerSize || '<no of workers>'} {selectedWorker} {batchSize || '<BATCH_SIZE>'} {epoch || '<epochs>'}
                                                    </code>
                                                    <button
                                                        type="button"
                                                        onClick={() => navigator.clipboard.writeText(`python worker.py --pinSizRanBatEpo ${pin} ${workerSize} ${selectedWorker} ${batchSize} ${epoch}`)}
                                                        className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors opacity-0 group-hover:opacity-100 shrink-0"
                                                        title="Copy run command"
                                                    >
                                                        <Copy size={14} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex gap-3 mt-4">
                                        <button
                                            type="button"
                                            disabled={isCreating}
                                            onClick={() => { setError(null); setWizardStep(3); }}
                                            className="px-6 py-2.5 rounded-full text-white/70 hover:text-white hover:bg-white/5 transition-colors font-medium border border-white/10"
                                        >
                                            Back
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={isCreating}
                                            className={`flex-1 rounded-full py-2.5 font-semibold flex items-center justify-center gap-2 transition ${isCreating
                                                ? 'bg-white/40 text-slate-900/60 cursor-not-allowed'
                                                : 'bg-white text-slate-900 hover:bg-white/90 cursor-pointer'
                                                }`}
                                        >
                                            {isCreating && <Loader2 className="animate-spin" size={18} />}
                                            {isCreating ? 'Finalizing...' : 'Create Group'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
