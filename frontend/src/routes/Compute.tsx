import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Monitor, Plus, RefreshCw, Loader2, Copy, Lock, Users, ArrowRight, Trash2 } from 'lucide-react'
import { useMarketplace } from '../state/MarketplaceContext'
import FloatingBottomNav from '../components/navigation/FloatingBottomNav'
import { ScrollHideProvider } from '../context/ScrollHideContext'
import GlassCard from '../components/ui/GlassCard'
import { ComputeGroup } from '../types'

export default function ComputeRoute() {
    const { computeGroups, refreshComputeGroups, createComputeGroup, checkComputeTitleUnique, verifyComputeGroupPIN, deleteComputeGroup, user } = useMarketplace()
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

    // Join flow state
    const [groupFilter, setGroupFilter] = useState<'all' | 'mine'>('all')
    const [selectedGroup, setSelectedGroup] = useState<ComputeGroup | null>(null)
    const [joinPin, setJoinPin] = useState('')
    const [isVerifying, setIsVerifying] = useState(false)
    const [joinError, setJoinError] = useState<string | null>(null)
    const [showPINModal, setShowPINModal] = useState(false)

    // Instruction modal state
    const [showInstructionModal, setShowInstructionModal] = useState(false)
    const [instructionGroup, setInstructionGroup] = useState<ComputeGroup | null>(null)
    const [instrActiveTab, setInstrActiveTab] = useState('host')
    const [instrSelectedWorker, setInstrSelectedWorker] = useState('0')

    // Delete state
    const [deletingId, setDeletingId] = useState<string | null>(null)

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
            await createComputeGroup({
                title,
                pin,
                url,
                workerSize: parseInt(workerSize) || 1,
                epochs: parseInt(epoch) || 10,
                batchSize: parseInt(batchSize) || 32,
            })
            // Reset Wizard
            setShowWizard(false)
            setWizardStep(1)
            setTitle('')
            setPin('')
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

    const handleJoinGroup = (group: ComputeGroup) => {
        setSelectedGroup(group)
        setJoinPin('')
        setJoinError(null)
        setShowPINModal(true)
    }

    const handleOpenOwnGroup = (group: ComputeGroup) => {
        setInstructionGroup(group)
        setInstrActiveTab('host')
        setInstrSelectedWorker('0')
        setShowInstructionModal(true)
    }

    const handleDeleteGroup = async (groupId: string) => {
        if (!confirm('Are you sure you want to delete this compute group?')) return
        try {
            setDeletingId(groupId)
            await deleteComputeGroup(groupId)
        } catch {
            alert('Failed to delete group. Please try again.')
        } finally {
            setDeletingId(null)
        }
    }

    const handleVerifyPIN = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedGroup || !joinPin.trim()) return
        setIsVerifying(true)
        setJoinError(null)
        try {
            const group = await verifyComputeGroupPIN(selectedGroup.id, joinPin)
            setShowPINModal(false)
            setInstructionGroup(group)
            setInstrActiveTab('host')
            setInstrSelectedWorker('0')
            setShowInstructionModal(true)
        } catch (err: any) {
            setJoinError(err?.response?.data?.error || 'Incorrect PIN. Please try again.')
        } finally {
            setIsVerifying(false)
        }
    }

    const snippet = 'npx -y localtunnel --port 8000'

    // Instruction panel shared between wizard creation and join flow
    const InstructionPanel = ({
        groupUrl,
        groupPin,
        groupWorkerSize,
        groupEpoch,
        groupBatchSize,
    }: {
        groupUrl: string
        groupPin: string
        groupWorkerSize: string
        groupEpoch: string
        groupBatchSize: string
    }) => (
        <div className="grid gap-4">
            <div className="text-sm text-white/70 leading-relaxed">
                <button
                    type="button"
                    disabled={isCopyingReqs}
                    onClick={async () => {
                        if (!reqsCode) { alert("Requirements code is still loading."); return; }
                        try { setIsCopyingReqs(true); await copyToClipboardRobust(reqsCode) }
                        catch (err) { console.error(err) }
                        finally { setIsCopyingReqs(false) }
                    }}
                    className="text-blue-400 hover:text-blue-300 transition-colors font-medium outline-none pr-1 disabled:opacity-50"
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
                >
                    <Copy size={16} />
                </button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <button
                    type="button"
                    onClick={() => setInstrActiveTab('host')}
                    className={`flex-1 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${instrActiveTab === 'host' ? 'bg-indigo-500 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}
                >
                    Host
                </button>
                <button
                    type="button"
                    onClick={() => setInstrActiveTab('worker')}
                    className={`flex-1 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${instrActiveTab === 'worker' ? 'bg-indigo-500 text-white' : 'bg-white/5 text-white/50 hover:bg-white/10 hover:text-white'}`}
                >
                    Worker
                </button>
            </div>

            {instrActiveTab === 'host' ? (
                <div className="space-y-4">
                    <div className="text-sm text-white/70 leading-relaxed">
                        <button type="button" disabled={isCopyingServer}
                            onClick={async () => {
                                if (!serverCode) { alert("Server code is still loading."); return; }
                                try { setIsCopyingServer(true); await copyToClipboardRobust(serverCode) }
                                catch (err) { console.error(err) }
                                finally { setIsCopyingServer(false) }
                            }}
                            className="text-blue-400 hover:text-blue-300 transition-colors font-medium outline-none pr-1 disabled:opacity-50">
                            {isCopyingServer ? 'Copying...' : 'Click here'}
                        </button>
                        <span>to copy the code and save it as <code className="text-white/90 bg-white/5 px-1.5 py-0.5 rounded ml-0.5">server.py</code></span>
                    </div>
                    <div className="text-sm text-white/70 leading-relaxed">
                        <button type="button" disabled={isCopyingModel}
                            onClick={async () => {
                                if (!modelCode) { alert("Model code is still loading."); return; }
                                try { setIsCopyingModel(true); await copyToClipboardRobust(modelCode) }
                                catch (err) { console.error(err) }
                                finally { setIsCopyingModel(false) }
                            }}
                            className="text-blue-400 hover:text-blue-300 transition-colors font-medium outline-none pr-1 disabled:opacity-50">
                            {isCopyingModel ? 'Copying...' : 'Click here'}
                        </button>
                        <span>to copy this code and save it as <code className="text-white/90 bg-white/5 px-1.5 py-0.5 rounded ml-0.5">model.py</code></span>
                    </div>
                    <div className="text-sm text-white/70 flex items-center gap-2 flex-wrap">
                        <span>run using -</span>
                        <div className="flex items-center gap-2 bg-[#0b1220] px-2 py-1 rounded border border-white/10 group pr-1">
                            <code className="text-indigo-400">
                                python server.py --pinSizEpo {groupPin || '<PIN>'} {groupWorkerSize || '<worker size>'} {groupEpoch || '<epochs>'}
                            </code>
                            <button type="button"
                                onClick={() => navigator.clipboard.writeText(`python server.py --pinSizEpo ${groupPin} ${groupWorkerSize} ${groupEpoch}`)}
                                className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors opacity-0 group-hover:opacity-100 shrink-0">
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
                                value={instrSelectedWorker}
                                onChange={(e) => setInstrSelectedWorker(e.target.value)}
                                className="w-full bg-transparent px-3 py-2 outline-none appearance-none text-white focus:border-white/30 transition"
                            >
                                {Array.from({ length: parseInt(groupWorkerSize) || 4 }).map((_, i) => (
                                    <option key={i} value={i} className="bg-[#0b1220] p-2 text-white">Worker {i}</option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-white/50">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                            </div>
                        </div>
                    </label>
                    <div className="text-sm text-white/70 leading-relaxed mt-2">
                        <button type="button" disabled={isCopyingWorker}
                            onClick={async () => {
                                if (!workerCode) { alert("Worker code is still loading."); return; }
                                try {
                                    setIsCopyingWorker(true)
                                    const finalWorkerCode = workerCode.replace(/SERVER_URL\s*=\s*['"][^'"]*['"]/, `SERVER_URL = "${groupUrl}"`)
                                    await copyToClipboardRobust(finalWorkerCode)
                                } catch (err) { console.error(err) }
                                finally { setIsCopyingWorker(false) }
                            }}
                            className="text-blue-400 hover:text-blue-300 transition-colors font-medium outline-none pr-1 disabled:opacity-50">
                            {isCopyingWorker ? 'Copying...' : 'Click here'}
                        </button>
                        <span>to copy the code and save it as <code className="text-white/90 bg-white/5 px-1.5 py-0.5 rounded ml-0.5">worker.py</code></span>
                    </div>
                    <div className="text-sm text-white/70 flex items-center gap-2 flex-wrap">
                        <span>run using -</span>
                        <div className="flex items-center gap-2 bg-[#0b1220] px-2 py-1 rounded border border-white/10 group pr-1">
                            <code className="text-cyan-400">
                                python worker.py --pinSizRanBatEpo {groupPin || '<PIN>'} {groupWorkerSize || '<workers>'} {instrSelectedWorker} {groupBatchSize || '<BATCH>'} {groupEpoch || '<epochs>'}
                            </code>
                            <button type="button"
                                onClick={() => navigator.clipboard.writeText(`python worker.py --pinSizRanBatEpo ${groupPin} ${groupWorkerSize} ${instrSelectedWorker} ${groupBatchSize} ${groupEpoch}`)}
                                className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors opacity-0 group-hover:opacity-100 shrink-0">
                                <Copy size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )

    return (
        <ScrollHideProvider>
        <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#0b1220] to-[#061028] text-white font-sans pb-32">
            <div className="max-w-5xl mx-auto px-4 md:px-8 py-10 space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm uppercase tracking-[0.4em] text-white/50">Infrastructure</p>
                        <h1 className="text-3xl font-bold mt-2">ComputeShare</h1>
                        <p className="text-sm text-white/70 mt-1">Tap into shared computing power and deploy clusters globally.</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {/* My Groups / All Groups toggle */}
                        <div className="flex bg-white/5 border border-white/10 rounded-full p-1">
                            <button
                                onClick={() => setGroupFilter('all')}
                                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${groupFilter === 'all' ? 'bg-white text-slate-900' : 'text-white/50 hover:text-white'
                                    }`}
                            >
                                All Groups
                            </button>
                            <button
                                onClick={() => setGroupFilter('mine')}
                                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${groupFilter === 'mine' ? 'bg-white text-slate-900' : 'text-white/50 hover:text-white'
                                    }`}
                            >
                                My Groups
                            </button>
                        </div>
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
                    {(() => {
                        const filteredGroups = computeGroups.filter(g =>
                            groupFilter === 'mine'
                                ? g.owner_id === user?.id
                                : g.owner_id !== user?.id
                        )
                        if (filteredGroups.length === 0) {
                            return (
                                <div className="p-12 rounded-2xl bg-white/5 border border-white/5 text-center text-white/50 flex flex-col items-center gap-4">
                                    <div className="h-16 w-16 rounded-full bg-white/5 grid place-items-center">
                                        <Monitor size={32} className="opacity-20" />
                                    </div>
                                    <p>{groupFilter === 'mine' ? "You haven't created any clusters yet." : 'No clusters from others yet.'}</p>
                                </div>
                            )
                        }
                        return filteredGroups.map((group) => {
                            const isOwner = group.owner_id === user?.id
                            return (
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
                                                    <p className="text-sm text-white/70 mt-1 flex items-center gap-1.5">
                                                        <Users size={13} className="opacity-60" />
                                                        by {group.owner?.name || 'Unknown'}
                                                    </p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <div className="flex bg-white/5 px-3 py-1.5 rounded-full border border-white/10 text-white/80 font-medium text-sm">
                                                        {group.worker_size} {group.worker_size === 1 ? 'Worker' : 'Workers'}
                                                    </div>
                                                    {isOwner ? (
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                onClick={() => handleDeleteGroup(group.id)}
                                                                disabled={deletingId === group.id}
                                                                className="p-2 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                                                                title="Delete group"
                                                            >
                                                                {deletingId === group.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                                                            </button>
                                                            <button
                                                                onClick={() => handleOpenOwnGroup(group)}
                                                                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white/10 border border-white/20 text-white text-sm font-semibold hover:bg-white/20 transition-colors"
                                                            >
                                                                Open <ArrowRight size={14} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleJoinGroup(group)}
                                                            className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-white text-slate-900 text-sm font-semibold hover:bg-white/90 transition-colors"
                                                        >
                                                            Join <ArrowRight size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </GlassCard>
                                </div>
                            )
                        })
                    })()
                    }
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

            {/* PIN Verification Modal */}
            <AnimatePresence>
                {showPINModal && selectedGroup && (
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
                            className="w-full max-w-md rounded-2xl bg-[#10172b] border border-white/10 p-6 space-y-4"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-semibold">Enter PIN</h2>
                                    <p className="text-sm text-white/50 mt-0.5">to join <span className="text-white/80">{selectedGroup.title}</span></p>
                                </div>
                                <button onClick={() => setShowPINModal(false)} className="text-white/60 hover:text-white">Close</button>
                            </div>

                            {joinError && (
                                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                                    {joinError}
                                </div>
                            )}

                            <form onSubmit={handleVerifyPIN} className="grid gap-4">
                                <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-4">
                                    <Lock size={20} className="text-white/40 shrink-0" />
                                    <input
                                        type="text"
                                        value={joinPin}
                                        onChange={(e) => setJoinPin(e.target.value)}
                                        placeholder="Security PIN"
                                        disabled={isVerifying}
                                        className="bg-transparent outline-none text-white flex-1 placeholder:text-white/30"
                                        autoFocus
                                    />
                                </div>
                                <button
                                    type="submit"
                                    disabled={isVerifying || !joinPin.trim()}
                                    className={`w-full rounded-full py-2.5 font-semibold flex items-center justify-center gap-2 transition ${isVerifying || !joinPin.trim()
                                        ? 'bg-white/40 text-slate-900/60 cursor-not-allowed'
                                        : 'bg-white text-slate-900 hover:bg-white/90 cursor-pointer'
                                        }`}
                                >
                                    {isVerifying && <Loader2 className="animate-spin" size={18} />}
                                    {isVerifying ? 'Verifying...' : 'Join Group'}
                                </button>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Creation Wizard Modal */}
            {/* Instruction Modal (shown after Join PIN success or Open own group) */}
            <AnimatePresence>
                {showInstructionModal && instructionGroup && (
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
                            className="w-full max-w-2xl rounded-2xl bg-[#10172b] border border-white/10 p-6 space-y-4 max-h-[90vh] overflow-y-auto"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-xs text-white/40 uppercase tracking-widest">Instructions for</p>
                                    <h2 className="text-xl font-semibold mt-0.5">{instructionGroup.title}</h2>
                                    <p className="text-sm text-white/50">by {instructionGroup.owner?.name}</p>
                                </div>
                                <button
                                    onClick={() => setShowInstructionModal(false)}
                                    className="text-white/60 hover:text-white"
                                >
                                    Close
                                </button>
                            </div>
                            <InstructionPanel
                                groupUrl={instructionGroup.url}
                                groupPin={''}
                                groupWorkerSize={String(instructionGroup.worker_size)}
                                groupEpoch={String(instructionGroup.epochs)}
                                groupBatchSize={String(instructionGroup.batch_size)}
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

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
                                            onClick={() => { setWizardStep(1); setError(null) }}
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
                                        <input type="number" value={workerSize} onChange={(e) => setWorkerSize(e.target.value)} placeholder="e.g. 4"
                                            className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 outline-none focus:border-white/30 transition text-white" required />
                                    </label>

                                    <label className="text-sm text-white/70">
                                        Epoch
                                        <input type="number" value={epoch} onChange={(e) => setEpoch(e.target.value)} placeholder="e.g. 100"
                                            className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 outline-none focus:border-white/30 transition text-white" required />
                                    </label>

                                    <label className="text-sm text-white/70">
                                        Batch Size
                                        <input type="number" value={batchSize} onChange={(e) => setBatchSize(e.target.value)} placeholder="e.g. 32"
                                            className="mt-1 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 outline-none focus:border-white/30 transition text-white" required />
                                    </label>

                                    <div className="flex gap-3 mt-4">
                                        <button type="button" onClick={() => { setError(null); setWizardStep(2) }}
                                            className="px-6 py-2.5 rounded-full text-white/70 hover:text-white hover:bg-white/5 transition-colors font-medium border border-white/10">
                                            Back
                                        </button>
                                        <button type="submit"
                                            disabled={!workerSize.trim() || !epoch.trim() || !batchSize.trim()}
                                            className={`flex-1 rounded-full py-2.5 font-semibold flex items-center justify-center gap-2 transition ${!workerSize.trim() || !epoch.trim() || !batchSize.trim()
                                                ? 'bg-white/40 text-slate-900/60 cursor-not-allowed'
                                                : 'bg-white text-slate-900 hover:bg-white/90 cursor-pointer'
                                                }`}>
                                            Next
                                        </button>
                                    </div>
                                </form>
                            ) : (
                                <form onSubmit={handleCreateSubmit} className="grid gap-4">
                                    <InstructionPanel
                                        groupUrl={url}
                                        groupPin={pin}
                                        groupWorkerSize={workerSize}
                                        groupEpoch={epoch}
                                        groupBatchSize={batchSize}
                                    />
                                    <div className="flex gap-3 mt-4">
                                        <button
                                            type="button"
                                            disabled={isCreating}
                                            onClick={() => { setError(null); setWizardStep(3) }}
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
        </ScrollHideProvider>
    )
}
