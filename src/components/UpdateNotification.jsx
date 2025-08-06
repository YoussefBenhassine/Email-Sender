import React, { useState, useEffect } from 'react';

const UpdateNotification = () => {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [updateStatus, setUpdateStatus] = useState('');
  const [updateDownloaded, setUpdateDownloaded] = useState(false);
  const [appVersion, setAppVersion] = useState('');

  useEffect(() => {
    // Get current app version
    const getVersion = async () => {
      try {
        const version = await window.electronAPI.getAppVersion();
        setAppVersion(version.version);
      } catch (error) {
        console.error('Error getting app version:', error);
      }
    };
    getVersion();

    // Set up update event listeners
    const handleUpdateAvailable = (info) => {
      setUpdateInfo(info);
      setShowUpdateModal(true);
      setUpdateStatus('update-available');
    };

    const handleUpdateNotAvailable = (info) => {
      setUpdateStatus('up-to-date');
      setTimeout(() => setUpdateStatus(''), 3000);
    };

    const handleUpdateError = (error) => {
      setUpdateStatus('error');
      console.error('Update error:', error);
      setTimeout(() => setUpdateStatus(''), 5000);
    };

    const handleDownloadProgress = (progress) => {
      setUpdateProgress(progress.percent || 0);
      setUpdateStatus('downloading');
    };

    const handleUpdateDownloaded = (info) => {
      setUpdateDownloaded(true);
      setUpdateStatus('ready-to-install');
      setUpdateProgress(100);
    };

    const handleUpdateStatus = (status) => {
      setUpdateStatus(status.status);
    };

    // Add event listeners
    window.electronAPI.onUpdateAvailable(handleUpdateAvailable);
    window.electronAPI.onUpdateNotAvailable(handleUpdateNotAvailable);
    window.electronAPI.onUpdateError(handleUpdateError);
    window.electronAPI.onUpdateDownloadProgress(handleDownloadProgress);
    window.electronAPI.onUpdateDownloaded(handleUpdateDownloaded);
    window.electronAPI.onUpdateStatus(handleUpdateStatus);

    // Cleanup
    return () => {
      window.electronAPI.removeUpdateAvailable(handleUpdateAvailable);
      window.electronAPI.removeUpdateNotAvailable(handleUpdateNotAvailable);
      window.electronAPI.removeUpdateError(handleUpdateError);
      window.electronAPI.removeUpdateDownloadProgress(handleDownloadProgress);
      window.electronAPI.removeUpdateDownloaded(handleUpdateDownloaded);
      window.electronAPI.removeUpdateStatus(handleUpdateStatus);
    };
  }, []);

  const handleCheckForUpdates = async () => {
    try {
      setUpdateStatus('checking');
      const result = await window.electronAPI.checkForUpdates();
      if (!result.success) {
        setUpdateStatus('error');
        setTimeout(() => setUpdateStatus(''), 5000);
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
      setUpdateStatus('error');
      setTimeout(() => setUpdateStatus(''), 5000);
    }
  };

  const handleDownloadUpdate = async () => {
    try {
      setUpdateStatus('downloading');
      const result = await window.electronAPI.downloadUpdate();
      if (!result.success) {
        setUpdateStatus('error');
        setTimeout(() => setUpdateStatus(''), 5000);
      }
    } catch (error) {
      console.error('Error downloading update:', error);
      setUpdateStatus('error');
      setTimeout(() => setUpdateStatus(''), 5000);
    }
  };

  const handleInstallUpdate = async () => {
    try {
      await window.electronAPI.installUpdate();
    } catch (error) {
      console.error('Error installing update:', error);
    }
  };

  const getStatusMessage = () => {
    switch (updateStatus) {
      case 'checking':
        return 'Checking for updates...';
      case 'update-available':
        return 'Update available!';
      case 'downloading':
        return `Downloading update... ${updateProgress}%`;
      case 'ready-to-install':
        return 'Update ready to install!';
      case 'up-to-date':
        return 'You are using the latest version';
      case 'error':
        return 'Update check failed';
      default:
        return '';
    }
  };

  const getStatusColor = () => {
    switch (updateStatus) {
      case 'checking':
        return 'text-blue-600';
      case 'update-available':
        return 'text-green-600';
      case 'downloading':
        return 'text-blue-600';
      case 'ready-to-install':
        return 'text-green-600';
      case 'up-to-date':
        return 'text-gray-600';
      case 'error':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  return (
    <>
      {/* Update Status Bar */}
      {updateStatus && (
        <div className="fixed top-0 left-0 right-0 bg-white border-b border-gray-200 px-4 py-2 z-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className={`text-sm font-medium ${getStatusColor()}`}>
                {getStatusMessage()}
              </span>
              {updateStatus === 'downloading' && (
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${updateProgress}%` }}
                  ></div>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {updateStatus === 'update-available' && (
                <>
                  <button
                    onClick={handleDownloadUpdate}
                    className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
                  >
                    Download
                  </button>
                  <button
                    onClick={() => setShowUpdateModal(false)}
                    className="px-3 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400 transition-colors"
                  >
                    Later
                  </button>
                </>
              )}
              {updateStatus === 'ready-to-install' && (
                <button
                  onClick={handleInstallUpdate}
                  className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                >
                  Install Now
                </button>
              )}
              <button
                onClick={() => setUpdateStatus('')}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Update Modal */}
      {showUpdateModal && updateInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Update Available
              </h3>
              <button
                onClick={() => setShowUpdateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>
            
            <div className="mb-4">
              <p className="text-gray-600 mb-2">
                A new version of Email Sender Pro is available!
              </p>
              <div className="bg-gray-50 p-3 rounded">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Current Version:</span>
                  <span className="font-medium">{appVersion}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">New Version:</span>
                  <span className="font-medium text-green-600">{updateInfo.version}</span>
                </div>
              </div>
              {updateInfo.releaseNotes && (
                <div className="mt-3">
                  <p className="text-sm text-gray-600 mb-1">What's new:</p>
                  <div className="bg-gray-50 p-3 rounded text-sm text-gray-700 max-h-32 overflow-y-auto">
                    {updateInfo.releaseNotes}
                  </div>
                </div>
              )}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={handleDownloadUpdate}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
              >
                Download Update
              </button>
              <button
                onClick={() => setShowUpdateModal(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400 transition-colors"
              >
                Later
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manual Update Check Button */}
      <div className="fixed bottom-4 right-4 z-40">
        <button
          onClick={handleCheckForUpdates}
          className="bg-gray-800 text-white p-2 rounded-full shadow-lg hover:bg-gray-700 transition-colors"
          title="Check for updates"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </>
  );
};

export default UpdateNotification; 