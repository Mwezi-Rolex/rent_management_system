import React, { useState, useEffect } from 'react';
import { Modal, Button, Spinner, ProgressBar } from 'react-bootstrap';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../../utils/api';

/**
 * A standalone modal component for showing M-Pesa payment status
 * Uses React Query for real-time polling
 * Text-only display without icons
 */
const MpesaPaymentModal = ({
  show,
  onClose,
  transactionId,
  initialDetails,
  onPaymentSuccess,
  onPaymentFailed,
  onPaymentCancelled,
  onRetry
}) => {
  const [timeLeft, setTimeLeft] = useState(120); // 2 minutes in seconds
  const [expiryTime, setExpiryTime] = useState(null);
  const [status, setStatus] = useState('processing');
  const [statusMessage, setStatusMessage] = useState('');
  const queryClient = useQueryClient();

  // Set up expiry time
  useEffect(() => {
    if (initialDetails?.expiryTime) {
      setExpiryTime(new Date(initialDetails.expiryTime));
    } else if (show) {
      // Default to 2 minutes from now
      const twoMinutesFromNow = new Date();
      twoMinutesFromNow.setMinutes(twoMinutesFromNow.getMinutes() + 2);
      setExpiryTime(twoMinutesFromNow);
    }
  }, [initialDetails, show]);

  // Timer countdown effect
  useEffect(() => {
    let timer;
    
    if (show && expiryTime) {
      timer = setInterval(() => {
        const now = new Date();
        const secondsLeft = Math.max(0, Math.floor((expiryTime - now) / 1000));
        
        setTimeLeft(secondsLeft);
        
        if (secondsLeft <= 0 && status === 'processing') {
          setStatus('timeout');
          setStatusMessage('Payment request timed out. Please try again.');
        }
      }, 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [show, expiryTime, status]);

  // Use React Query for polling payment status
  const { data: paymentStatusData } = useQuery({
    queryKey: ['paymentStatus', transactionId],
    queryFn: async () => {
      if (!transactionId) return null;
      
      try {
        // Try M-Pesa endpoint first
        try {
          const response = await api.get(`/api/mpesa/status/${transactionId}`);
          return response.data;
        } catch (mpesaError) {
          // Fall back to general payment status endpoint
          const response = await api.get(`/api/payments/status/${transactionId}`);
          return response.data;
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        return null;
      }
    },
    enabled: !!transactionId && show && status === 'processing',
    refetchInterval: (data) => {
      // Stop polling when we have a conclusive status
      if (!data?.success || !data?.data) return 3000; // Every 3 seconds if no data
      
      const paymentStatus = data.data.status;
      
      if (
        paymentStatus === 'completed' || 
        paymentStatus === 'success' || 
        paymentStatus === 'failed' || 
        paymentStatus === 'cancelled' || 
        paymentStatus === 'expired'
      ) {
        return false; // Stop polling
      }
      
      return 3000; // Poll every 3 seconds
    },
    refetchOnWindowFocus: true,
    retry: 3,
  });

  // Process payment status updates
  useEffect(() => {
    if (!paymentStatusData?.success || !paymentStatusData?.data) return;
    
    const paymentData = paymentStatusData.data;
    const paymentStatus = paymentData.status;
    
    if (paymentStatus === 'completed' || paymentStatus === 'success') {
      setStatus('success');
      
      if (onPaymentSuccess) {
        onPaymentSuccess(paymentData);
      }
      
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['paymentHistory'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    } 
    else if (paymentStatus === 'cancelled') {
      setStatus('cancelled');
      setStatusMessage(paymentData.resultDesc || 'You cancelled the payment. Please try again.');
      
      if (onPaymentCancelled) {
        onPaymentCancelled(paymentData);
      }
    }
    else if (paymentStatus === 'failed') {
      setStatus('failed');
      setStatusMessage(paymentData.resultDesc || 'Payment failed. Please try again.');
      
      if (onPaymentFailed) {
        onPaymentFailed(paymentData);
      }
    }
    else if (paymentStatus === 'expired') {
      setStatus('expired');
      setStatusMessage('Payment request expired. Please try again.');
      
      if (onPaymentFailed) {
        onPaymentFailed(paymentData);
      }
    }
  }, [paymentStatusData, onPaymentSuccess, onPaymentCancelled, onPaymentFailed, queryClient]);

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
      case 'failed': return 'There was a problem processing your payment. Please try again.';
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
    <Modal show={show} onHide={onClose} centered backdrop="static">
      <Modal.Body className="pt-4">
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
        
        {initialDetails && (
          <>
            <hr />
            <h6>Transaction Details:</h6>
            <ul className="list-group list-group-flush small">
              {initialDetails.CheckoutRequestID && (
                <li className="list-group-item d-flex justify-content-between">
                  <span>Request ID:</span>
                  <span className="text-muted">{initialDetails.CheckoutRequestID}</span>
                </li>
              )}
              {initialDetails.CustomerMessage && (
                <li className="list-group-item d-flex justify-content-between">
                  <span>Message:</span>
                  <span className="text-muted">{initialDetails.CustomerMessage}</span>
                </li>
              )}
              {initialDetails.amount && (
                <li className="list-group-item d-flex justify-content-between">
                  <span>Amount:</span>
                  <span className="text-muted">KES {initialDetails.amount}</span>
                </li>
              )}
            </ul>
          </>
        )}
      </Modal.Body>
      <Modal.Footer>
        {isRetryable && onRetry && (
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
          onClick={onClose} 
          disabled={status === 'processing'}
        >
          {status === 'success' ? 'Done' : 'Close'}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default MpesaPaymentModal;
