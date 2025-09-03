import { useState, useEffect, useRef } from 'react';
import { Device, Call } from '@twilio/voice-sdk';

type CallStatus = 'idle' | 'connecting' | 'in-call' | 'call-ended' | 'error';

export default function Home() {
  const [callStatus, setCallStatus] = useState<CallStatus>('idle');
  const [statusMessage, setStatusMessage] = useState<string>('Enter Twilio credentials to start');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [callDuration, setCallDuration] = useState<number>(0);
  
  // Twilio credentials state
  const [accountSid, setAccountSid] = useState<string>('');
  const [apiKey, setApiKey] = useState<string>('');
  const [apiSecret, setApiSecret] = useState<string>('');
  const [appSid, setAppSid] = useState<string>('');
  const [isConfigured, setIsConfigured] = useState<boolean>(false);
  const [showConfigForm, setShowConfigForm] = useState<boolean>(false);
  
  const deviceRef = useRef<Device | null>(null);
  const currentCallRef = useRef<Call | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load credentials from localStorage on component mount
  useEffect(() => {
    const savedCredentials = localStorage.getItem('twilioCredentials');
    if (savedCredentials) {
      try {
        const credentials = JSON.parse(savedCredentials);
        console.log('Loaded credentials from localStorage:', { 
          accountSid: credentials.accountSid || 'undefined',
          apiKey: credentials.apiKey || 'undefined', 
          apiSecret: credentials.apiSecret ? '***' : 'undefined', 
          appSid: credentials.appSid || 'undefined'
        });
        
        setAccountSid(credentials.accountSid || '');
        setApiKey(credentials.apiKey || '');
        setApiSecret(credentials.apiSecret || '');
        setAppSid(credentials.appSid || '');
        
        // If all credentials are present and valid, mark as configured
        if (credentials.accountSid && credentials.apiKey && credentials.apiSecret && credentials.appSid) {
          // Check if credentials are not placeholder values
          if (credentials.accountSid === '***' || credentials.apiKey === '***' || credentials.appSid === '***') {
            console.log('Detected placeholder credentials, clearing them');
            clearInvalidCredentials();
            return;
          }
          
          setIsConfigured(true);
          setStatusMessage('Ready to call');
          // Don't call initializeDevice here - wait for user to click Configure
        } else {
          // Show form if credentials are incomplete
          setShowConfigForm(true);
        }
      } catch (error) {
        console.error('Error loading saved credentials:', error);
        localStorage.removeItem('twilioCredentials');
        setShowConfigForm(true);
      }
    } else {
      // No saved credentials, show form
      setShowConfigForm(true);
    }
  }, []);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      if (deviceRef.current) {
        deviceRef.current.destroy();
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  const saveCredentialsToStorage = () => {
    const credentials = {
      accountSid,
      apiKey,
      apiSecret,
      appSid
    };
    localStorage.setItem('twilioCredentials', JSON.stringify(credentials));
  };

  const clearCredentialsFromStorage = () => {
    localStorage.removeItem('twilioCredentials');
  };

  const areCredentialsComplete = () => {
    const hasAllFields = accountSid?.trim() && apiKey?.trim() && apiSecret?.trim() && appSid?.trim();
    
    if (!hasAllFields) return false;
    
    // Basic format validation for Twilio credentials
    const isValidAccountSid = accountSid.trim().startsWith('AC') && accountSid.trim().length > 20;
    const isValidApiKey = apiKey.trim().startsWith('SK') && apiKey.trim().length > 20;
    const isValidAppSid = appSid.trim().startsWith('AP') && appSid.trim().length > 20;
    
    return isValidAccountSid && isValidApiKey && isValidAppSid;
  };

  const clearInvalidCredentials = () => {
    console.log('Clearing invalid credentials from localStorage');
    localStorage.removeItem('twilioCredentials');
    setAccountSid('');
    setApiKey('');
    setApiSecret('');
    setAppSid('');
    setIsConfigured(false);
    setShowConfigForm(true);
    setStatusMessage('Please enter valid Twilio credentials');
  };

  const initializeDevice = async () => {
    // Validate credentials before proceeding
    if (!areCredentialsComplete()) {
      setStatusMessage('Missing Twilio credentials. Please configure first.');
      setCallStatus('error');
      return;
    }

    // Prevent multiple initializations
    if (deviceRef.current) {
      console.log('Device already initialized, destroying previous instance');
      deviceRef.current.destroy();
      deviceRef.current = null;
    }

    try {
      setIsLoading(true);
      setStatusMessage('Initializing Twilio Device...');
      
      // Get access token from our API with credentials
      console.log('Getting access token with validated credentials');
      
      const response = await fetch('/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountSid,
          apiKey,
          apiSecret,
          appSid
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error Response:', errorData);
        throw new Error(errorData.error || `Failed to get access token: ${response.status} ${response.statusText}`);
      }

      const responseData = await response.json();
      console.log('API Response received:', { token: responseData.token ? '***' : 'undefined', identity: responseData.identity });
      
      if (!responseData.token) {
        throw new Error('No token received from API');
      }
      
      const { token } = responseData;
      
      // Initialize the Twilio Device
      const device = new Device(token, {
        logLevel: 1, // Enable debug logging
        codecPreferences: ['opus' as any, 'pcmu' as any],
      });

      // Set up device event listeners
      device.on('registered', () => {
        console.log('Twilio Device registered');
        setStatusMessage('Device ready - Click to call agent');
        setIsLoading(false);
        setCallStatus('idle'); // Ensure call status is reset
      });

      device.on('error', (error) => {
        console.error('Twilio Device error:', error);
        setCallStatus('error');
        setStatusMessage(`Device error: ${error.message}`);
        setIsLoading(false);
      });

      device.on('incoming', (call) => {
        console.log('Incoming call received');
        // Handle incoming calls if needed
      });

      // Register the device
      await device.register();
      deviceRef.current = device;

    } catch (error) {
      console.error('Error initializing device:', error);
      setCallStatus('error');
      setStatusMessage(`Failed to initialize device: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsLoading(false);
    }
  };

  const handleConfigure = async () => {
    if (!areCredentialsComplete()) {
      setStatusMessage('Please fill in all Twilio credentials');
      return;
    }
    
    console.log('Configuring with credentials:', { 
      accountSid: accountSid || 'undefined',
      apiKey: apiKey || 'undefined', 
      apiSecret: apiSecret ? '***' : 'undefined', 
      appSid: appSid || 'undefined'
    });
    
    // Test credentials first before saving
    setIsLoading(true);
    setStatusMessage('Testing credentials...');
    
    try {
      const response = await fetch('/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountSid,
          apiKey,
          apiSecret,
          appSid
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to test credentials: ${response.status}`);
      }

      // Credentials are valid, save them
      saveCredentialsToStorage();
      setIsConfigured(true);
      setShowConfigForm(false);
      setStatusMessage('Credentials validated! Ready to call');
      
      // Initialize device
      initializeDevice();
      
    } catch (error) {
      console.error('Credential validation failed:', error);
      setStatusMessage(`Credential validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsLoading(false);
    }
  };

  const resetConfiguration = () => {
    setIsConfigured(false);
    setCallStatus('idle');
    setStatusMessage('Enter Twilio credentials to start');
    setShowConfigForm(true);
    
    // Clear credentials from state and localStorage
    setAccountSid('');
    setApiKey('');
    setApiSecret('');
    setAppSid('');
    clearCredentialsFromStorage();
    
    if (deviceRef.current) {
      deviceRef.current.destroy();
      deviceRef.current = null;
    }
  };

  const updateCredentials = () => {
    setShowConfigForm(true);
  };

  const makeCall = async () => {
    if (!deviceRef.current) {
      setStatusMessage('Device not initialized');
      return;
    }

    try {
      setCallStatus('connecting');
      setStatusMessage('Connecting...');

      // Make the call - the TwiML app will handle dialing the bot number
      const call = await deviceRef.current.connect({
        params: {
          // Your purchased German number as caller ID so bot knows who's calling
          callerId: '+4981424634018'
        }
      });

      currentCallRef.current = call;

      // Set up call event listeners
      call.on('accept', () => {
        console.log('Call accepted');
        setCallStatus('in-call');
        setStatusMessage('In call with agent');
        setCallDuration(0);
        
        // Start timer
        timerRef.current = setInterval(() => {
          setCallDuration(prev => prev + 1);
        }, 1000);
      });

      call.on('disconnect', () => {
        console.log('Call disconnected');
        setCallStatus('call-ended');
        setStatusMessage('Call ended');
        currentCallRef.current = null;
        
        // Stop timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        
        // Reset to ready state after 3 seconds
        setTimeout(() => {
          setCallStatus('idle');
          setStatusMessage('Ready to call');
          setCallDuration(0);
        }, 3000);
      });

      call.on('cancel', () => {
        console.log('Call cancelled');
        setCallStatus('call-ended');
        setStatusMessage('Call cancelled');
        currentCallRef.current = null;
        
        // Stop timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        
        setTimeout(() => {
          setCallStatus('idle');
          setStatusMessage('Ready to call');
          setCallDuration(0);
        }, 3000);
      });

      call.on('reject', () => {
        console.log('Call rejected');
        setCallStatus('call-ended');
        setStatusMessage('Call rejected');
        currentCallRef.current = null;
        
        // Stop timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        
        setTimeout(() => {
          setCallStatus('idle');
          setStatusMessage('Ready to call');
          setCallDuration(0);
        }, 3000);
      });

      call.on('error', (error) => {
        console.error('Call error:', error);
        setCallStatus('error');
        setStatusMessage(`Call error: ${error.message}`);
        currentCallRef.current = null;
        
        // Stop timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
        
        setTimeout(() => {
          setCallStatus('idle');
          setStatusMessage('Ready to call');
          setCallDuration(0);
        }, 3000);
      });

    } catch (error) {
      console.error('Error making call:', error);
      setCallStatus('error');
      setStatusMessage('Failed to make call');
      
      setTimeout(() => {
        setCallStatus('idle');
        setStatusMessage('Ready to call');
      }, 3000);
    }
  };

  const hangupCall = () => {
    if (currentCallRef.current) {
      currentCallRef.current.disconnect();
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = () => {
    switch (callStatus) {
      case 'connecting':
        return 'text-yellow-600';
      case 'in-call':
        return 'text-green-600';
      case 'call-ended':
        return 'text-blue-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getButtonText = () => {
    if (!isConfigured) {
      return 'Configure Twilio First';
    }
    
    switch (callStatus) {
      case 'connecting':
        return 'Connecting...';
      case 'in-call':
        return 'Hang Up';
      case 'call-ended':
        return 'Call Ended';
      default:
        return 'Call Agent';
    }
  };

  const isButtonDisabled = () => {
    return isLoading || callStatus === 'connecting' || callStatus === 'call-ended' || !isConfigured || !areCredentialsComplete();
  };

  const handleButtonClick = () => {
    if (callStatus === 'in-call') {
      hangupCall();
    } else if (callStatus === 'idle' && isConfigured) {
      makeCall();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
        <div className="text-center">
          {/* Header with Icon */}
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full mb-4">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Twilio Voice Client
            </h1>
          </div>

          {/* Configuration Toggle Button */}
          <div className="mb-8">
            <button
              onClick={() => setShowConfigForm(!showConfigForm)}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-xl hover:from-gray-700 hover:to-gray-800 focus:outline-none focus:ring-4 focus:ring-gray-300 focus:ring-opacity-50 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              {showConfigForm ? 'Hide Configuration' : 'Show Configuration'}
            </button>
          </div>

          {/* Twilio Credentials Input */}
          {showConfigForm && (
            <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 rounded-2xl border border-blue-100">
              <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center justify-center">
                <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Configure Twilio
              </h2>
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> You need valid Twilio credentials. Account SID starts with "AC", API Key starts with "SK", and Application SID starts with "AP".
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="accountSid" className="block text-sm font-semibold text-gray-700 mb-2">
                    Account SID
                  </label>
                  <input
                    type="text"
                    id="accountSid"
                    value={accountSid}
                    onChange={(e) => setAccountSid(e.target.value)}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-4 transition-all duration-200 bg-white ${
                      accountSid && !accountSid.trim().startsWith('AC') 
                        ? 'border-red-300 focus:ring-red-300 focus:border-red-500' 
                        : 'border-gray-200 focus:ring-blue-300 focus:border-blue-500'
                    }`}
                    placeholder="Enter Account SID (starts with AC)"
                  />
                  {accountSid && !accountSid.trim().startsWith('AC') && (
                    <p className="text-xs text-red-600 mt-1">Account SID should start with "AC"</p>
                  )}
                </div>
                <div>
                  <label htmlFor="apiKey" className="block text-sm font-semibold text-gray-700 mb-2">
                    API Key
                  </label>
                  <input
                    type="text"
                    id="apiKey"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-4 transition-all duration-200 bg-white ${
                      apiKey && !apiKey.trim().startsWith('SK') 
                        ? 'border-red-300 focus:ring-red-300 focus:border-red-500' 
                        : 'border-gray-200 focus:ring-blue-300 focus:border-blue-500'
                    }`}
                    placeholder="Enter API Key (starts with SK)"
                  />
                  {apiKey && !apiKey.trim().startsWith('SK') && (
                    <p className="text-xs text-red-600 mt-1">API Key should start with "SK"</p>
                  )}
                </div>
                <div>
                  <label htmlFor="apiSecret" className="block text-sm font-semibold text-gray-700 mb-2">
                    API Secret
                  </label>
                  <input
                    type="password"
                    id="apiSecret"
                    value={apiSecret}
                    onChange={(e) => setApiSecret(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-4 focus:ring-blue-300 focus:border-blue-500 transition-all duration-200 bg-white"
                    placeholder="Enter API Secret"
                  />
                </div>
                <div>
                  <label htmlFor="appSid" className="block text-sm font-semibold text-gray-700 mb-2">
                    Application SID
                  </label>
                  <input
                    type="text"
                    id="appSid"
                    value={appSid}
                    onChange={(e) => setAppSid(e.target.value)}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none focus:ring-4 transition-all duration-200 bg-white ${
                      appSid && !appSid.trim().startsWith('AP') 
                        ? 'border-red-300 focus:ring-red-300 focus:border-red-500' 
                        : 'border-gray-200 focus:ring-blue-300 focus:border-blue-500'
                    }`}
                    placeholder="Enter Application SID (starts with AP)"
                  />
                  {appSid && !appSid.trim().startsWith('AP') && (
                    <p className="text-xs text-red-600 mt-1">Application SID should start with "AP"</p>
                  )}
                </div>
              </div>
              <button
                onClick={handleConfigure}
                disabled={isLoading || !accountSid || !apiKey || !apiSecret || !appSid}
                className="mt-6 w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-blue-300 focus:ring-opacity-50 transition-all duration-200 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Configuring...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Configure Twilio
                  </div>
                )}
              </button>
            </div>
          )}

          {/* Status Display */}
          <div className="mb-8 p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border border-gray-200">
            <div className="flex items-center justify-center mb-4">
              <div className={`w-4 h-4 rounded-full mr-3 ${
                callStatus === 'idle' ? 'bg-gray-400' :
                callStatus === 'connecting' ? 'bg-yellow-400 animate-pulse' :
                callStatus === 'in-call' ? 'bg-green-400' :
                callStatus === 'call-ended' ? 'bg-blue-400' :
                'bg-red-400'
              }`}></div>
              <span className={`font-semibold text-lg ${getStatusColor()}`}>
                {statusMessage}
              </span>
            </div>
            
            {/* Call Timer */}
            {callStatus === 'in-call' && (
              <div className="text-center">
                <div className="text-3xl font-mono font-bold text-green-600 mb-2">
                  {formatTime(callDuration)}
                </div>
                <div className="text-sm text-gray-600 font-medium">Call Duration</div>
              </div>
            )}
            
            {isLoading && (
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            )}
          </div>

          {/* Call Button */}
          <button
            onClick={handleButtonClick}
            disabled={isButtonDisabled()}
            className={`w-full py-5 px-6 rounded-xl font-bold text-white transition-all duration-200 text-lg shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:transform-none ${
              isButtonDisabled()
                ? 'bg-gray-400 cursor-not-allowed shadow-none'
                : callStatus === 'in-call'
                ? 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 active:from-red-700 active:to-red-800'
                : 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 active:from-green-700 active:to-green-800'
            }`}
          >
            <div className="flex items-center justify-center">
              {callStatus === 'in-call' ? (
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M5 3a2 2 0 00-2 2v1c0 8.284 6.716 15 15 15h1a2 2 0 002-2v-3.28a1 1 0 00-.684-.948l-4.493-1.498a1 1 0 00-1.21.502l-1.13 2.257a11.042 11.042 0 01-5.516-5.517l2.257-1.128a1 1 0 00.502-1.21L9.228 3.683A1 1 0 008.28 3H5z" />
                </svg>
              ) : (
                <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              )}
              {getButtonText()}
            </div>
          </button>

          {/* Configuration Buttons */}
          {isConfigured && (
            <div className="mt-6 space-y-3">
              <button
                onClick={updateCredentials}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-4 focus:ring-blue-300 focus:ring-opacity-50 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Update Credentials
                </div>
              </button>
              <button
                onClick={resetConfiguration}
                className="w-full py-3 px-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold hover:from-red-600 hover:to-red-700 focus:outline-none focus:ring-4 focus:ring-red-300 focus:ring-opacity-50 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 0 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Reset Configuration
                </div>
              </button>
              <button
                onClick={clearInvalidCredentials}
                className="w-full py-3 px-4 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 focus:outline-none focus:ring-4 focus:ring-orange-300 focus:ring-opacity-50 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
              >
                <div className="flex items-center justify-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  Clear Invalid Credentials
                </div>
              </button>
            </div>
          )}


        </div>
      </div>
    </div>
  );
}
