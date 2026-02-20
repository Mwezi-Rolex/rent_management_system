const axios = require('axios');
const moment = require('moment');
const { pool } = require('../config/db');
const fs = require('fs');
const Payment = require('../models/Payment');
const Invoice = require('../models/Invoice');
const User = require('../models/User');
const Property = require('../models/Property');
const Notification = require('../models/Notification');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

// Hardcoded M-Pesa credentials from the original files
const MPESA_CREDENTIALS = {
  CONSUMER_KEY: "yTRVmGstBkVIMxYRI40m8Cni6QRLtquG6zKrGS3GXK9Wf2iH",
  CONSUMER_SECRET: "FTteALLWACVrAMn9XKqk3GV2gPFZNxjx8yZoV8A9mxLc5RJnU8DYJKpkxL5SGF6G",
  SHORTCODE: "174379",
  PASSKEY: "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919",
  CALLBACK_URL: "https://31cb-41-212-105-74.ngrok-free.app/callback" // You may need to update this with your actual callback URL
};

// Constants for payment flow
const PAYMENT_TIMEOUT_SECONDS = 120; // 2 minutes timeout for payment completion
const PAYMENT_STATUS = {
  PENDING: 'pending',
  COMPLETED: 'completed',
  FAILED: 'failed',
  EXPIRED: 'expired',
  CANCELLED: 'cancelled'
};

/**
 * Get M-Pesa API access token
 * @private
 */
async function getAccessToken() {
  try {
    const url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials";
    const auth = "Basic " + Buffer.from(MPESA_CREDENTIALS.CONSUMER_KEY + ":" + MPESA_CREDENTIALS.CONSUMER_SECRET).toString("base64");

    const response = await axios.get(url, {
      headers: {
        Authorization: auth,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
    });
    
    if (!response.data || !response.data.access_token) {
      throw new Error("Access token not found in response");
    }
    
    return response.data.access_token;
  } catch (error) {
    console.error("Error getting M-Pesa access token:", error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
      console.error("Response status:", error.response.status);
    }
    throw error;
  }
}

/**
 * @desc    Get M-Pesa access token (for testing)
 * @route   GET /api/mpesa/access-token
 * @access  Private (Admin only)
 */
exports.getAccessTokenEndpoint = async (req, res) => {
  try {
    const accessToken = await getAccessToken();
    res.status(200).json({
      success: true,
      accessToken
    });
  } catch (error) {
    console.error('Get access token error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get M-Pesa access token',
      error: error.message
    });
  }
};

/**
 * @desc    Initiate M-Pesa STK Push
 * @route   POST /api/mpesa/stkpush
 * @access  Private (Tenant only)
 */
exports.initiateStkPush = async (req, res) => {
  try {
    const { phone, amount, invoice_id } = req.body;
    
    if (!phone || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Phone number and amount are required'
      });
    }

    // Format phone number (remove leading 0 or +254)
    let formattedPhone = phone;
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.slice(1);
    } else if (formattedPhone.startsWith('+254')) {
      formattedPhone = formattedPhone.substring(1);
    }

    // Get access token
    const accessToken = await getAccessToken();
    
    // Generate timestamp and password
    const timestamp = moment().format('YYYYMMDDHHmmss');
    const password = Buffer.from(MPESA_CREDENTIALS.SHORTCODE + MPESA_CREDENTIALS.PASSKEY + timestamp).toString('base64');

    // Prepare STK push request
    const url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest";
    const auth = "Bearer " + accessToken;
    
    // Account reference (use invoice ID if provided)
    const accountReference = invoice_id ? `Invoice #${invoice_id}` : 'Rent Payment';
    const callbackUrl = invoice_id ? 
      `${MPESA_CREDENTIALS.CALLBACK_URL}?invoice_id=${invoice_id}` : 
      MPESA_CREDENTIALS.CALLBACK_URL;
    
    const response = await axios.post(
      url,
      {
        BusinessShortCode: MPESA_CREDENTIALS.SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: amount,
        PartyA: formattedPhone,
        PartyB: MPESA_CREDENTIALS.SHORTCODE,
        PhoneNumber: formattedPhone,
        CallBackURL: callbackUrl,
        AccountReference: accountReference,
        TransactionDesc: "Rent Payment via M-Pesa"
      },
      {
        headers: {
          Authorization: auth,
          "Content-Type": "application/json"
        }
      }
    );

    const checkoutRequestId = response.data.CheckoutRequestID;
    const merchantRequestId = response.data.MerchantRequestID;
    const expiryTime = new Date(Date.now() + PAYMENT_TIMEOUT_SECONDS * 1000);

    // Save transaction to database
    try {
      // Insert transaction record
      await pool.query(
        `INSERT INTO payments 
          (tenant_id, invoice_id, phone, amount, payment_method, transaction_id, checkout_request_id, merchant_request_id, status, created_at, expires_at) 
         VALUES 
          (?, ?, ?, ?, 'mpesa', ?, ?, ?, ?, ?, ?)`,
        [
          req.user.id,
          invoice_id || null,
          formattedPhone,
          amount,
          null, // transaction_id (will be updated when payment completes)
          checkoutRequestId,
          merchantRequestId,
          PAYMENT_STATUS.PENDING,
          new Date(),
          expiryTime
        ]
      );
      
      // Set a timeout to check and update payment status after the timeout period
      setTimeout(async () => {
        await handlePaymentTimeout(checkoutRequestId);
      }, PAYMENT_TIMEOUT_SECONDS * 1000);
      
    } catch (dbError) {
      console.error('Error saving payment to database:', dbError);
      // Continue even if DB insert fails
    }

    // Log the request for debugging
    console.log('STK Push initiated:', {
      CheckoutRequestID: checkoutRequestId,
      ResponseCode: response.data.ResponseCode,
      CustomerMessage: response.data.CustomerMessage,
      ExpiryTime: expiryTime
    });

    res.status(200).json({
      success: true,
      message: "Please check your phone and enter M-Pesa PIN to complete the transaction",
      data: {
        CheckoutRequestID: checkoutRequestId,
        ResponseCode: response.data.ResponseCode,
        ResponseDescription: response.data.ResponseDescription,
        CustomerMessage: response.data.CustomerMessage,
        expiryTime: expiryTime
      }
    });
  } catch (error) {
    console.error('STK Push error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initiate M-Pesa payment',
      error: error.response?.data || error.message
    });
  }
};

/**
 * Handle payment timeout - check status and update if still pending
 * @private
 */
async function handlePaymentTimeout(checkoutRequestId) {
  try {
    console.log(`Checking timeout for payment: ${checkoutRequestId}`);
    
    // Check current status in database
    const [rows] = await pool.query(
      'SELECT * FROM payments WHERE checkout_request_id = ? ORDER BY created_at DESC LIMIT 1',
      [checkoutRequestId]
    );
    
    if (!rows || rows.length === 0) {
      console.log(`No payment found with CheckoutRequestID: ${checkoutRequestId}`);
      return;
    }
    
    const payment = rows[0];
    
    // If payment is still pending, check status with M-Pesa
    if (payment.status === PAYMENT_STATUS.PENDING) {
      try {
        // Try to get status from M-Pesa
        const status = await checkMpesaTransactionStatus(checkoutRequestId);
        
        // If we got a definitive status, update with it
        if (status && status.resultCode !== undefined) {
          await updatePaymentStatus(checkoutRequestId, status);
          return;
        }
      } catch (statusError) {
        console.error(`Error checking M-Pesa status: ${statusError.message}`);
        // Continue to mark as expired if status check fails
      }
      
      // If we reach here, either the status check failed or we didn't get a definitive status
      // Mark the payment as expired
      await pool.query(
        `UPDATE payments SET status = ?, result_desc = ? WHERE checkout_request_id = ? AND status = ?`,
        [PAYMENT_STATUS.EXPIRED, 'Payment request expired', checkoutRequestId, PAYMENT_STATUS.PENDING]
      );
      
      console.log(`Payment ${checkoutRequestId} marked as expired`);
      
      // Notify user about expired payment if possible
      try {
        if (payment.tenant_id) {
          await Notification.create({
            user_id: payment.tenant_id,
            title: 'Payment Request Expired',
            message: `Your payment request of KES ${payment.amount} has expired. Please try again.`,
            type: 'payment',
            reference_id: payment.id
          });
        }
      } catch (notifyError) {
        console.error('Error creating notification:', notifyError);
      }
    }
  } catch (error) {
    console.error(`Error handling payment timeout: ${error.message}`);
  }
}

/**
 * Check M-Pesa transaction status
 * @private
 */
async function checkMpesaTransactionStatus(checkoutRequestId) {
  try {
    // Get access token
    const accessToken = await getAccessToken();
    
    // Prepare request
    const url = "https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query";
    const auth = "Bearer " + accessToken;
    
    // Generate timestamp
    const timestamp = moment().format('YYYYMMDDHHmmss');
    const password = Buffer.from(MPESA_CREDENTIALS.SHORTCODE + MPESA_CREDENTIALS.PASSKEY + timestamp).toString('base64');
    
    // Make request to M-Pesa
    const response = await axios.post(url, {
      BusinessShortCode: MPESA_CREDENTIALS.SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      CheckoutRequestID: checkoutRequestId
    }, {
      headers: {
        Authorization: auth,
        "Content-Type": "application/json"
      }
    });
    
    console.log('M-Pesa status response:', JSON.stringify(response.data));
    
    // Extract result code and description
    const resultCode = response.data.ResultCode;
    const resultDesc = response.data.ResultDesc;
    
    // Simplified status mapping
    let status = {
      resultCode,
      resultDesc,
      raw: response.data
    };
    
    return status;
  } catch (error) {
    console.error('Error checking M-Pesa status:', error);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
    throw error;
  }
}

/**
 * Update payment status based on M-Pesa response
 * @private
 */
async function updatePaymentStatus(checkoutRequestId, status) {
  try {
    let paymentStatus;
    
    // Simplified status mapping based on result code
    if (status.resultCode === 0) {
      paymentStatus = PAYMENT_STATUS.COMPLETED;
    } else {
      paymentStatus = PAYMENT_STATUS.FAILED;
    }
    
    // Update payment in database
    await pool.query(
      `UPDATE payments SET status = ?, result_code = ?, result_desc = ?, updated_at = ? 
       WHERE checkout_request_id = ? AND status = ?`,
      [paymentStatus, status.resultCode, status.resultDesc, new Date(), checkoutRequestId, PAYMENT_STATUS.PENDING]
    );
    
    console.log(`Payment ${checkoutRequestId} updated to status: ${paymentStatus}`);
    
    // Get payment details for notification
    const [rows] = await pool.query(
      'SELECT * FROM payments WHERE checkout_request_id = ? LIMIT 1',
      [checkoutRequestId]
    );
    
    // Return the updated payment status
    return paymentStatus;
  } catch (error) {
    console.error('Error updating payment status:', error);
    throw error;
  }
}

/**
 * @desc    Check STK Push transaction status
 * @route   GET /api/mpesa/status/:checkoutRequestId
 * @access  Private
 */
exports.checkTransactionStatus = async (req, res) => {
  try {
    const { checkoutRequestId } = req.params;
    
    if (!checkoutRequestId) {
      return res.status(400).json({
        success: false,
        message: 'Checkout request ID is required'
      });
    }

    // First check if we have the transaction in our database
    try {
      const [rows] = await pool.query(
        'SELECT * FROM payments WHERE checkout_request_id = ? ORDER BY created_at DESC LIMIT 1',
        [checkoutRequestId]
      );
      
      if (rows && rows.length > 0) {
        const transaction = rows[0];
        
        // If we already have a status other than 'pending', return it
        if (transaction.status !== PAYMENT_STATUS.PENDING) {
          // Determine status message based on ResultDesc and message content
          let statusMessage = 'Payment Failed. Please try again.';
          let paymentStatus = 'failed';
          
          // Check if the message indicates success despite status
          if (transaction.status === PAYMENT_STATUS.COMPLETED || 
              (transaction.result_desc && transaction.result_desc.toLowerCase().includes('processed successfully'))) {
            statusMessage = 'Payment Successful. Please proceed.';
            paymentStatus = 'success';
          } else if (transaction.result_desc && transaction.result_desc.toLowerCase().includes('cancelled by user')) {
            statusMessage = 'Request cancelled by user';
            paymentStatus = 'cancelled';
          }
          
          return res.status(200).json({
            success: true,
            data: {
              status: paymentStatus,
              statusMessage,
              resultDesc: transaction.result_desc,
              amount: transaction.amount,
              phoneNumber: transaction.phone_number,
              mpesaReceipt: transaction.mpesa_receipt,
              transactionId: transaction.transaction_id,
              completedAt: transaction.completed_at
            }
          });
        }
      }
    } catch (dbError) {
      console.log('Database query error:', dbError);
      // Continue with API call even if DB query fails
    }

    try {
      // First try to get from our database - faster response
      const [rows] = await pool.query(
        'SELECT * FROM payments WHERE checkout_request_id = ? ORDER BY created_at DESC LIMIT 1',
        [checkoutRequestId]
      );
      
      if (rows && rows.length > 0) {
        const payment = rows[0];
        
        // If we have a conclusive status already, return it immediately for faster response
        if (payment.status === PAYMENT_STATUS.COMPLETED || 
            payment.status === PAYMENT_STATUS.FAILED || 
            payment.status === PAYMENT_STATUS.CANCELLED) {
          
          // Determine status message based on ResultDesc
          let statusMessage = 'Payment Failed. Please try again.';
          
          if (payment.status === PAYMENT_STATUS.COMPLETED || 
              (payment.result_desc && payment.result_desc.toLowerCase().includes('processed successfully'))) {
            statusMessage = 'Payment Successful. Please proceed.';
          } else if (payment.result_desc && payment.result_desc.toLowerCase().includes('cancelled by user')) {
            statusMessage = 'Request cancelled by user';
          }
          
          return res.status(200).json({
            success: true,
            data: {
              status: payment.status === PAYMENT_STATUS.COMPLETED ? 'success' : 'failed',
              statusMessage,
              resultDesc: payment.result_desc,
              amount: payment.amount,
              phoneNumber: payment.phone_number,
              mpesaReceipt: payment.mpesa_receipt,
              transactionId: payment.transaction_id,
              completedAt: payment.completed_at
            }
          });
        }
      }
      
      // If we don't have a conclusive status, check with M-Pesa
      const status = await checkMpesaTransactionStatus(checkoutRequestId);
      
      // Update payment status in our database
      const paymentStatus = await updatePaymentStatus(checkoutRequestId, status);
      
      // Determine status message based on ResultDesc and message content
      let statusMessage = 'Payment Failed. Please try again.';
      let responseStatus = 'failed';
      
      // Check if the message indicates success despite status
      if (paymentStatus === PAYMENT_STATUS.COMPLETED || 
          (status.resultDesc && status.resultDesc.toLowerCase().includes('processed successfully'))) {
        statusMessage = 'Payment Successful. Please proceed.';
        responseStatus = 'success';
      } else if (status.resultDesc && status.resultDesc.toLowerCase().includes('cancelled by user')) {
        statusMessage = 'Request cancelled by user';
        responseStatus = 'cancelled';
      }
      
      // Return the simplified status to the client
      return res.status(200).json({
        success: true,
        data: {
          status: responseStatus,
          statusMessage,
          resultDesc: status.resultDesc,
          resultCode: status.resultCode
        }
      });
    } catch (statusError) {
      console.error('Error checking status with M-Pesa:', statusError);
      
      // Return pending status if we couldn't check with M-Pesa
      return res.status(200).json({
        success: true,
        data: {
          status: 'pending',
          statusMessage: 'Payment is being processed. Please wait.',
          resultDesc: 'Payment status check in progress',
          error: statusError.message
        }
      });
    }
  } catch (error) {
    console.error('Transaction status check error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to check transaction status',
      error: error.message
    });
  }
};

/**
 * @desc    M-Pesa callback handler
 * @route   POST /api/mpesa/callback
 * @access  Public
 */
exports.mpesaCallback = async (req, res) => {
  try {
    console.log('M-Pesa callback received:', JSON.stringify(req.body));
    
    // Extract data from callback
    const { Body } = req.body;
    
    if (!Body || !Body.stkCallback) {
      return res.status(400).json({ success: false, message: 'Invalid callback data' });
    }
    
    const { stkCallback } = Body;
    const { ResultCode, ResultDesc, CheckoutRequestID, MerchantRequestID } = stkCallback;
    
    // Get invoice ID from query params if provided
    const invoiceId = req.query.invoice_id;
    
    // Simplified status logic based on ResultCode
    let status;
    if (ResultCode === 0) {
      status = PAYMENT_STATUS.COMPLETED;
    } else {
      status = PAYMENT_STATUS.FAILED;
    }
    
    // Determine status message based on ResultDesc
    let statusMessage = 'Payment Failed. Please try again.';
    
    if (ResultCode === 0 || (ResultDesc && ResultDesc.toLowerCase().includes('processed successfully'))) {
      statusMessage = 'Payment Successful. Please proceed.';
    } else if (ResultDesc && ResultDesc.toLowerCase().includes('cancelled by user')) {
      statusMessage = 'Payment Failed. Request cancelled by user.';
    }
    
    // Extract payment details if successful
    let mpesaReceipt = null;
    let transactionDate = null;
    let phoneNumber = null;
    
    if (ResultCode === 0 && stkCallback.CallbackMetadata && stkCallback.CallbackMetadata.Item) {
      const items = stkCallback.CallbackMetadata.Item;
      
      for (const item of items) {
        if (item.Name === 'MpesaReceiptNumber') mpesaReceipt = item.Value;
        if (item.Name === 'TransactionDate') transactionDate = item.Value;
        if (item.Name === 'PhoneNumber') phoneNumber = item.Value;
      }
    }
    
    // Send response immediately to M-PESA first for faster processing
    // This prevents timeouts and allows the payment status to reflect quicker
    res.status(200).json({ ResultCode: 0, ResultDesc: 'Success' });
    
    // Update payment record in database (this now executes after response is sent)
    try {
      // First get the payment details to retrieve tenant ID for notification
      const [payments] = await pool.query(
        'SELECT * FROM payments WHERE checkout_request_id = ? ORDER BY created_at DESC LIMIT 1',
        [CheckoutRequestID]
      );
      
      const payment = payments.length > 0 ? payments[0] : null;
      const tenantId = payment ? payment.tenant_id : null;
      
      // Update the payment record
      await pool.query(
        `UPDATE payments SET 
          status = ?, 
          result_code = ?, 
          result_desc = ?, 
          status_message = ?,
          mpesa_receipt = ?, 
          transaction_id = ?,
          completed_at = ? 
        WHERE checkout_request_id = ?`,
        [
          status,
          ResultCode,
          ResultDesc,
          statusMessage,
          mpesaReceipt,
          mpesaReceipt, // Use M-Pesa receipt as transaction ID
          new Date(),
          CheckoutRequestID
        ]
      );
      
      // If payment was successful and invoice ID was provided, update invoice status
      if (status === PAYMENT_STATUS.COMPLETED && invoiceId) {
        try {
          await pool.query(
            'UPDATE invoices SET status = "paid", paid_date = ? WHERE id = ?',
            [new Date(), invoiceId]
          );
        } catch (invoiceError) {
          console.error('Error updating invoice status:', invoiceError);
        }
      }
      
      // Send notification to tenant if we have tenant ID
      if (tenantId) {
        let notificationTitle, notificationMessage;
        
        if (status === PAYMENT_STATUS.COMPLETED) {
          notificationTitle = 'Payment Successful';
          notificationMessage = `Your payment of KES ${payment.amount} was successful.`;
        } else if (status === PAYMENT_STATUS.CANCELLED) {
          notificationTitle = 'Payment Cancelled';
          notificationMessage = `Your payment of KES ${payment.amount} was cancelled.`;
        } else if (status === PAYMENT_STATUS.FAILED) {
          notificationTitle = 'Payment Failed';
          notificationMessage = `Your payment of KES ${payment.amount} failed: ${ResultDesc}`;
        }
        
        await Notification.create({
          user_id: tenantId,
          title: notificationTitle,
          message: notificationMessage,
          type: 'payment',
          reference_id: payment.id
        });
      }
      
    } catch (dbError) {
      console.error('Database error in callback:', dbError);
    }
    
  } catch (error) {
    console.error('M-Pesa callback error:', error);
    // Always return 200 to Safaricom even if there's an error
    res.status(200).json({ ResultCode: 0, ResultDesc: 'Success' });
  }
};

// M-Pesa Daraja API credentials
const consumerKey = "yTRVmGstBkVIMxYRI40m8Cni6QRLtquG6zKrGS3GXK9Wf2iH";
const consumerSecret = "FTteALLWACVrAMn9XKqk3GV2gPFZNxjx8yZoV8A9mxLc5RJnU8DYJKpkxL5SGF6G";
const shortCode = '174379'; // Your M-Pesa shortcode
const passkey = "bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919";
const callbackUrl = "https://31cb-41-212-105-74.ngrok-free.app/callback"; // Replace with your actual callback URL

// Get OAuth Token
const getOAuthToken = async () => {
  try {
    const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
    const response = await axios.get('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
      headers: {
        'Authorization': `Basic ${auth}`
      }
    });
    return response.data.access_token;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw error;
  }
};

// Initiate STK Push
exports.stkPush = async (req, res) => {
  try {
    const { phone, amount, invoice_id } = req.body;
    
    if (!phone || !amount) {
      return res.status(400).json({ success: false, message: 'Phone number and amount are required' });
    }
    
    // Format phone number (remove leading 0 and add country code if needed)
    let formattedPhone = phone;
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith('254')) {
      formattedPhone = '254' + formattedPhone;
    }
    
    // Get access token
    const accessToken = await getOAuthToken();
    
    // Generate timestamp
    const timestamp = moment().format('YYYYMMDDHHmmss');
    const password = Buffer.from(`${shortCode}${passkey}${timestamp}`).toString('base64');
    
    // Generate a unique transaction reference
    const transactionRef = `RMS-${invoice_id || Math.floor(Math.random() * 1000000)}`;
    
    // Prepare STK Push request
    const stkPushUrl = 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';
    const stkPushData = {
      BusinessShortCode: shortCode,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: amount,
      PartyA: formattedPhone,
      PartyB: shortCode,
      PhoneNumber: formattedPhone,
      CallBackURL: callbackUrl,
      AccountReference: transactionRef,
      TransactionDesc: `Rent Payment for ${invoice_id || 'property'}`
    };
    
    // Make STK Push request
    const stkResponse = await axios.post(stkPushUrl, stkPushData, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    // Save transaction details to database
    const transaction = {
      user_id: req.user ? req.user.id : null,
      phone: formattedPhone,
      amount: amount,
      reference: transactionRef,
      invoice_id: invoice_id || null,
      checkout_request_id: stkResponse.data.CheckoutRequestID,
      merchant_request_id: stkResponse.data.MerchantRequestID,
      status: 'pending',
      created_at: new Date()
    };
    
    // Insert transaction into database
    const [result] = await pool.query(
      'INSERT INTO payments (user_id, phone, amount, reference, invoice_id, checkout_request_id, merchant_request_id, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        transaction.user_id,
        transaction.phone,
        transaction.amount,
        transaction.reference,
        transaction.invoice_id,
        transaction.checkout_request_id,
        transaction.merchant_request_id,
        transaction.status,
        transaction.created_at
      ]
    );
    
    // Return success response with transaction details
    return res.json({
      success: true,
      message: 'STK Push sent successfully',
      data: {
        ...stkResponse.data,
        transactionId: result.insertId,
        reference: transactionRef
      }
    });
    
  } catch (error) {
    console.error('STK Push error:', error.response?.data || error.message);
    return res.status(500).json({
      success: false,
      message: 'Failed to initiate payment',
      error: error.response?.data || error.message
    });
  }
};

// Handle M-Pesa callback
exports.callback = async (req, res) => {
  try {
    console.log('M-Pesa Callback received:', JSON.stringify(req.body));
    
    // Extract callback data
    const callbackData = req.body.Body.stkCallback;
    const resultCode = callbackData.ResultCode;
    const resultDesc = callbackData.ResultDesc;
    const checkoutRequestID = callbackData.CheckoutRequestID;
    const merchantRequestID = callbackData.MerchantRequestID;
    
    // Determine transaction status based on result code
    let status = 'unknown';
    if (resultCode === 0) {
      status = 'completed';
    } else if (resultCode === 1032) {
      status = 'cancelled';
    } else {
      status = 'failed';
    }
    
    // Extract transaction details if available
    let amount = null;
    let phoneNumber = null;
    let transactionDate = null;
    let mpesaReceiptNumber = null;
    
    if (resultCode === 0 && callbackData.CallbackMetadata && callbackData.CallbackMetadata.Item) {
      const items = callbackData.CallbackMetadata.Item;
      
      // Extract metadata items
      for (const item of items) {
        if (item.Name === 'Amount') amount = item.Value;
        if (item.Name === 'PhoneNumber') phoneNumber = item.Value;
        if (item.Name === 'TransactionDate') transactionDate = item.Value;
        if (item.Name === 'MpesaReceiptNumber') mpesaReceiptNumber = item.Value;
      }
    }
    
    // Update transaction in database
    await pool.query(
      `UPDATE payments SET 
        status = ?, 
        result_code = ?, 
        result_desc = ?,
        mpesa_receipt = ?,
        completed_at = ?
      WHERE checkout_request_id = ?`,
      [
        status,
        resultCode,
        resultDesc,
        mpesaReceiptNumber || null,
        new Date(),
        checkoutRequestID
      ]
    );
    
    // Return success response
    return res.status(200).json({ success: true });
    
  } catch (error) {
    console.error('M-Pesa Callback error:', error);
    // Always return 200 to Safaricom even if there's an error
    return res.status(200).json({ success: true });
  }
};

// Check transaction status
exports.checkStatus = async (req, res) => {
  try {
    const { checkoutRequestId } = req.params;
    
    if (!checkoutRequestId) {
      return res.status(400).json({ success: false, message: 'Checkout Request ID is required' });
    }
    
    // Query database for transaction status
    const [transactions] = await pool.query(
      'SELECT * FROM payments WHERE checkout_request_id = ? ORDER BY created_at DESC LIMIT 1',
      [checkoutRequestId]
    );
    
    if (transactions.length === 0) {
      return res.status(404).json({ success: false, message: 'Transaction not found' });
    }
    
    const transaction = transactions[0];
    
    // Return transaction details
    return res.json({
      success: true,
      data: {
        status: transaction.status,
        resultCode: transaction.result_code,
        resultDesc: transaction.result_desc,
        amount: transaction.amount,
        reference: transaction.reference,
        mpesaReceipt: transaction.mpesa_receipt,
        completedAt: transaction.completed_at
      }
    });
    
  } catch (error) {
    console.error('Check status error:', error);
    return res.status(500).json({ success: false, message: 'Failed to check transaction status' });
  }
};

// Get user transactions
exports.getUserTransactions = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Query database for user transactions
    const [transactions] = await pool.query(
      'SELECT * FROM payments WHERE user_id = ? ORDER BY created_at DESC',
      [userId]
    );
    
    // Return transactions
    return res.json({
      success: true,
      data: transactions
    });
    
  } catch (error) {
    console.error('Get user transactions error:', error);
    return res.status(500).json({ success: false, message: 'Failed to get transactions' });
  }
};

/**
 * @desc    Retry a failed or expired payment
 * @route   POST /api/mpesa/retry/:paymentId
 * @access  Private (Tenant only)
 */
exports.retryPayment = async (req, res) => {
  try {
    const { paymentId } = req.params;
    
    // Validate payment ID
    if (!paymentId) {
      return res.status(400).json({
        success: false,
        message: 'Payment ID is required'
      });
    }
    
    // Get payment details
    const [rows] = await pool.query(
      'SELECT * FROM payments WHERE id = ? LIMIT 1',
      [paymentId]
    );
    
    if (!rows || rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }
    
    const payment = rows[0];
    
    // Check if payment belongs to the current user
    if (payment.tenant_id !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to retry this payment'
      });
    }
    
    // Check if payment can be retried (only failed, expired, or cancelled payments)
    const retryableStatuses = [PAYMENT_STATUS.FAILED, PAYMENT_STATUS.EXPIRED, PAYMENT_STATUS.CANCELLED];
    if (!retryableStatuses.includes(payment.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot retry payment with status: ${payment.status}`
      });
    }
    
    // Create a new payment request
    // Use the original payment details but create a new request
    const paymentData = {
      phone: payment.phone,
      amount: payment.amount,
      invoice_id: payment.invoice_id
    };
    
    // Format phone number (remove leading 0 or +254)
    let formattedPhone = paymentData.phone;
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.slice(1);
    } else if (formattedPhone.startsWith('+254')) {
      formattedPhone = formattedPhone.substring(1);
    }

    // Get access token
    const accessToken = await getAccessToken();
    
    // Generate timestamp and password
    const timestamp = moment().format('YYYYMMDDHHmmss');
    const password = Buffer.from(MPESA_CREDENTIALS.SHORTCODE + MPESA_CREDENTIALS.PASSKEY + timestamp).toString('base64');

    // Prepare STK push request
    const url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest";
    const auth = "Bearer " + accessToken;
    
    // Account reference (use invoice ID if provided)
    const accountReference = paymentData.invoice_id ? `Invoice #${paymentData.invoice_id}` : 'Rent Payment';
    const callbackUrl = paymentData.invoice_id ? 
      `${MPESA_CREDENTIALS.CALLBACK_URL}?invoice_id=${paymentData.invoice_id}` : 
      MPESA_CREDENTIALS.CALLBACK_URL;
    
    const response = await axios.post(
      url,
      {
        BusinessShortCode: MPESA_CREDENTIALS.SHORTCODE,
        Password: password,
        Timestamp: timestamp,
        TransactionType: "CustomerPayBillOnline",
        Amount: paymentData.amount,
        PartyA: formattedPhone,
        PartyB: MPESA_CREDENTIALS.SHORTCODE,
        PhoneNumber: formattedPhone,
        CallBackURL: callbackUrl,
        AccountReference: accountReference,
        TransactionDesc: "Retry: Rent Payment via M-Pesa"
      },
      {
        headers: {
          Authorization: auth,
          "Content-Type": "application/json"
        }
      }
    );

    const checkoutRequestId = response.data.CheckoutRequestID;
    const merchantRequestId = response.data.MerchantRequestID;
    const expiryTime = new Date(Date.now() + PAYMENT_TIMEOUT_SECONDS * 1000);

    // Save transaction to database
    try {
      // Insert transaction record
      await pool.query(
        `INSERT INTO payments 
          (tenant_id, invoice_id, phone, amount, payment_method, transaction_id, checkout_request_id, merchant_request_id, status, created_at, expires_at, retry_of) 
         VALUES 
          (?, ?, ?, ?, 'mpesa', ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user.id,
          paymentData.invoice_id || null,
          formattedPhone,
          paymentData.amount,
          null, // transaction_id (will be updated when payment completes)
          checkoutRequestId,
          merchantRequestId,
          PAYMENT_STATUS.PENDING,
          new Date(),
          expiryTime,
          payment.id // Link to the original payment being retried
        ]
      );
      
      // Set a timeout to check and update payment status after the timeout period
      setTimeout(async () => {
        await handlePaymentTimeout(checkoutRequestId);
      }, PAYMENT_TIMEOUT_SECONDS * 1000);
      
    } catch (dbError) {
      console.error('Error saving payment to database:', dbError);
      // Continue even if DB insert fails
    }

    // Log the request for debugging
    console.log('STK Push retry initiated:', {
      CheckoutRequestID: checkoutRequestId,
      ResponseCode: response.data.ResponseCode,
      CustomerMessage: response.data.CustomerMessage,
      ExpiryTime: expiryTime,
      OriginalPaymentId: payment.id
    });

    res.status(200).json({
      success: true,
      message: "Please check your phone and enter M-Pesa PIN to complete the transaction",
      data: {
        CheckoutRequestID: checkoutRequestId,
        ResponseCode: response.data.ResponseCode,
        ResponseDescription: response.data.ResponseDescription,
        CustomerMessage: response.data.CustomerMessage,
        expiryTime: expiryTime
      }
    });
  } catch (error) {
    console.error('Payment retry error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retry payment',
      error: error.response?.data || error.message
    });
  }
}; 