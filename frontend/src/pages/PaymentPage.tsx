import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle, QrCode, XCircle, AlertCircle } from 'lucide-react'
import { api } from '../api/client'
import QRCode from 'react-qr-code'

export default function PaymentPage() {
  const navigate = useNavigate()
  const id = localStorage.getItem('active_txn_id')
  
  const [transaction, setTransaction] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [nowTime, setNowTime] = useState(Date.now())
  const hasMarkedFailed = useRef(false)

  useEffect(() => {
    const timer = setInterval(() => setNowTime(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (!id) return;

    let mounted = true;
    
    const fetchTransaction = async () => {
      try {
        const res = await api.get(`/transactions/${id}`);
        if (mounted) {
          setTransaction(res.data);
          setError('');
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.response?.data?.error || 'Failed to load transaction');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchTransaction();
    const interval = setInterval(fetchTransaction, 2500); // Poll for status updates
    
    return () => {
      mounted = false;
      clearInterval(interval);
    }
  }, [id]);

  useEffect(() => {
    if (transaction?.status === 'initiated' && id) {
      api.put(`/transactions/${id}/pending`).then(() => {
        setTransaction((prev: any) => prev ? { ...prev, status: 'pending' } : prev)
      }).catch(() => {})
    }

    if (transaction?.status === 'pending' && id) {
      const reqTime = new Date(transaction.created_at).getTime();
      const WINDOW_MS = 5 * 60 * 1000;
      if (nowTime - reqTime >= WINDOW_MS && !hasMarkedFailed.current) {
        hasMarkedFailed.current = true;
        api.put(`/transactions/${id}/fail`).catch(() => {});
      }
    }

    if (transaction?.status === 'successful') {
      const timer = setTimeout(() => {
        window.close()
        navigate(-1)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [nowTime, transaction, id, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#040814] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#7890ff] border-t-transparent animate-spin" />
      </div>
    )
  }

  if (error || !transaction) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <AlertCircle size={48} className="text-rose-500 mb-4" />
        <h2 className="text-xl font-bold text-slate-800 mb-2">Checkout Error</h2>
        <p className="text-slate-500 mb-6">{error || 'Transaction not found'}</p>
        <button onClick={() => navigate(-1)} className="px-6 py-2.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 font-medium transition-colors">
          Go Back
        </button>
      </div>
    )
  }

  const reqTime = new Date(transaction.created_at).getTime();
  const WINDOW_MS = 5 * 60 * 1000;
  const isExpired = nowTime - reqTime >= WINDOW_MS;
  const timeLeftMs = Math.max(0, WINDOW_MS - (nowTime - reqTime));
  const timeLeftStr = `${Math.floor(timeLeftMs / 60000)}:${Math.floor((timeLeftMs % 60000) / 1000).toString().padStart(2, '0')}`;
  
  const sellerUpiId = transaction.seller?.upi_id || 'demo@upi';
  const sellerName = transaction.seller?.name || 'Seller';
  const amount = transaction.amount;
  const status = isExpired && transaction.status === 'pending' ? 'failed' : transaction.status;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="p-4 flex items-center bg-white shadow-sm border-b border-slate-200">
        <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-lg hover:bg-slate-100 transition-colors group">
          <ArrowLeft className="w-5 h-5 text-slate-500 group-hover:text-slate-800" />
        </button>
        <div className="font-semibold text-slate-800 ml-2 flex-1 text-center pr-8">Secure Checkout</div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 max-w-md mx-auto w-full">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-xl w-full text-center relative overflow-hidden">
          
          {/* Header */}
          <div className="mb-8">
            <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-200 mx-auto flex items-center justify-center shadow-sm mb-4">
              <span className="text-2xl text-slate-800 font-bold">{sellerName.charAt(0)}</span>
            </div>
            <h2 className="text-lg font-medium text-slate-500 mb-1">Payment to {sellerName}</h2>
            <div className="text-4xl font-bold text-slate-900 tracking-tight">₹{amount}</div>
            <div className="text-sm font-medium text-slate-400 mt-1">For {transaction.product?.title || 'Product'}</div>
          </div>

          {/* Status Content */}
          {status === 'successful' ? (
            <div className="animate-in fade-in zoom-in duration-500 flex flex-col items-center">
              <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mb-4 border border-green-100">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Payment Completed</h3>
              <p className="text-sm text-slate-500 mb-6">The seller has confirmed receipt of your payment.</p>
              <button onClick={() => navigate(-1)} className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold text-slate-800 transition-colors border border-slate-200">
                Return to Chat
              </button>
            </div>
          ) : status === 'failed' ? (
            <div className="animate-in fade-in zoom-in duration-500 flex flex-col items-center">
              <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mb-4 border border-rose-100">
                <XCircle className="w-10 h-10 text-rose-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Payment Failed</h3>
              <p className="text-sm text-slate-500 mb-6">The 5-minute payment window has closed. Please ask the seller to request payment again.</p>
              <button onClick={() => navigate(-1)} className="w-full py-3 px-4 bg-slate-100 hover:bg-slate-200 rounded-xl font-semibold text-slate-800 transition-colors border border-slate-200">
                Return to Chat
              </button>
            </div>
          ) : (
            <div className="animate-in fade-in zoom-in duration-500 flex flex-col items-center">
              <div className="bg-white p-4 rounded-2xl shadow-md mx-auto inline-block relative border border-slate-100 group mb-6">
                <QRCode value={`upi://pay?pa=${sellerUpiId}&pn=${encodeURIComponent(sellerName)}&am=${amount}`} size={200} />
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between w-full mb-6">
                <div className="flex items-center gap-2 text-sm text-[#7890ff] font-semibold">
                  <QrCode size={16} />
                  <span>Awaiting Payment</span>
                </div>
                <div className="font-mono text-rose-500 font-semibold text-sm">{timeLeftStr}</div>
              </div>

              <a 
                href={`upi://pay?pa=${sellerUpiId}&pn=${encodeURIComponent(sellerName)}&am=${amount}`}
                className="w-full py-3.5 px-4 bg-[#7890ff] hover:bg-[#6880ee] rounded-xl font-semibold text-white transition-colors shadow-md block"
              >
                Pay via UPI App
              </a>
              
              <div className="mt-4 text-xs font-medium text-slate-400">
                UPI ID: <span className="text-slate-600">{sellerUpiId}</span>
              </div>
            </div>
          )}

        </div>
        
        {status === 'pending' && (
          <p className="text-xs text-center text-slate-400 mt-6 leading-relaxed max-w-[280px]">
            Please do not close this window. Ensure you inform the seller once payment is successful.
          </p>
        )}
      </div>
    </div>
  )
}
