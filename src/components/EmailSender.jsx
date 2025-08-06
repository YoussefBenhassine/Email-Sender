import React, { useState, useEffect } from 'react';
import logo from '../../assets/logo.png';
import UpdateNotification from './UpdateNotification';

const EmailSender = () => {
  const [formData, setFormData] = useState({
    user: '',
    password: '',
    service: 'gmail',
    to: '',
    subject: '',
    text: '',
    html: ''
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [activeField, setActiveField] = useState('');
  const [emailMode, setEmailMode] = useState('single'); // 'single' or 'bulk'
  const [excelFile, setExcelFile] = useState(null);
  const [recipients, setRecipients] = useState([]);
  const [bulkProgress, setBulkProgress] = useState({ 
    current: 0, 
    total: 0, 
    completed: 0,
    successful: 0,
    failed: 0,
    successRate: 0
  });
  
  // File attachment state
  const [attachments, setAttachments] = useState([]);
  
  // Credential management state
  const [savedCredentials, setSavedCredentials] = useState([]);
  const [showCredentialModal, setShowCredentialModal] = useState(false);
  const [credentialName, setCredentialName] = useState('');
  const [showLoadCredentialModal, setShowLoadCredentialModal] = useState(false);

  // License management state
  const [licenseStatus, setLicenseStatus] = useState(null);
  const [showLicenseModal, setShowLicenseModal] = useState(false);
  const [licenseKey, setLicenseKey] = useState('');
  const [licenseLoading, setLicenseLoading] = useState(false);
  const [trialInfo, setTrialInfo] = useState(null);

  // Auto-update state
  const [updateInfo, setUpdateInfo] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [updateStatus, setUpdateStatus] = useState('');
  const [updateDownloaded, setUpdateDownloaded] = useState(false);

  // Load saved credentials and check license status on component mount
  useEffect(() => {
    loadSavedCredentials();
    checkLicenseStatus();
  }, []);

  // Set up periodic license status checking
  useEffect(() => {
    // Check license status every 30 seconds
    const licenseCheckInterval = setInterval(async () => {
      try {
        const status = await window.electronAPI.checkLicenseStatus();
        setLicenseStatus(status);
        
        if (status.isTrial) {
          const trialInfo = await window.electronAPI.getTrialInfo();
          setTrialInfo(trialInfo);
        }
      } catch (error) {
        console.error('Error checking license status:', error);
      }
    }, 30000); // Check every 30 seconds

    // Cleanup interval on component unmount
    return () => {
      clearInterval(licenseCheckInterval);
    };
  }, []);

  // Check license status
  const checkLicenseStatus = async () => {
    try {
      const status = await window.electronAPI.checkLicenseStatus();
      setLicenseStatus(status);
      
      if (status.isTrial) {
        const trialInfo = await window.electronAPI.getTrialInfo();
        setTrialInfo(trialInfo);
      }
    } catch (error) {
      console.error('Error checking license status:', error);
    }
  };

  // Handle license activation
  const handleActivateLicense = async () => {
    if (!licenseKey.trim()) {
      setResult({ success: false, error: 'Please enter a license key' });
      return;
    }

    setLicenseLoading(true);
    try {
      const result = await window.electronAPI.activateLicense(licenseKey.trim());
      if (result.success) {
        setResult({ success: true, message: result.message });
        setShowLicenseModal(false);
        setLicenseKey('');
        // Refresh license status
        await checkLicenseStatus();
      } else {
        setResult({ success: false, error: result.error });
      }
    } catch (error) {
      setResult({ success: false, error: 'Failed to activate license' });
    } finally {
      setLicenseLoading(false);
    }
  };

  // Handle license activation from button
  const handleActivateLicenseFromButton = async () => {
    setShowLicenseModal(true);
  };

  // Handle license reset
  const handleResetLicense = async () => {
    try {
      const result = await window.electronAPI.resetLicense();
      if (result.success) {
        setResult({ success: true, message: result.message });
        // Refresh license status
        await checkLicenseStatus();
      } else {
        setResult({ success: false, error: result.error });
      }
    } catch (error) {
      setResult({ success: false, error: 'Failed to reset license' });
    }
  };

  // Set up progress tracking for bulk emails
  useEffect(() => {
    // Always set up the progress listener
    const handleProgress = (progress) => {
      console.log('Progress update received:', progress);
      setBulkProgress(prev => ({
        ...prev,
        current: progress.current || 0,
        total: progress.total || 0,
        completed: progress.completed || 0,
        successful: progress.successful || 0,
        failed: progress.failed || 0,
        successRate: progress.completed > 0 ? ((progress.successful / progress.completed) * 100).toFixed(1) : 0
      }));
    };

    window.electronAPI.onBulkEmailProgress(handleProgress);

    return () => {
      window.electronAPI.removeBulkEmailProgressListener();
    };
  }, []);

  // Set up auto-update event listeners
  useEffect(() => {
    // Update available
    window.electronAPI.onUpdateAvailable((info) => {
      setUpdateInfo(info);
      setShowUpdateModal(true);
      setUpdateStatus('Update available!');
    });

    // Update not available
    window.electronAPI.onUpdateNotAvailable((info) => {
      setUpdateStatus('No updates available');
    });

    // Update error
    window.electronAPI.onUpdateError((error) => {
      setUpdateStatus(`Update error: ${error.message}`);
    });

    // Download progress
    window.electronAPI.onUpdateDownloadProgress((progress) => {
      setUpdateProgress(progress.percent || 0);
      setUpdateStatus(`Downloading update... ${Math.round(progress.percent || 0)}%`);
    });

    // Update downloaded
    window.electronAPI.onUpdateDownloaded((info) => {
      setUpdateDownloaded(true);
      setUpdateStatus('Update downloaded! Ready to install.');
    });

    return () => {
      window.electronAPI.removeUpdateListeners();
    };
  }, []);

  // Auto-update functions
  const handleCheckForUpdates = async () => {
    setUpdateStatus('Checking for updates...');
    try {
      const result = await window.electronAPI.checkForUpdates();
      if (!result.success) {
        setUpdateStatus(`Error: ${result.error}`);
      }
    } catch (error) {
      setUpdateStatus(`Error: ${error.message}`);
    }
  };

  const handleDownloadUpdate = async () => {
    setUpdateStatus('Starting download...');
    try {
      const result = await window.electronAPI.downloadUpdate();
      if (!result.success) {
        setUpdateStatus(`Download error: ${result.error}`);
      }
    } catch (error) {
      setUpdateStatus(`Download error: ${error.message}`);
    }
  };

  const handleInstallUpdate = async () => {
    setUpdateStatus('Installing update...');
    try {
      await window.electronAPI.installUpdate();
    } catch (error) {
      setUpdateStatus(`Install error: ${error.message}`);
    }
  };





  const loadSavedCredentials = async () => {
    try {
      const result = await window.electronAPI.loadCredentials();
      if (result.success) {
        setSavedCredentials(result.credentials);
      }
    } catch (error) {
      console.error('Error loading credentials:', error);
    }
  };

  const handleSaveCredentials = async () => {
    if (!credentialName.trim()) {
      setResult({ success: false, error: 'Please enter a name for the credentials' });
      return;
    }

    if (!formData.user || !formData.password) {
      setResult({ success: false, error: 'Please enter email and password before saving' });
      return;
    }

    try {
      const credentialData = {
        name: credentialName.trim(),
        user: formData.user,
        password: formData.password,
        service: formData.service,
        createdAt: new Date().toISOString()
      };

      const result = await window.electronAPI.saveCredentials(credentialData);
      if (result.success) {
        setResult({ success: true, message: result.message });
        setShowCredentialModal(false);
        setCredentialName('');
        await loadSavedCredentials(); // Reload the list
      } else {
        setResult({ success: false, error: result.error });
      }
    } catch (error) {
      setResult({ success: false, error: error.message });
    }
  };

  const handleLoadCredentials = async (credential) => {
    setFormData(prev => ({
      ...prev,
      user: credential.user,
      password: credential.password,
      service: credential.service
    }));
    setShowLoadCredentialModal(false);
    setResult({ success: true, message: `Loaded credentials: ${credential.name}` });
  };

  const handleDeleteCredentials = async (credentialName) => {
    try {
      const result = await window.electronAPI.deleteCredentials(credentialName);
      if (result.success) {
        setResult({ success: true, message: result.message });
        await loadSavedCredentials(); // Reload the list
      } else {
        setResult({ success: false, error: result.error });
      }
    } catch (error) {
      setResult({ success: false, error: error.message });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileSelect = async () => {
    try {
      console.log('handleFileSelect called');
      console.log('window.electronAPI:', window.electronAPI);
      
      if (!window.electronAPI || !window.electronAPI.selectFile) {
        throw new Error('selectFile function is not available');
      }
      
      const fileResult = await window.electronAPI.selectFile();
      console.log('fileResult:', fileResult);
      
      if (fileResult.success) {
        const excelResult = await window.electronAPI.readExcelFile(fileResult.filePath);
        console.log('excelResult:', excelResult);
        
        if (excelResult.success) {
          setExcelFile(fileResult.filePath);
          setRecipients(excelResult.recipients);
          setResult({ 
            success: true, 
            message: `Successfully loaded ${excelResult.recipients.length} recipients from Excel file` 
          });
        } else {
          setResult({ success: false, error: excelResult.error });
        }
      } else {
        setResult({ success: false, error: fileResult.error });
      }
    } catch (error) {
      console.error('handleFileSelect error:', error);
      setResult({ success: false, error: error.message });
    }
  };

  // File attachment handlers
  const handleAddAttachment = async () => {
    try {
      if (!window.electronAPI || !window.electronAPI.selectAttachmentFile) {
        throw new Error('selectAttachmentFile function is not available');
      }
      
      const fileResult = await window.electronAPI.selectAttachmentFile();
      
      if (fileResult.success) {
        const newAttachment = {
          path: fileResult.filePath,
          name: fileResult.fileName,
          size: fileResult.fileSize,
          type: fileResult.fileType
        };
        
        setAttachments(prev => [...prev, newAttachment]);
        setResult({ 
          success: true, 
          message: `Added attachment: ${newAttachment.name}` 
        });
      } else {
        setResult({ success: false, error: fileResult.error });
      }
    } catch (error) {
      console.error('handleAddAttachment error:', error);
      setResult({ success: false, error: error.message });
    }
  };

  const handleRemoveAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
    setResult({ 
      success: true, 
      message: 'Attachment removed' 
    });
  };

  const handleClearAttachments = () => {
    setAttachments([]);
    setResult({ 
      success: true, 
      message: 'All attachments cleared' 
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Show warning for large files
    if (emailMode === 'bulk' && recipients.length > 200) {
      const estimatedTime = Math.ceil(recipients.length / 5); // Rough estimate: 5 emails per second
      const confirmed = window.confirm(
        `You're about to send ${recipients.length} emails. This will take approximately ${estimatedTime} seconds (${Math.ceil(estimatedTime / 60)} minutes).\n\n` +
        'The app will process emails in batches to optimize performance and prevent crashes.\n\n' +
        'Do you want to continue?'
      );
      
      if (!confirmed) {
        return;
      }
    }
    
    setLoading(true);
    setResult(null);

    try {
      // Prepare email data with attachments
      const emailDataWithAttachments = {
        ...formData,
        attachments: attachments
      };

      if (emailMode === 'bulk' && recipients.length > 0) {
        // Bulk email sending
        window.bulkStartTime = Date.now();
        setBulkProgress({ 
          current: 0, 
          total: recipients.length,
          completed: 0,
          successful: 0,
          failed: 0,
          successRate: 0
        });
        const response = await window.electronAPI.sendBulkEmails(emailDataWithAttachments, recipients);
        setResult(response);
      } else {
        // Single email sending
        const response = await window.electronAPI.sendEmail(emailDataWithAttachments);
        setResult(response);
      }
    } catch (error) {
      setResult({ success: false, error: error.message });
    } finally {
      setLoading(false);
      // Don't reset progress immediately - let the user see the final results
      // Progress will be reset when starting a new operation
    }
  };

  // Ultra-modern styling with glassmorphism, gradients, and animations
  const containerStyle = {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    padding: '20px',
    position: 'relative',
    overflow: 'hidden'
  };

  const backgroundDecoration = {
    position: 'absolute',
    top: '-50%',
    right: '-50%',
    width: '100%',
    height: '100%',
    background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)',
    animation: 'float 6s ease-in-out infinite'
  };

  const mainContainerStyle = {
    maxWidth: '900px',
    margin: '0 auto',
    position: 'relative',
    zIndex: 1,
    className: 'container'
  };

  const headerStyle = {
    textAlign: 'center',
    marginBottom: '40px',
    color: 'white'
  };

  const titleStyle = {
    fontSize: '3.5rem',
    fontWeight: '800',
    background: 'linear-gradient(45deg, #fff, #f0f0f0)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent',
    marginBottom: '10px',
    textShadow: '0 4px 20px rgba(0,0,0,0.1)'
  };

  const subtitleStyle = {
    fontSize: '1.1rem',
    opacity: 0.9,
    fontWeight: '300'
  };

  const modeSelectorStyle = {
    display: 'flex',
    justifyContent: 'center',
    gap: '20px',
    marginBottom: '30px'
  };

  const modeButtonStyle = {
    padding: '12px 24px',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '12px',
    color: 'white',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    backdropFilter: 'blur(10px)'
  };

  const modeButtonActiveStyle = {
    ...modeButtonStyle,
    background: 'rgba(255, 255, 255, 0.2)',
    border: '2px solid rgba(255, 255, 255, 0.8)',
    transform: 'translateY(-2px)'
  };

  const formContainerStyle = {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px)',
    borderRadius: '24px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    padding: '40px',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
    marginBottom: '30px'
  };

  const formGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '25px',
    marginBottom: '30px',
    className: 'form-grid'
  };

  const inputGroupStyle = {
    position: 'relative',
    className: 'input-group'
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '8px',
    fontWeight: '600',
    color: 'white',
    fontSize: '0.9rem',
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
  };

  const inputStyle = {
    width: '100%',
    padding: '16px 20px',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '2px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '12px',
    fontSize: '16px',
    color: 'white',
    backdropFilter: 'blur(10px)',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    boxSizing: 'border-box'
  };

  const inputFocusStyle = {
    border: '2px solid rgba(255, 255, 255, 0.8)',
    background: 'rgba(255, 255, 255, 0.15)',
    transform: 'translateY(-2px)',
    boxShadow: '0 10px 30px rgba(0, 0, 0, 0.2)'
  };

  const selectStyle = {
    ...inputStyle,
    cursor: 'pointer',
    appearance: 'none',
    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 16px center',
    backgroundSize: '16px'
  };

  const textareaStyle = {
    ...inputStyle,
    minHeight: '120px',
    resize: 'vertical',
    fontFamily: 'inherit'
  };

  const fullWidthStyle = {
    gridColumn: '1 / -1'
  };

  const fileUploadStyle = {
    ...inputStyle,
    cursor: 'pointer',
    textAlign: 'center',
    position: 'relative'
  };

  const buttonStyle = {
    width: '100%',
    padding: '18px 32px',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '16px',
    fontSize: '18px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative',
    overflow: 'hidden'
  };

  const buttonHoverStyle = {
    transform: 'translateY(-3px)',
    boxShadow: '0 20px 40px rgba(102, 126, 234, 0.4)',
    background: 'linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%)'
  };

  const buttonDisabledStyle = {
    ...buttonStyle,
    background: 'rgba(255, 255, 255, 0.2)',
    cursor: 'not-allowed',
    transform: 'none',
    boxShadow: 'none'
  };

  const resultContainerStyle = {
    marginTop: '30px',
    padding: '20px',
    borderRadius: '16px',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.2)'
  };

  const successStyle = {
    ...resultContainerStyle,
    background: 'rgba(34, 197, 94, 0.1)',
    border: '1px solid rgba(34, 197, 94, 0.3)',
    color: '#22c55e'
  };

  const errorStyle = {
    ...resultContainerStyle,
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#ef4444'
  };

  const instructionsStyle = {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(20px)',
    borderRadius: '20px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    padding: '30px',
    color: 'white'
  };

  const instructionsTitleStyle = {
    fontSize: '1.5rem',
    fontWeight: '700',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  };

  const listStyle = {
    listStyle: 'none',
    padding: 0
  };

  const listItemStyle = {
    padding: '12px 0',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '12px'
  };

  const listItemIconStyle = {
    width: '24px',
    height: '24px',
    background: 'rgba(255, 255, 255, 0.2)',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    flexShrink: 0
  };

  const loadingSpinnerStyle = {
    display: 'inline-block',
    width: '20px',
    height: '20px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderTop: '2px solid white',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginRight: '10px'
  };

  const progressBarStyle = {
    width: '100%',
    height: '8px',
    background: 'rgba(255, 255, 255, 0.2)',
    borderRadius: '4px',
    overflow: 'hidden',
    marginTop: '10px'
  };

  const progressFillStyle = {
    height: '100%',
    background: 'linear-gradient(90deg, #22c55e, #16a34a)',
    borderRadius: '4px',
    transition: 'width 0.5s ease-in-out',
    width: `${bulkProgress.total > 0 ? Math.min((bulkProgress.current / bulkProgress.total) * 100, 100) : 0}%`,
    position: 'relative',
    overflow: 'hidden'
  };

  const recipientsListStyle = {
    maxHeight: '200px',
    overflowY: 'auto',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '12px',
    padding: '15px',
    marginTop: '15px'
  };

  const recipientItemStyle = {
    padding: '8px 12px',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    marginBottom: '8px',
    fontSize: '14px',
    color: 'white'
  };

  return (
    <div style={containerStyle}>
      <div style={backgroundDecoration}></div>
      
      {/* License Check - Show license modal if not activated or if manually triggered */}
      {(licenseStatus && !licenseStatus.isActivated) || showLicenseModal ? (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '20px',
            padding: '40px',
            maxWidth: '500px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            position: 'relative'
          }}>
            {/* Close Button */}
            <button
              onClick={() => setShowLicenseModal(false)}
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '50%',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '16px',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                e.target.style.color = 'white';
                e.target.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                e.target.style.color = 'rgba(255, 255, 255, 0.8)';
                e.target.style.transform = 'scale(1)';
              }}
              title="Close"
            >
              ×
            </button>
            <div style={{
              width: '80px',
              height: '80px',
              background: 'linear-gradient(45deg, #667eea, #764ba2)',
              borderRadius: '50%',
              margin: '0 auto 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '40px',
              color: 'white'
            }}>
              🔒
            </div>
            
            <h2 style={{
              color: 'white',
              fontSize: '28px',
              marginBottom: '10px',
              fontWeight: '600'
            }}>
              {licenseStatus.isTrial ? 'Trial Period Expired' : 'License Required'}
            </h2>
            
            {licenseStatus.isTrial && trialInfo && (
              <p style={{
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '16px',
                marginBottom: '20px'
              }}>
                Your 2-day trial has expired. Please enter a valid license key to continue using the application.
              </p>
            )}
            
            {!licenseStatus.isTrial && (
              <p style={{
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '16px',
                marginBottom: '20px'
              }}>
                Please enter a valid license key to activate the application.
              </p>
            )}
            
            <div style={{ marginBottom: '20px' }}>
              <input
                type="text"
                value={licenseKey}
                onChange={(e) => setLicenseKey(e.target.value)}
                placeholder="Enter your license key"
                style={{
                  width: '100%',
                  padding: '15px',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.3)',
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  fontSize: '16px',
                  outline: 'none',
                  transition: 'all 0.3s ease'
                }}
                onFocus={(e) => {
                  e.target.style.border = '1px solid rgba(255, 255, 255, 0.6)';
                  e.target.style.background = 'rgba(255, 255, 255, 0.15)';
                }}
                onBlur={(e) => {
                  e.target.style.border = '1px solid rgba(255, 255, 255, 0.3)';
                  e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                }}
              />
            </div>
            
            <button
              onClick={handleActivateLicense}
              disabled={licenseLoading}
              style={{
                background: 'linear-gradient(45deg, #667eea, #764ba2)',
                color: 'white',
                border: 'none',
                padding: '15px 30px',
                borderRadius: '10px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: licenseLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.3s ease',
                opacity: licenseLoading ? 0.7 : 1,
                width: '100%'
              }}
              onMouseEnter={(e) => {
                if (!licenseLoading) {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.2)';
                }
              }}
              onMouseLeave={(e) => {
                if (!licenseLoading) {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }
              }}
            >
              {licenseLoading ? 'Activating...' : 'Activate License'}
            </button>
            
            {result && (
              <div style={{
                marginTop: '15px',
                padding: '10px',
                borderRadius: '8px',
                background: result.success ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                border: `1px solid ${result.success ? 'rgba(34, 197, 94, 0.5)' : 'rgba(239, 68, 68, 0.5)'}`,
                color: result.success ? '#22c55e' : '#ef4444',
                fontSize: '14px'
              }}>
                {result.success ? result.message : result.error}
              </div>
            )}
            
            
          </div>
        </div>
      ) : null}

      {/* Auto-Update Modal */}
      {showUpdateModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(10px)'
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '20px',
            padding: '40px',
            maxWidth: '500px',
            width: '90%',
            textAlign: 'center',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
            position: 'relative'
          }}>
            {/* Close Button */}
            <button
              onClick={() => setShowUpdateModal(false)}
              style={{
                position: 'absolute',
                top: '15px',
                right: '15px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '50%',
                width: '30px',
                height: '30px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '16px',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                e.target.style.color = 'white';
                e.target.style.transform = 'scale(1.1)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                e.target.style.color = 'rgba(255, 255, 255, 0.8)';
                e.target.style.transform = 'scale(1)';
              }}
              title="Close"
            >
              ×
            </button>

            <div style={{
              width: '80px',
              height: '80px',
              background: 'linear-gradient(45deg, #667eea, #764ba2)',
              borderRadius: '50%',
              margin: '0 auto 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '40px',
              color: 'white'
            }}>
              🔄
            </div>
            
            <h2 style={{
              color: 'white',
              fontSize: '28px',
              marginBottom: '10px',
              fontWeight: '600'
            }}>
              Update Available
            </h2>
            
            {updateInfo && (
              <div style={{
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '16px',
                marginBottom: '20px'
              }}>
                <p>Version {updateInfo.version} is available!</p>
                {updateInfo.releaseNotes && (
                  <div style={{ marginTop: '10px', textAlign: 'left' }}>
                    <strong>What's new:</strong>
                    <div style={{ 
                      background: 'rgba(0, 0, 0, 0.2)', 
                      padding: '10px', 
                      borderRadius: '8px', 
                      marginTop: '5px',
                      fontSize: '14px'
                    }}>
                      {updateInfo.releaseNotes}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Download Progress */}
            {updateProgress > 0 && updateProgress < 100 && (
              <div style={{
                marginBottom: '20px',
                width: '100%'
              }}>
                <div style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  borderRadius: '10px',
                  height: '8px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    background: 'linear-gradient(90deg, #667eea, #764ba2)',
                    height: '100%',
                    width: `${updateProgress}%`,
                    transition: 'width 0.3s ease'
                  }}></div>
                </div>
                <div style={{
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontSize: '14px',
                  marginTop: '8px'
                }}>
                  {Math.round(updateProgress)}% downloaded
                </div>
              </div>
            )}

            {/* Status Message */}
            {updateStatus && (
              <div style={{
                color: 'rgba(255, 255, 255, 0.8)',
                fontSize: '16px',
                marginBottom: '20px'
              }}>
                {updateStatus}
              </div>
            )}

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '15px',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              {!updateDownloaded && updateInfo && (
                <button
                  onClick={handleDownloadUpdate}
                  disabled={updateProgress > 0 && updateProgress < 100}
                  style={{
                    background: 'linear-gradient(45deg, #667eea, #764ba2)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '10px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: updateProgress > 0 && updateProgress < 100 ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease',
                    opacity: updateProgress > 0 && updateProgress < 100 ? 0.6 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!(updateProgress > 0 && updateProgress < 100)) {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.2)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!(updateProgress > 0 && updateProgress < 100)) {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = 'none';
                    }
                  }}
                >
                  {updateProgress > 0 && updateProgress < 100 ? 'Downloading...' : 'Download Update'}
                </button>
              )}

              {updateDownloaded && (
                <button
                  onClick={handleInstallUpdate}
                  style={{
                    background: 'linear-gradient(45deg, #22c55e, #16a34a)',
                    color: 'white',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: '10px',
                    fontSize: '16px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.transform = 'translateY(-2px)';
                    e.target.style.boxShadow = '0 10px 25px rgba(0, 0, 0, 0.2)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  Install & Restart
                </button>
              )}

              <button
                onClick={() => setShowUpdateModal(false)}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'rgba(255, 255, 255, 0.8)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  padding: '12px 24px',
                  borderRadius: '10px',
                  fontSize: '16px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                  e.target.style.color = 'white';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                  e.target.style.color = 'rgba(255, 255, 255, 0.8)';
                }}
              >
                Later
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Responsive Loading Overlay */}
      {loading && (
        <div className="loading-overlay">
          <div style={{
            ...loadingSpinnerStyle,
            width: '40px',
            height: '40px',
            borderWidth: '3px'
          }}></div>
          <div className="loading-text">
            {emailMode === 'bulk' ? 'Sending Bulk Emails...' : 'Sending Email...'}
          </div>
          {emailMode === 'bulk' && bulkProgress.total > 0 && (
            <div className="progress-info">
              {bulkProgress.current} of {bulkProgress.total} completed
              {bulkProgress.completed > 0 && (
                <div style={{ fontSize: '14px', marginTop: '8px', opacity: 0.9 }}>
                  ✅ {bulkProgress.successful} successful | ❌ {bulkProgress.failed} failed | {bulkProgress.successRate}% success rate
                </div>
              )}
              {bulkProgress.total > 200 && (
                <div style={{ fontSize: '12px', marginTop: '5px', opacity: 0.7 }}>
                  Optimized for large files - processing in batches
                </div>
              )}
            </div>
          )}
        </div>
      )}
      
      <div style={mainContainerStyle}>
        <div style={headerStyle}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '20px',
            marginBottom: '20px'
          }}>
                         <div style={{
               position: 'relative',
               display: 'flex',
               alignItems: 'center',
               justifyContent: 'center'
             }}>
               <img 
                 src={logo} 
                 alt="Email Sender Logo" 
                 style={{
                   width: '90px',
                   height: '90px',
                   borderRadius: '20px',
                   boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
                   backdropFilter: 'blur(10px)',
                   border: '2px solid rgba(255, 255, 255, 0.2)',
                   transition: 'all 0.3s ease',
                   filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.2))'
                 }}
                 onMouseEnter={(e) => {
                   e.target.style.transform = 'scale(1.05)';
                   e.target.style.boxShadow = '0 16px 50px rgba(0,0,0,0.4)';
                 }}
                 onMouseLeave={(e) => {
                   e.target.style.transform = 'scale(1)';
                   e.target.style.boxShadow = '0 12px 40px rgba(0,0,0,0.3)';
                 }}
               />
               <div style={{
                 position: 'absolute',
                 top: '-5px',
                 right: '-5px',
                 width: '20px',
                 height: '20px',
                 background: 'linear-gradient(45deg, #22c55e, #16a34a)',
                 borderRadius: '50%',
                 display: 'flex',
                 alignItems: 'center',
                 justifyContent: 'center',
                 fontSize: '12px',
                 color: 'white',
                 fontWeight: 'bold',
                 boxShadow: '0 2px 8px rgba(34, 197, 94, 0.3)',
                 animation: 'pulse 2s infinite'
               }}>
                 ✓
               </div>
             </div>
            <h1 style={titleStyle}>Email Sender</h1>
          </div>
          <p style={subtitleStyle}>Send emails with style and security</p>
          
          {/* License Status Indicator */}
          {licenseStatus && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              marginTop: '15px',
              padding: '8px 16px',
              background: licenseStatus.isActivated 
                ? 'rgba(34, 197, 94, 0.2)' 
                : 'rgba(239, 68, 68, 0.2)',
              border: `1px solid ${licenseStatus.isActivated 
                ? 'rgba(34, 197, 94, 0.5)' 
                : 'rgba(239, 68, 68, 0.5)'}`,
              borderRadius: '20px',
              fontSize: '14px',
              color: licenseStatus.isActivated ? '#22c55e' : '#ef4444'
            }}>
              <span style={{ fontSize: '16px' }}>
                {licenseStatus.isActivated ? '✅' : '⚠️'}
              </span>
              <span>
                {licenseStatus.isActivated 
                  ? (licenseStatus.hasLicense ? 'Licensed' : `Trial - ${trialInfo?.daysLeft || 2} days left`)
                  : 'License Required'
                }
              </span>
              {licenseStatus.isTrial && trialInfo && (
                <span style={{ fontSize: '12px', opacity: 0.8 }}>
                  ({trialInfo.daysLeft} days left)
                </span>
              )}
              {!licenseStatus.hasLicense && (
                <button
                  onClick={handleActivateLicenseFromButton}
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: '1px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '12px',
                    padding: '4px 8px',
                    fontSize: '12px',
                    color: 'inherit',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    marginLeft: '10px'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(255, 255, 255, 0.3)';
                    e.target.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                    e.target.style.transform = 'scale(1)';
                  }}
                  title="Activate license"
                >
                  🔑 Activate
                </button>
              )}
            </div>
          )}

          {/* Update Status and Check for Updates Button */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            marginTop: '10px'
          }}>
            {updateStatus && (
              <div style={{
                padding: '6px 12px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '15px',
                fontSize: '12px',
                color: 'rgba(255, 255, 255, 0.8)'
              }}>
                {updateStatus}
              </div>
            )}
            <button
              onClick={handleCheckForUpdates}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                padding: '6px 12px',
                fontSize: '12px',
                color: 'rgba(255, 255, 255, 0.8)',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.2)';
                e.target.style.color = 'white';
                e.target.style.transform = 'scale(1.05)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                e.target.style.color = 'rgba(255, 255, 255, 0.8)';
                e.target.style.transform = 'scale(1)';
              }}
              title="Check for updates"
            >
              🔄 Check Updates
            </button>
          </div>
        </div>

        <div style={modeSelectorStyle}>
          <button
            style={emailMode === 'single' ? modeButtonActiveStyle : modeButtonStyle}
            onClick={() => setEmailMode('single')}
          >
            📤 Single Email
          </button>
          <button
            style={emailMode === 'bulk' ? modeButtonActiveStyle : modeButtonStyle}
            onClick={() => setEmailMode('bulk')}
          >
            📊 Bulk Email (Excel/CSV)
          </button>
        </div>
        
        <form onSubmit={handleSubmit} style={{
          ...formContainerStyle,
          opacity: loading ? 0.6 : 1,
          transition: 'opacity 0.3s ease'
        }}>
          <div style={formGridStyle}>
            <div style={inputGroupStyle}>
              <label style={labelStyle}>Email Service</label>
              <select
                name="service"
                value={formData.service}
                onChange={handleInputChange}
                style={{
                  ...selectStyle,
                  ...(activeField === 'service' ? inputFocusStyle : {}),
                  opacity: loading ? 0.6 : 1,
                  transition: 'opacity 0.3s ease'
                }}
                onFocus={() => setActiveField('service')}
                onBlur={() => setActiveField('')}
                disabled={loading}
              >
                <option value="gmail">Gmail</option>
                <option value="outlook">Outlook</option>
                <option value="yahoo">Yahoo</option>
                <option value="hotmail">Hotmail</option>
              </select>
            </div>

            <div style={inputGroupStyle}>
              <label style={labelStyle}>Email Address</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="email"
                  name="user"
                  value={formData.user}
                  onChange={handleInputChange}
                  placeholder="your-email@gmail.com"
                  style={{
                    ...inputStyle,
                    flex: 1,
                    ...(activeField === 'user' ? inputFocusStyle : {}),
                    opacity: loading ? 0.6 : 1,
                    transition: 'opacity 0.3s ease'
                  }}
                  onFocus={() => setActiveField('user')}
                  onBlur={() => setActiveField('')}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowLoadCredentialModal(true)}
                  style={{
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '12px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '14px',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.3s ease'
                  }}
                >
                  📂 Load
                </button>
              </div>
            </div>

            <div style={inputGroupStyle}>
              <label style={labelStyle}>Password / App Password</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="Enter your password or app password"
                  style={{
                    ...inputStyle,
                    flex: 1,
                    ...(activeField === 'password' ? inputFocusStyle : {}),
                    opacity: loading ? 0.6 : 1,
                    transition: 'opacity 0.3s ease'
                  }}
                  onFocus={() => setActiveField('password')}
                  onBlur={() => setActiveField('')}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowCredentialModal(true)}
                  style={{
                    padding: '12px 16px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    border: '2px solid rgba(255, 255, 255, 0.3)',
                    borderRadius: '12px',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '14px',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.3s ease'
                  }}
                >
                  💾 Save
                </button>
              </div>
            </div>

            {emailMode === 'single' ? (
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Recipient</label>
                <input
                  type="email"
                  name="to"
                  value={formData.to}
                  onChange={handleInputChange}
                  placeholder="recipient@example.com"
                  style={{
                    ...inputStyle,
                    ...(activeField === 'to' ? inputFocusStyle : {})
                  }}
                  onFocus={() => setActiveField('to')}
                  onBlur={() => setActiveField('')}
                  required
                />
              </div>
            ) : (
              <div style={inputGroupStyle}>
                <label style={labelStyle}>Excel/CSV File</label>
                <button
                  type="button"
                  onClick={handleFileSelect}
                  style={{
                    ...fileUploadStyle,
                    opacity: loading ? 0.5 : 1,
                    transition: 'opacity 0.3s ease'
                  }}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span style={loadingSpinnerStyle}></span>
                      Processing...
                    </>
                  ) : (
                    excelFile ? '📊 File Selected' : '📁 Select Excel or CSV File'
                  )}
                </button>
                {excelFile && (
                  <div style={{ marginTop: '10px', fontSize: '14px', color: 'rgba(255, 255, 255, 0.8)' }}>
                    {excelFile.split('\\').pop()}
                  </div>
                )}

              </div>
            )}

            <div style={inputGroupStyle}>
              <label style={labelStyle}>Subject</label>
              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleInputChange}
                placeholder="Email subject"
                style={{
                  ...inputStyle,
                  ...(activeField === 'subject' ? inputFocusStyle : {}),
                  opacity: loading ? 0.6 : 1,
                  transition: 'opacity 0.3s ease'
                }}
                onFocus={() => setActiveField('subject')}
                onBlur={() => setActiveField('')}
                required
                disabled={loading}
              />
            </div>

            <div style={{ ...inputGroupStyle, ...fullWidthStyle }}>
              <label style={labelStyle}>Message (Text)</label>
              <textarea
                name="text"
                value={formData.text}
                onChange={handleInputChange}
                placeholder="Enter your message here..."
                style={{
                  ...textareaStyle,
                  ...(activeField === 'text' ? inputFocusStyle : {}),
                  opacity: loading ? 0.6 : 1,
                  transition: 'opacity 0.3s ease'
                }}
                onFocus={() => setActiveField('text')}
                onBlur={() => setActiveField('')}
                required
                disabled={loading}
              />
            </div>

            <div style={{ ...inputGroupStyle, ...fullWidthStyle }}>
              <label style={labelStyle}>Message (HTML - Optional)</label>
              <textarea
                name="html"
                value={formData.html}
                onChange={handleInputChange}
                placeholder="Enter HTML message (optional)..."
                style={{
                  ...textareaStyle,
                  ...(activeField === 'html' ? inputFocusStyle : {}),
                  opacity: loading ? 0.6 : 1,
                  transition: 'opacity 0.3s ease'
                }}
                onFocus={() => setActiveField('html')}
                onBlur={() => setActiveField('')}
                disabled={loading}
              />
            </div>

            {/* File Attachments Section */}
            <div style={{ ...inputGroupStyle, ...fullWidthStyle }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                <label style={labelStyle}>Attachments ({attachments.length})</label>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={handleAddAttachment}
                    disabled={loading}
                    style={{
                      ...buttonStyle,
                      padding: '8px 16px',
                      fontSize: '0.9rem',
                      background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)',
                      border: 'none',
                      borderRadius: '6px',
                      color: 'white',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      opacity: loading ? 0.6 : 1,
                      transition: 'all 0.3s ease'
                    }}
                  >
                    Add File
                  </button>
                  {attachments.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearAttachments}
                      disabled={loading}
                      style={{
                        ...buttonStyle,
                        padding: '8px 16px',
                        fontSize: '0.9rem',
                        background: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)',
                        border: 'none',
                        borderRadius: '6px',
                        color: 'white',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        opacity: loading ? 0.6 : 1,
                        transition: 'all 0.3s ease'
                      }}
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>
              
              {attachments.length > 0 && (
                <div style={{
                  border: '2px dashed rgba(255, 255, 255, 0.3)',
                  borderRadius: '12px',
                  padding: '15px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(10px)',
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}>
                  {attachments.map((attachment, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px',
                      marginBottom: '8px',
                      background: 'rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      border: '1px solid rgba(255, 255, 255, 0.2)'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ color: 'white', fontWeight: '500', fontSize: '0.9rem' }}>
                          {attachment.name}
                        </div>
                        <div style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.8rem' }}>
                          {formatFileSize(attachment.size)} • {attachment.type}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(index)}
                        disabled={loading}
                        style={{
                          background: 'rgba(255, 255, 255, 0.2)',
                          border: 'none',
                          borderRadius: '50%',
                          width: '30px',
                          height: '30px',
                          color: 'white',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '16px',
                          opacity: loading ? 0.6 : 1,
                          transition: 'all 0.3s ease'
                        }}
                        title="Remove attachment"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {attachments.length === 0 && (
                <div style={{
                  border: '2px dashed rgba(255, 255, 255, 0.3)',
                  borderRadius: '12px',
                  padding: '30px',
                  textAlign: 'center',
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(10px)',
                  color: 'rgba(255, 255, 255, 0.7)',
                  fontSize: '0.9rem'
                }}>
                  No attachments selected. Click "Add File" to attach documents, images, or other files.
                </div>
              )}
            </div>
          </div>

          {emailMode === 'bulk' && recipients.length > 0 && (
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Recipients ({recipients.length})</label>
              <div style={{
                ...recipientsListStyle,
                opacity: loading ? 0.7 : 1,
                transition: 'opacity 0.3s ease'
              }}>
                {recipients.slice(0, 10).map((recipient, index) => (
                  <div key={index} style={recipientItemStyle}>
                    {recipient.email} {recipient.name && `- ${recipient.name}`}
                  </div>
                ))}
                {recipients.length > 10 && (
                  <div style={{ ...recipientItemStyle, textAlign: 'center', opacity: 0.7 }}>
                    ... and {recipients.length - 10} more
                  </div>
                )}
              </div>
            </div>
          )}

          

          <button
            type="submit"
            disabled={loading || (emailMode === 'bulk' && recipients.length === 0)}
            style={loading ? buttonDisabledStyle : buttonStyle}
            onMouseEnter={(e) => {
              if (!loading) {
                e.target.style.transform = buttonHoverStyle.transform;
                e.target.style.boxShadow = buttonHoverStyle.boxShadow;
                e.target.style.background = buttonHoverStyle.background;
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.target.style.transform = '';
                e.target.style.boxShadow = '';
                e.target.style.background = '';
              }
            }}
          >
            {loading ? (
              <>
                <span style={loadingSpinnerStyle}></span>
                {emailMode === 'bulk' ? 'Sending Bulk Emails...' : 'Sending...'}
              </>
            ) : (
              emailMode === 'bulk' ? `Send to ${recipients.length} Recipients` : 'Send Email'
            )}
          </button>
        </form>

        {result && (
          <div style={result.success ? successStyle : errorStyle}>
            <h3 style={{ margin: '0 0 10px 0', fontSize: '1.2rem' }}>
              {result.success ? '✅ Success!' : '❌ Error'}
            </h3>
            <p style={{ margin: 0, opacity: 0.9 }}>
              {result.success 
                ? (emailMode === 'bulk' 
                    ? `Bulk email operation completed! ${result.summary?.successful || 0} successful, ${result.summary?.failed || 0} failed (${result.summary?.successRate || 0}% success rate).`
                    : `Email sent successfully! Message ID: ${result.messageId}`
                  )
                : result.error
              }
            </p>
            {result.success && emailMode === 'bulk' && (
              <div style={{ marginTop: '10px', fontSize: '14px', opacity: 0.8 }}>
                <div>📊 <strong>Summary:</strong></div>
                <div>✅ Successful: {result.summary?.successful || 0} emails</div>
                <div>❌ Failed: {result.summary?.failed || 0} emails</div>
                <div>📈 Success Rate: {result.summary?.successRate || 0}%</div>
                <div>⏱️ Total Time: {(() => {
                  const elapsed = (Date.now() - (window.bulkStartTime || Date.now())) / 1000;
                  const minutes = Math.floor(elapsed / 60);
                  const seconds = Math.floor(elapsed % 60);
                  return minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
                })()}</div>
              </div>
            )}
            {result.success && emailMode === 'bulk' && result.results && (
              <div style={{ marginTop: '15px', maxHeight: '200px', overflowY: 'auto' }}>
                {result.results.slice(0, 5).map((r, index) => (
                  <div key={index} style={{ fontSize: '14px', marginBottom: '5px' }}>
                    {r.email}: {r.success ? '✅' : '❌'} {r.success ? 'Sent' : r.error}
                  </div>
                ))}
                {result.results.length > 5 && (
                  <div style={{ fontSize: '14px', opacity: 0.7 }}>
                    ... and {result.results.length - 5} more results
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div style={instructionsStyle}>
          <h3 style={instructionsTitleStyle}>
            <span style={{ fontSize: '1.8rem' }}>📋</span>
            Setup Instructions
          </h3>
          <ul style={listStyle}>
            <li style={listItemStyle}>
              <div style={listItemIconStyle}>1</div>
              <span>For Gmail, use an <strong>App Password</strong> instead of your regular password</span>
            </li>
            <li style={listItemStyle}>
              <div style={listItemIconStyle}>2</div>
              <span>Enable 2-factor authentication on your Gmail account</span>
            </li>
            <li style={listItemStyle}>
              <div style={listItemIconStyle}>3</div>
              <span>Generate an App Password in your Google Account settings</span>
            </li>
            <li style={listItemStyle}>
              <div style={listItemIconStyle}>4</div>
              <span>Use that App Password in the password field above</span>
            </li>
            <li style={listItemStyle}>
              <div style={listItemIconStyle}>5</div>
              <span>Select the correct email service for your provider</span>
            </li>
            {emailMode === 'bulk' && (
              <>
                <li style={listItemStyle}>
                  <div style={listItemIconStyle}>6</div>
                  <span>For bulk emails, prepare an Excel file with columns: <strong>email</strong>, <strong>name</strong> (optional), <strong>company</strong> (optional)</span>
                </li>
                                 <li style={listItemStyle}>
                   <div style={listItemIconStyle}>7</div>
                   <span>The app uses intelligent batch processing and concurrent sending for optimal performance</span>
                 </li>
                 <li style={listItemStyle}>
                   <div style={listItemIconStyle}>8</div>
                   <span>Large files (200+ emails) are automatically optimized with provider-specific rate limiting</span>
                 </li>
                 <li style={listItemStyle}>
                   <div style={listItemIconStyle}>9</div>
                   <span>Real-time progress tracking shows success rates and sending speed</span>
                 </li>
              </>
            )}
          </ul>
        </div>
      </div>

      {/* Save Credentials Modal */}
      {showCredentialModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            padding: '30px',
            color: 'white',
            minWidth: '400px',
            maxWidth: '500px'
          }}>
            <h3 style={{ marginBottom: '20px', textAlign: 'center' }}>💾 Save Credentials</h3>
            <div style={{ marginBottom: '20px' }}>
              <label style={labelStyle}>Credential Name</label>
              <input
                type="text"
                value={credentialName}
                onChange={(e) => setCredentialName(e.target.value)}
                placeholder="e.g., My Gmail Account"
                style={inputStyle}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button
                onClick={handleSaveCredentials}
                style={{
                  ...buttonStyle,
                  width: 'auto',
                  padding: '12px 24px'
                }}
              >
                Save
              </button>
              <button
                onClick={() => {
                  setShowCredentialModal(false);
                  setCredentialName('');
                }}
                style={{
                  ...buttonStyle,
                  width: 'auto',
                  padding: '12px 24px',
                  background: 'rgba(255, 255, 255, 0.2)'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load Credentials Modal */}
      {showLoadCredentialModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
            borderRadius: '20px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            padding: '30px',
            color: 'white',
            minWidth: '400px',
            maxWidth: '500px',
            maxHeight: '400px',
            overflowY: 'auto'
          }}>
            <h3 style={{ marginBottom: '20px', textAlign: 'center' }}>📂 Load Credentials</h3>
            {savedCredentials.length === 0 ? (
              <p style={{ textAlign: 'center', opacity: 0.8 }}>No saved credentials found.</p>
            ) : (
              <div style={{ marginBottom: '20px' }}>
                {savedCredentials.map((credential, index) => (
                  <div key={index} style={{
                    padding: '15px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    marginBottom: '10px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>{credential.name}</div>
                      <div style={{ fontSize: '14px', opacity: 0.8 }}>{credential.user} ({credential.service})</div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        onClick={() => handleLoadCredentials(credential)}
                        style={{
                          padding: '8px 12px',
                          background: 'rgba(255, 255, 255, 0.2)',
                          border: 'none',
                          borderRadius: '8px',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Load
                      </button>
                      <button
                        onClick={() => handleDeleteCredentials(credential.name)}
                        style={{
                          padding: '8px 12px',
                          background: 'rgba(239, 68, 68, 0.3)',
                          border: 'none',
                          borderRadius: '8px',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '12px'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div style={{ textAlign: 'center' }}>
              <button
                onClick={() => setShowLoadCredentialModal(false)}
                style={{
                  ...buttonStyle,
                  width: 'auto',
                  padding: '12px 24px',
                  background: 'rgba(255, 255, 255, 0.2)'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

             <style>{`
         @keyframes float {
           0%, 100% { transform: translateY(0px) rotate(0deg); }
           50% { transform: translateY(-20px) rotate(180deg); }
         }
         
         @keyframes spin {
           0% { transform: rotate(0deg); }
           100% { transform: rotate(360deg); }
         }
         
                   @keyframes shimmer {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(100%); }
          }
          
          @keyframes pulse {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.1); opacity: 0.8; }
          }
         
         .progress-fill::after {
           content: '';
           position: absolute;
           top: 0;
           left: 0;
           width: 100%;
           height: 100%;
           background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
           animation: shimmer 2s infinite;
         }
         
         input::placeholder, textarea::placeholder {
           color: rgba(255, 255, 255, 0.6);
         }
         
         select option {
           background: #667eea;
           color: white;
         }
       `}</style>
      
      {/* Update Notification Component */}
      <UpdateNotification />
    </div>
  );
};

export default EmailSender; 