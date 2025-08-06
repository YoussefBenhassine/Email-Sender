const { contextBridge, ipcRenderer } = require("electron");

// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

contextBridge.exposeInMainWorld("electronAPI", {
  // File selection
  selectFile: async () => {
    try {
      const result = await ipcRenderer.invoke("select-file");
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Attachment file selection
  selectAttachmentFile: async () => {
    try {
      const result = await ipcRenderer.invoke("select-attachment-file");
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Credential management
  loadCredentials: async () => {
    try {
      const result = await ipcRenderer.invoke("load-credentials");
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  saveCredentials: async (credentialData) => {
    try {
      const result = await ipcRenderer.invoke(
        "save-credentials",
        credentialData
      );
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  deleteCredentials: async (credentialName) => {
    try {
      const result = await ipcRenderer.invoke(
        "delete-credentials",
        credentialName
      );
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Email sending - delegate to main process
  sendEmail: async (emailData) => {
    try {
      const result = await ipcRenderer.invoke("send-email", emailData);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Bulk email sending - delegate to main process
  sendBulkEmails: async (emailData, recipients) => {
    try {
      const result = await ipcRenderer.invoke(
        "send-bulk-emails",
        emailData,
        recipients
      );
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Read Excel file - delegate to main process
  readExcelFile: async (filePath) => {
    try {
      const result = await ipcRenderer.invoke("read-excel-file", filePath);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Progress tracking for bulk emails
  onBulkEmailProgress: (callback) => {
    ipcRenderer.on("bulk-email-progress", (event, progress) => {
      callback(progress);
    });
  },

  // Remove progress listener
  removeBulkEmailProgressListener: () => {
    ipcRenderer.removeAllListeners("bulk-email-progress");
  },

  // License management
  checkLicenseStatus: async () => {
    try {
      const result = await ipcRenderer.invoke("check-license-status");
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  activateLicense: async (licenseKey) => {
    try {
      const result = await ipcRenderer.invoke("activate-license", licenseKey);
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  getTrialInfo: async () => {
    try {
      const result = await ipcRenderer.invoke("get-trial-info");
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  resetLicense: async () => {
    try {
      const result = await ipcRenderer.invoke("reset-license");
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Auto-update functions
  checkForUpdates: async () => {
    try {
      const result = await ipcRenderer.invoke("check-for-updates");
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  downloadUpdate: async () => {
    try {
      const result = await ipcRenderer.invoke("download-update");
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  installUpdate: async () => {
    try {
      const result = await ipcRenderer.invoke("install-update");
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Get app version
  getAppVersion: async () => {
    try {
      const result = await ipcRenderer.invoke("get-app-version");
      return result;
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Auto-update event listeners
  onUpdateAvailable: (callback) => {
    ipcRenderer.on("update-available", (event, info) => {
      callback(info);
    });
  },

  onUpdateNotAvailable: (callback) => {
    ipcRenderer.on("update-not-available", (event, info) => {
      callback(info);
    });
  },

  onUpdateError: (callback) => {
    ipcRenderer.on("update-error", (event, error) => {
      callback(error);
    });
  },

  onUpdateDownloadProgress: (callback) => {
    ipcRenderer.on("update-download-progress", (event, progress) => {
      callback(progress);
    });
  },

  onUpdateDownloaded: (callback) => {
    ipcRenderer.on("update-downloaded", (event, info) => {
      callback(info);
    });
  },

  onUpdateStatus: (callback) => {
    ipcRenderer.on("update-status", (event, status) => {
      callback(status);
    });
  },

  // Remove auto-update listeners
  removeUpdateAvailable: (callback) => {
    ipcRenderer.removeListener("update-available", callback);
  },

  removeUpdateNotAvailable: (callback) => {
    ipcRenderer.removeListener("update-not-available", callback);
  },

  removeUpdateError: (callback) => {
    ipcRenderer.removeListener("update-error", callback);
  },

  removeUpdateDownloadProgress: (callback) => {
    ipcRenderer.removeListener("update-download-progress", callback);
  },

  removeUpdateDownloaded: (callback) => {
    ipcRenderer.removeListener("update-downloaded", callback);
  },

  removeUpdateStatus: (callback) => {
    ipcRenderer.removeListener("update-status", callback);
  },

  // Remove all auto-update listeners
  removeUpdateListeners: () => {
    ipcRenderer.removeAllListeners("update-available");
    ipcRenderer.removeAllListeners("update-not-available");
    ipcRenderer.removeAllListeners("update-error");
    ipcRenderer.removeAllListeners("update-download-progress");
    ipcRenderer.removeAllListeners("update-downloaded");
    ipcRenderer.removeAllListeners("update-status");
  },
});
