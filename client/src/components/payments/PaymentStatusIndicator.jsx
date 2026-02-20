import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert } from 'react-bootstrap';
import api from '../../utils/api';
import styled from 'styled-components';

const StatusContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.5rem;
  border-radius: 8px;
  background-color: #f9f9f9;
  margin-bottom: 1rem;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
`;

const StatusMessage = styled.div`
  font-size: 1.2rem;
  font-weight: 700;
  margin-bottom: 1rem;
  text-align: center;
  padding: 1rem 1.5rem;
  border-radius: 4px;
  width: 100%;
`;

const StatusDetails = styled.div`
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 0.5rem;
  text-align: center;
`;

const TransactionDetails = styled.div`
  width: 100%;
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid #eee;
`;

const DetailRow = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  
  & > span:first-child {
    color: #666;
  }
  
  & > span:last-child {
    font-weight: 600;
  }
`;

/**
 * A component that shows payment status with text-only messages
 * No icons, images, or spinners - just plain text
 */
const PaymentStatusIndicator = ({ 
  transactionId, 
  onStatusChange,
  showDetails = true
}) => {
  // Query for payment status using the appropriate endpoint
  const { data, isLoading, error } = useQuery({
    queryKey: ['paymentStatus', transactionId],
    queryFn: async () => {
      if (!transactionId) return null;
      
      try {
        // Try both endpoints to ensure we get the status
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
        throw error;
      }
    },
    enabled: !!transactionId,
    refetchInterval: (data) => {
      // Stop polling when we have a conclusive status
      if (!data?.success || !data?.data) return 3000; // Poll every 3 seconds by default
      
      const status = data.data.status;
      
      if (status === 'success' || status === 'failed') {
        return false; // Stop polling
      }
      
      return 3000; // Continue polling every 3 seconds
    },
    refetchOnWindowFocus: true,
    onSuccess: (data) => {
      if (data?.success && data?.data && onStatusChange) {
        onStatusChange(data.data);
      }
    },
    retry: 3
  });

  if (isLoading) {
    return (
      <StatusContainer>
        <StatusMessage style={{ backgroundColor: '#f8f9fa' }}>
          Checking payment status...
        </StatusMessage>
      </StatusContainer>
    );
  }

  if (error) {
    return (
      <Alert variant="danger">
        Error checking payment status. Please try again.
      </Alert>
    );
  }

  if (!data || !data.success || !data.data) {
    return null;
  }

  const { status, statusMessage, resultDesc, amount, phoneNumber, mpesaReceipt } = data.data;
  
  // Determine status based on message content
  let displayStatus = status;
  let displayMessage = statusMessage || resultDesc || '';
  
  // Check if the message indicates success despite status being "failed"
  if (displayMessage.toLowerCase().includes('processed successfully')) {
    displayStatus = 'success';
  } else if (displayMessage.toLowerCase().includes('cancelled by user')) {
    displayStatus = 'cancelled';
  }
  
  // Determine color based on status
  let backgroundColor, textColor;
  
  if (displayStatus === 'success' || displayStatus === 'completed') {
    backgroundColor = '#d4edda'; // Light green background
    textColor = '#155724'; // Dark green text
  } else if (displayStatus === 'cancelled') {
    backgroundColor = '#f8d7da'; // Light red background
    textColor = '#721c24'; // Dark red text
  } else if (displayStatus === 'failed') {
    backgroundColor = '#f8d7da'; // Light red background
    textColor = '#721c24'; // Dark red text
  } else if (displayStatus === 'pending') {
    backgroundColor = '#fff3cd'; // Light yellow background
    textColor = '#856404'; // Dark yellow text
  }

  // Generate appropriate status title based on the actual message
  const getStatusTitle = () => {
    if (displayStatus === 'success' || displayStatus === 'completed') {
      return 'Payment Successful';
    } else if (displayStatus === 'cancelled') {
      return 'Payment Cancelled';
    } else if (displayStatus === 'failed') {
      return 'Payment Failed';
    } else {
      return 'Processing Payment';
    }
  };

  return (
    <StatusContainer>
      <StatusMessage style={{ backgroundColor, color: textColor }}>
        {getStatusTitle()}
      </StatusMessage>
      
      {/* Only show the message if it's not redundant with the title */}
      {displayMessage && !displayMessage.includes(getStatusTitle()) && (
        <StatusDetails>
          {displayMessage}
        </StatusDetails>
      )}
      
      {showDetails && (
        <TransactionDetails>
          {amount && (
            <DetailRow>
              <span>Amount</span>
              <span>KES {amount}</span>
            </DetailRow>
          )}
          
          {phoneNumber && (
            <DetailRow>
              <span>Phone Number</span>
              <span>{phoneNumber}</span>
            </DetailRow>
          )}
          
          {mpesaReceipt && (
            <DetailRow>
              <span>M-Pesa Receipt</span>
              <span>{mpesaReceipt}</span>
            </DetailRow>
          )}
          
          {transactionId && (
            <DetailRow>
              <span>Reference</span>
              <span>{transactionId}</span>
            </DetailRow>
          )}
        </TransactionDetails>
      )}
    </StatusContainer>
  );
};

export default PaymentStatusIndicator;
