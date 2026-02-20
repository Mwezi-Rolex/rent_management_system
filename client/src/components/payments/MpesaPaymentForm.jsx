import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Form, Card, Spinner, Alert, ProgressBar } from 'react-bootstrap';
import { useAuth } from '../../utils/auth-context';
import api from '../../utils/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// Define enhanced payment status modal with React Query for reliable status updates
const PaymentStatusModal = (props) => {
  const { 
    show, 
    onHide, 
    status, 
    transactionDetails, 
    error, 
    onRetry,
    onPaymentSuccess,
    onPaymentCancelled,
    onPaymentFailed,
    onPaymentExpired
  } = props;
  const [statusMessage, setStatusMessage] = useState('');
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes in seconds
  const [expiryTime, setExpiryTime] = useState(null);
  const queryClient = useQueryClient();

  // Extract checkout request ID from transaction details
  const checkoutRequestID = transactionDetails?.CheckoutRequestID;

  // Set expiry time based on transaction details
  useEffect(() => {
    if (transactionDetails?.expiryTime) {
      setExpiryTime(new Date(transactionDetails.expiryTime));
    } else if (transactionDetails) {
      // Default to 2 minutes from now if no expiry time provided
      const twoMinutesFromNow = new Date();
      twoMinutesFromNow.setMinutes(twoMinutesFromNow.getMinutes() + 2);
      setExpiryTime(twoMinutesFromNow);
    }
  }, [transactionDetails]);

  // Timer countdown effect
  useEffect(() => {
    let timer;
    
    if (show && status === 'processing' && expiryTime) {
      timer = setInterval(() => {
        const now = new Date();
        const secondsLeft = Math.max(0, Math.floor((expiryTime - now) / 1000));
        
        setTimeLeft(secondsLeft);
        
        if (secondsLeft <= 0) {
          clearInterval(timer);
          // Don't set status here - let the polling handle it
        }
      }, 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [show, status, expiryTime]);

  // Use React Query for polling payment status
  const { data: paymentStatusData } = useQuery({
    queryKey: ['paymentStatus', checkoutRequestID],
    queryFn: async () => {
      if (!checkoutRequestID) return null;
      try {
        // First try the mpesa-specific endpoint
        const response = await api.get(`/api/mpesa/status/${checkoutRequestID}`);
        return response.data;
      } catch (error) {
        // Fall back to the general payment status endpoint
        try {
          const fallbackResponse = await api.get(`/api/payments/status/${checkoutRequestID}`);
          return fallbackResponse.data;
        } catch (fallbackError) {
          console.error('Error checking payment status:', fallbackError);
          return null;
        }
      }
    },
    enabled: !!checkoutRequestID && status === 'processing' && show,
    refetchInterval: (data) => {
      // Stop polling when we have a conclusive status
      if (!data) return 3000; // Poll every 3 seconds by default
      
      if (data.success && data.data) {
        const paymentStatus = data.data.status;
        
        // Stop polling for conclusive statuses
        if (
          paymentStatus === 'completed' || 
          paymentStatus === 'success' || 
          paymentStatus === 'failed' || 
          paymentStatus === 'cancelled' || 
          paymentStatus === 'expired'
        ) {
          return false;
        }
      }
      
      return 3000; // Continue polling every 3 seconds
    },
    refetchOnWindowFocus: true,
    retry: 3
  });

  // Process payment status updates from React Query
  useEffect(() => {
    if (paymentStatusData?.success && paymentStatusData?.data) {
      const paymentData = paymentStatusData.data;
      const paymentStatus = paymentData.status;
      
      if (paymentStatus === 'completed' || paymentStatus === 'success') {
        onPaymentSuccess(paymentData);
      } else if (paymentStatus === 'cancelled') {
        setStatusMessage(paymentData.resultDesc || 'You cancelled the payment. Please try again.');
        onPaymentCancelled(paymentData);
      } else if (paymentStatus === 'failed') {
        setStatusMessage(paymentData.resultDesc || 'Payment failed. Please try again.');
        onPaymentFailed(paymentData);
      } else if (paymentStatus === 'expired') {
        setStatusMessage('Payment request expired. Please try again.');
        onPaymentExpired(paymentData);
      }
      
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['paymentHistory'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    }
  }, [paymentStatusData, onPaymentSuccess, onPaymentCancelled, onPaymentFailed, onPaymentExpired, queryClient]);

  const getStatusTitle = () => {
    switch (status) {
      case 'success': return 'Payment Successful!';
      case 'failed': return 'Payment Failed';
      case 'cancelled': return 'Payment Cancelled';
      case 'expired': return 'Payment Expired';
      case 'timeout': return 'Payment Timed Out';
      default: return 'Processing Payment';
    }
  };

  const getStatusMessage = () => {
    if (statusMessage) return statusMessage;
    
    switch (status) {
      case 'success': return 'Your payment has been processed successfully.';
      case 'failed': return error || 'There was a problem processing your payment. Please try again.';
      case 'cancelled': return 'You cancelled the payment. Please try again.';
      case 'expired': return 'The payment request has expired. Please try again.';
      case 'timeout': return 'The payment request timed out. Please check your M-Pesa app or try again.';
      default: return 'Please check your phone and enter your M-Pesa PIN when prompted.';
    }
  };

  const formatTimeLeft = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const isRetryable = ['failed', 'cancelled', 'expired', 'timeout'].includes(status);

  return (
    <div className={`modal ${show ? 'show d-block' : 'd-none'}`} tabIndex={-1} role="dialog">
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-body pt-4">
            <div className="text-center mb-4">
              {status === 'processing' ? (
                <>
                  {timeLeft > 0 && (
                    <div className="mt-3">
                      <small className="text-muted">Time remaining: {formatTimeLeft(timeLeft)}</small>
                      <ProgressBar 
                        now={timeLeft} 
                        max={120} 
                        variant={timeLeft < 30 ? "danger" : timeLeft < 60 ? "warning" : "primary"} 
                        className="mt-2"
                      />
                    </div>
                  )}
                </>
              ) : (
                <div 
                  className="status-message" 
                  style={{
                    fontSize: '1.2rem',
                    fontWeight: '700',
                    marginBottom: '1rem',
                    textAlign: 'center',
                    padding: '1rem 1.5rem',
                    borderRadius: '4px',
                    width: '100%',
                    backgroundColor: status === 'success' ? '#d4edda' : 
                                    status === 'failed' || status === 'cancelled' || status === 'expired' ? '#f8d7da' : 
                                    status === 'timeout' ? '#fff3cd' : '#f8f9fa',
                    color: status === 'success' ? '#155724' : 
                           status === 'failed' || status === 'cancelled' || status === 'expired' ? '#721c24' : 
                           status === 'timeout' ? '#856404' : '#212529'
                  }}
                >
                  {getStatusTitle()}
                </div>
              )}
              
              <p className="mt-3">{getStatusMessage()}</p>
            </div>
            
            {transactionDetails && (
              <>
                <hr />
                <h6>Transaction Details:</h6>
                <ul className="list-group list-group-flush small">
                  {transactionDetails.CheckoutRequestID && (
                    <li className="list-group-item d-flex justify-content-between">
                      <span>Request ID:</span>
                      <span className="text-muted">{transactionDetails.CheckoutRequestID}</span>
                    </li>
                  )}
                  {transactionDetails.CustomerMessage && (
                    <li className="list-group-item d-flex justify-content-between">
                      <span>Message:</span>
                      <span className="text-muted">{transactionDetails.CustomerMessage}</span>
                    </li>
                  )}
                  {transactionDetails.amount && (
                    <li className="list-group-item d-flex justify-content-between">
                      <span>Amount:</span>
                      <span className="text-muted">KES {transactionDetails.amount}</span>
                    </li>
                  )}
                </ul>
              </>
            )}
          </div>
          <div className="modal-footer">
            {isRetryable && (
              <Button 
                variant="primary" 
                onClick={onRetry}
                className="me-2"
              >
                Retry Payment
              </Button>
            )}
            <Button 
              variant={status === 'success' ? "success" : "secondary"} 
              onClick={onHide} 
              disabled={status === 'processing'}
            >
              {status === 'success' ? 'Done' : 'Close'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const MpesaPaymentForm = (props) => {
  const { invoiceId, amount: initialAmount, propertyReference, onPaymentComplete } = props;
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Form state
  const [phoneNumber, setPhoneNumber] = useState('');
  const [amount, setAmount] = useState(initialAmount?.toString() || '');
  const [reference, setReference] = useState(invoiceId || propertyReference || '');
  
  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState('pending');
  const [transactionDetails, setTransactionDetails] = useState(null);
  
  // React Query for payment history
  const { data: paymentHistoryData } = useQuery({
    queryKey: ['paymentHistory', invoiceId],
    queryFn: async () => {
      if (!invoiceId) return [];
      try {
        const response = await api.get(`/api/payments/invoice/${invoiceId}`);
        return response.data.success ? response.data.data : [];
      } catch (error) {
        console.error('Error fetching payment history:', error);
        return [];
      }
    },
    enabled: !!invoiceId,
    refetchOnWindowFocus: true,
    staleTime: 30000 // 30 seconds
  });

  // Prefill phone number if user has one
  useEffect(() => {
    if (user?.phone) {
      setPhoneNumber(user.phone);
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    
    try {
      // Validate input
      if (!phoneNumber || !amount || !reference) {
        throw new Error('Please fill in all required fields');
      }

      // Format phone number if needed
      let formattedPhone = phoneNumber;
      if (!formattedPhone.startsWith('0') && !formattedPhone.startsWith('+254') && !formattedPhone.startsWith('254')) {
        formattedPhone = '0' + formattedPhone;
      }

      // Show modal with pending status
      setShowModal(true);
      setPaymentStatus('processing');
      
      // Send payment request
      const response = await api.post('/api/mpesa/stkpush', {
        phone: formattedPhone,
        amount: parseFloat(amount),
        invoice_id: reference
      });

      // Update transaction details with response data
      setTransactionDetails(response.data.data);
      
      // Update status based on response
      if (response.data.success) {
        // Status will be updated by polling in the modal
      } else {
        setPaymentStatus('failed');
        setError(response.data.message || 'Payment request failed');
      }
    } catch (err) {
      console.error('Payment error:', err);
      setPaymentStatus('failed');
      setError(err.response?.data?.message || err.message || 'An error occurred');
      setShowModal(true);
    } finally {
      setLoading(false);
    }
  };

  // Handle payment status updates
  const handlePaymentSuccess = (paymentData) => {
    setPaymentStatus('success');
    // Update transaction details with payment data
    setTransactionDetails(prev => ({ ...prev, ...paymentData }));
    
    // Refresh payment history
    queryClient.invalidateQueries({ queryKey: ['paymentHistory', invoiceId] });
    
    // Notify parent component if callback provided
    if (onPaymentComplete) {
      onPaymentComplete({
        status: 'success',
        data: paymentData
      });
    }
  };

  const handlePaymentFailed = (paymentData) => {
    setPaymentStatus('failed');
    setError(paymentData.resultDesc || 'Payment failed');
    setTransactionDetails(prev => ({ ...prev, ...paymentData }));
  };

  const handlePaymentCancelled = (paymentData) => {
    setPaymentStatus('cancelled');
    setTransactionDetails(prev => ({ ...prev, ...paymentData }));
  };

  const handlePaymentExpired = (paymentData) => {
    setPaymentStatus('expired');
    setTransactionDetails(prev => ({ ...prev, ...paymentData }));
  };

  const handleRetryPayment = async () => {
    setError(null);
    setLoading(true);
    
    try {
      // Reset UI state
      setShowModal(true);
      setPaymentStatus('processing');
      
      // Create a new payment request
      const response = await api.post('/api/mpesa/stkpush', {
        phone: phoneNumber,
        amount: parseFloat(amount),
        invoice_id: reference
      });

      // Update transaction details with response data
      setTransactionDetails(response.data.data);
      
    } catch (err) {
      console.error('Payment retry error:', err);
      setPaymentStatus('failed');
      setError(err.response?.data?.message || err.message || 'Failed to retry payment');
    } finally {
      setLoading(false);
    }
  };

  const handleModalClose = () => {
    setShowModal(false);
    
    // If payment was successful, redirect or update UI as needed
    if (paymentStatus === 'success' && invoiceId) {
      navigate(`/tenant/invoices/${invoiceId}`);
    }
  };

  // Get recent payment status from payment history
  const getRecentPaymentStatus = () => {
    if (!paymentHistoryData || paymentHistoryData.length === 0) return null;
    
    const sortedPayments = [...paymentHistoryData].sort((a, b) => 
      new Date(b.created_at) - new Date(a.created_at)
    );
    
    return sortedPayments[0];
  };

  const recentPayment = getRecentPaymentStatus();

  return (
    <Card className="shadow-sm">
      <Card.Header className="bg-primary text-white">
        <h5 className="mb-0">M-Pesa Payment</h5>
      </Card.Header>
      <Card.Body>
        {error && <Alert variant="danger">{error}</Alert>}
        
        {recentPayment && recentPayment.status === 'completed' && (
          <Alert variant="success">
            <Alert.Heading>Payment Already Completed</Alert.Heading>
            <p>
              A payment of KES {recentPayment.amount} was already made on{' '}
              {new Date(recentPayment.created_at).toLocaleDateString()} at{' '}
              {new Date(recentPayment.created_at).toLocaleTimeString()}.
            </p>
          </Alert>
        )}
        
        {recentPayment && ['pending', 'failed', 'expired', 'cancelled'].includes(recentPayment.status) && (
          <Alert variant={recentPayment.status === 'pending' ? 'info' : 'warning'}>
            <Alert.Heading>
              {recentPayment.status === 'pending' ? 'Payment In Progress' : 'Previous Payment Incomplete'}
            </Alert.Heading>
            <p>
              A payment of KES {recentPayment.amount} was {recentPayment.status === 'pending' ? 'initiated' : recentPayment.status} on{' '}
              {new Date(recentPayment.created_at).toLocaleDateString()} at{' '}
              {new Date(recentPayment.created_at).toLocaleTimeString()}.
            </p>
            {recentPayment.status !== 'pending' && (
              <div className="d-flex justify-content-end">
                <Button 
                  variant="outline-primary" 
                  size="sm"
                  onClick={handleRetryPayment}
                >
                  Retry Payment
                </Button>
              </div>
            )}
          </Alert>
        )}
        
        <Form onSubmit={handleSubmit}>
          <Form.Group className="mb-3">
            <Form.Label>Phone Number (M-Pesa)</Form.Label>
            <Form.Control
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="e.g. 07XXXXXXXX"
              disabled={loading}
              required
            />
            <Form.Text className="text-muted">
              Enter the phone number registered with M-Pesa
            </Form.Text>
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>Amount (KES)</Form.Label>
            <Form.Control
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              disabled={loading || initialAmount !== undefined}
              required
            />
          </Form.Group>
          
          <Form.Group className="mb-3">
            <Form.Label>Reference</Form.Label>
            <Form.Control
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Invoice or property reference"
              disabled={loading || invoiceId !== undefined || propertyReference !== undefined}
              required
            />
          </Form.Group>
          
          <div className="d-grid">
            <Button 
              variant="primary" 
              type="submit" 
              disabled={loading}
            >
              {loading ? (
                <>
                  <Spinner
                    as="span"
                    animation="border"
                    size="sm"
                    role="status"
                    aria-hidden="true"
                    className="me-2"
                  />
                  Processing...
                </>
              ) : (
                'Pay with M-Pesa'
              )}
            </Button>
          </div>
        </Form>
      </Card.Body>
      
      {/* Payment Status Modal */}
      <PaymentStatusModal
        show={showModal}
        onHide={handleModalClose}
        status={paymentStatus}
        transactionDetails={transactionDetails}
        error={error}
        onPaymentSuccess={handlePaymentSuccess}
        onPaymentFailed={handlePaymentFailed}
        onPaymentCancelled={handlePaymentCancelled}
        onPaymentExpired={handlePaymentExpired}
        onRetry={handleRetryPayment}
      />
    </Card>
  );
};

export default MpesaPaymentForm; 