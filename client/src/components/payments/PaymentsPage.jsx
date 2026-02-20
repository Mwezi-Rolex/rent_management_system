import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BanknotesIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowLeftIcon,
  ClockIcon,
  XCircleIcon,
  DocumentTextIcon,
  CalendarIcon,
  BuildingLibraryIcon
} from '@heroicons/react/24/outline';
import MpesaPaymentForm from './MpesaPaymentForm';
import api from '../../utils/api';
import { Button } from '../ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import LoadingSpinner from '../ui/LoadingSpinner';

const PaymentStatusBadge = ({ status }) => {
  let variant = 'secondary';
  let icon = null;
  
  switch (status) {
    case 'completed':
      variant = 'success';
      icon = <CheckCircleIcon className="w-4 h-4" />;
      break;
    case 'pending':
      variant = 'warning';
      icon = <ClockIcon className="w-4 h-4" />;
      break;
    case 'failed':
    case 'expired':
    case 'cancelled':
      variant = 'destructive';
      icon = <XCircleIcon className="w-4 h-4" />;
      break;
    default:
      variant = 'secondary';
  }
  
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium capitalize ${
      variant === 'success' ? 'bg-success-50 text-success-700 border border-success-200 dark:bg-success-900/20 dark:text-success-400 dark:border-success-800/30' :
      variant === 'warning' ? 'bg-warning-50 text-warning-700 border border-warning-200 dark:bg-warning-900/20 dark:text-warning-400 dark:border-warning-800/30' :
      variant === 'destructive' ? 'bg-error-50 text-error-700 border border-error-200 dark:bg-error-900/20 dark:text-error-400 dark:border-error-800/30' :
      'bg-neutral-100 text-neutral-700 border border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700'
    }`}>
      {icon}
      <span>{status}</span>
    </span>
  );
};

const PaymentMethodOption = ({ id, title, description, icon, selected, onClick, disabled = false }) => {
  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={`relative overflow-hidden rounded-xl border-2 p-5 cursor-pointer transition-all duration-200 ${
        disabled ? 'opacity-60 cursor-not-allowed' : ''
      } ${
        selected 
          ? 'border-primary-500 bg-primary-50 dark:border-primary-400 dark:bg-primary-900/20' 
          : 'border-accent-200 bg-white hover:border-primary-200 dark:border-neutral-700 dark:bg-neutral-800 dark:hover:border-primary-700'
      }`}
    >
      {selected && (
        <div className="absolute top-2 right-2 h-4 w-4 rounded-full bg-primary-500 dark:bg-primary-400 flex items-center justify-center">
          <CheckCircleIcon className="h-4 w-4 text-white" />
        </div>
      )}
      
      <div className="flex items-start gap-4">
        <div className={`rounded-full p-2 ${
          selected 
            ? 'bg-primary-100 text-primary-700 dark:bg-primary-800 dark:text-primary-300' 
            : 'bg-accent-100 text-accent-700 dark:bg-neutral-700 dark:text-neutral-300'
        }`}>
          {icon}
        </div>
        <div>
          <h3 className="font-semibold text-neutral-900 dark:text-white">{title}</h3>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{description}</p>
          {disabled && (
            <span className="mt-2 inline-block px-2 py-1 text-xs bg-amber-100 text-amber-800 rounded-md dark:bg-amber-900/30 dark:text-amber-300">
              In development
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const PaymentsPage = () => {
  const { invoiceId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState('mpesa'); // Default to M-PESA
  const [invoiceDetails, setInvoiceDetails] = useState(null);
  const [paymentHistory, setPaymentHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Extract query parameters
  const queryParams = new URLSearchParams(location.search);
  const amount = queryParams.get('amount') ? parseFloat(queryParams.get('amount')) : undefined;
  const returnUrl = queryParams.get('returnUrl') || undefined;

  // Add a listener for route changes to refetch data
  useEffect(() => {
    // This will run when location or invoiceId changes
    if (invoiceId) {
      fetchInvoiceDetails();
      fetchPaymentHistory();
    }
  }, [location.pathname, invoiceId, refreshTrigger]);

  const fetchInvoiceDetails = async () => {
    if (!invoiceId) return;
    
    try {
      setLoading(true);
      const response = await api.get(`/api/invoices/${invoiceId}`);
      setInvoiceDetails(response.data.data);
    } catch (err) {
      console.error('Error fetching invoice details:', err);
      setError('Failed to load invoice details');
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentHistory = async () => {
    if (!invoiceId) return;
    
    try {
      const response = await api.get(`/api/payments/invoice/${invoiceId}`);
      if (response.data.success) {
        setPaymentHistory(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching payment history:', err);
    }
  };

  const handlePaymentComplete = () => {
    setRefreshTrigger(prev => prev + 1);
    // Refetch payment history after successful payment
    fetchPaymentHistory();
    // Also refetch invoice details to get updated status
    fetchInvoiceDetails();
  };

  const isPaid = invoiceDetails?.status === 'paid' || 
                paymentHistory.some(payment => payment.status === 'completed');
  
  const generatePDF = async () => {
    try {
      // In a real implementation, this would call an API endpoint to generate a PDF
      const response = await api.get(`/api/payments/receipt/${paymentHistory[0].id}`, { 
        responseType: 'blob' 
      });
      
      // Create a download link and trigger it
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `receipt-${paymentHistory[0].transaction_id || 'payment'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error('Error generating receipt:', err);
      alert('Could not generate receipt. Please try again later.');
    }
  };

  // Get display amount
  const displayAmount = invoiceDetails?.amount || amount || 0;
  const formattedAmount = displayAmount.toLocaleString(undefined, { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50/40 to-secondary-50/40 flex items-center justify-center">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mb-4" />
          <p className="text-neutral-600 dark:text-neutral-400 animate-pulse">Loading payment details...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50/40 to-secondary-50/40 flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center">
          <div className="p-6 sm:p-8">
            <div className="mx-auto w-16 h-16 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center mb-6">
              <ExclamationTriangleIcon className="w-8 h-8 text-red-500 dark:text-red-400" />
            </div>
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">Error Loading Payment</h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6">{error}</p>
            <Button
              variant="default"
              onClick={() => navigate(returnUrl || '/tenant/dashboard')}
              className="w-full sm:w-auto"
            >
              Back to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Render the Bank Payment Option (placeholder)
  const renderBankPaymentOption = () => {
    return (
      <div className="py-10 text-center">
        <div className="mx-auto w-20 h-20 bg-blue-50 dark:bg-blue-900/20 rounded-full flex items-center justify-center mb-6">
          <BuildingLibraryIcon className="w-10 h-10 text-blue-500 dark:text-blue-400" />
        </div>
        <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">
          Bank Payment Option
        </h3>
        <p className="text-neutral-600 dark:text-neutral-400 max-w-md mx-auto mb-6">
          This payment method is currently in development. Please use M-PESA for now.
        </p>
        <Button
          variant="outline"
          size="lg"
          disabled
          className="opacity-60 cursor-not-allowed"
        >
          Pay KES {formattedAmount}
        </Button>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50/30 to-secondary-50/30 py-6 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Back Button */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-4"
        >
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(returnUrl || -1)}
            leftIcon={<ArrowLeftIcon className="h-4 w-4" />}
          >
            Back
          </Button>
        </motion.div>
        
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative bg-gradient-to-r from-primary-600/90 to-primary-800/90 rounded-2xl shadow-lg overflow-hidden mb-8"
        >
          <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
          <div className="relative p-6 sm:p-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">
              {isPaid ? 'Payment Complete' : 'Complete Your Payment'}
            </h1>
            <p className="text-base text-primary-100">
              {isPaid 
                ? 'Your payment has been processed successfully'
                : 'Select a payment method to continue'
              }
            </p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Payment Summary and History */}
          <div className="lg:col-span-1 space-y-6">
            {/* Payment Summary Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="overflow-hidden shadow-md">
                <div className="bg-primary-50 dark:bg-primary-900/10 border-b border-primary-100 dark:border-primary-800/20 p-4">
                  <div className="flex items-center">
                    <DocumentTextIcon className="w-5 h-5 text-primary-600 mr-2" />
                    <h3 className="text-base font-semibold text-primary-900 dark:text-primary-100">Payment Summary</h3>
                  </div>
                </div>
                <div className="p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">Amount</span>
                      <span className="text-sm font-medium text-neutral-900 dark:text-white">KES {formattedAmount}</span>
                    </div>
                    
                    {invoiceDetails && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-sm text-neutral-600 dark:text-neutral-400">Invoice</span>
                          <span className="text-sm font-medium text-neutral-900 dark:text-white">#{invoiceDetails.invoice_number || invoiceId}</span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-sm text-neutral-600 dark:text-neutral-400">Due Date</span>
                          <span className="text-sm font-medium text-neutral-900 dark:text-white flex items-center">
                            <CalendarIcon className="w-4 h-4 mr-1 text-neutral-500" />
                            {new Date(invoiceDetails.due_date).toLocaleDateString()}
                          </span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-sm text-neutral-600 dark:text-neutral-400">Status</span>
                          <PaymentStatusBadge status={invoiceDetails.status} />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            </motion.div>

            {/* Payment History */}
            {paymentHistory.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Payment History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {paymentHistory.map((payment, index) => (
                        <div key={index} className="border-b border-gray-100 dark:border-gray-800 pb-3 last:border-0 last:pb-0">
                          <div className="flex justify-between mb-1">
                            <span className="text-sm font-medium">KES {Number(payment.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                            <PaymentStatusBadge status={payment.status} />
                          </div>
                          <div className="flex justify-between text-xs text-gray-500">
                            <span>{new Date(payment.created_at).toLocaleDateString()}</span>
                            <span className="capitalize">{payment.payment_method}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>

          {/* Right Column - Payment Methods */}
          <div className="lg:col-span-2">
            {isPaid ? (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
                        <CheckCircleIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
                      </div>
                      <h2 className="text-xl font-semibold text-green-600 dark:text-green-400">Payment Successful!</h2>
                      <p className="mt-2 text-neutral-600 dark:text-neutral-400">Thank you for your payment.</p>
                      
                      {paymentHistory.length > 0 && paymentHistory[0].status === 'completed' && (
                        <div className="mt-6 p-4 bg-neutral-50 dark:bg-neutral-800/50 rounded-lg">
                          <h3 className="font-medium text-neutral-900 dark:text-white">Payment Details</h3>
                          <div className="mt-3 space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-neutral-600 dark:text-neutral-400">Transaction ID</span>
                              <span className="font-medium text-neutral-900 dark:text-white">{paymentHistory[0].transaction_id || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-neutral-600 dark:text-neutral-400">Payment Method</span>
                              <span className="font-medium text-neutral-900 dark:text-white capitalize">{paymentHistory[0].payment_method}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-neutral-600 dark:text-neutral-400">Date</span>
                              <span className="font-medium text-neutral-900 dark:text-white">{new Date(paymentHistory[0].updated_at || paymentHistory[0].created_at).toLocaleString()}</span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-6">
                        <Button
                          onClick={generatePDF}
                          variant="outline"
                          size="md"
                          leftIcon={<DocumentTextIcon className="w-4 h-4" />}
                        >
                          Download Receipt
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Choose Payment Method</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      {/* M-PESA Option */}
                      <PaymentMethodOption
                        id="mpesa"
                        title="M-PESA"
                        description="Pay using M-PESA mobile money"
                        icon={<BanknotesIcon className="h-5 w-5" />}
                        selected={paymentMethod === 'mpesa'}
                        onClick={() => setPaymentMethod('mpesa')}
                      />
                      
                      {/* Bank Transfer Option */}
                      <PaymentMethodOption
                        id="bank"
                        title="Bank Transfer"
                        description="Pay using bank transfer"
                        icon={<BuildingLibraryIcon className="h-5 w-5" />}
                        selected={paymentMethod === 'bank'}
                        onClick={() => setPaymentMethod('bank')}
                        disabled={true}
                      />
                    </div>
                    
                    {/* Payment Form */}
                    <AnimatePresence mode="wait">
                      {paymentMethod === 'mpesa' ? (
                        <motion.div
                          key="mpesa-form"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                        >
                          <MpesaPaymentForm 
                            invoiceId={invoiceId}
                            initialAmount={displayAmount}
                            onPaymentComplete={handlePaymentComplete}
                          />
                        </motion.div>
                      ) : (
                        <motion.div
                          key="bank-form"
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.2 }}
                        >
                          {renderBankPaymentOption()}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentsPage; 