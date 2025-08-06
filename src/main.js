import { app, BrowserWindow, ipcMain, dialog, Menu } from "electron";
import path from "node:path";
import * as nodemailer from "nodemailer";
import * as XLSX from "xlsx";
import fs from "fs";
import Store from "electron-store";
import axios from "axios";
import { autoUpdater } from "electron-updater";
import log from "electron-log";

// Global variables
let mainWindow = null;

// Initialize electron-store for license management
const store = new Store();

// Online license server configuration
const LICENSE_SERVER_URL = "https://email-sender-license-server.onrender.com"; // Update this to your deployed server URL

// Machine identification
const os = require("os");
const crypto = require("crypto");

function generateMachineId() {
  const platform = os.platform();
  const hostname = os.hostname();
  const networkInterfaces = os.networkInterfaces();

  // Get the first non-internal network interface
  let macAddress = "";
  for (const interfaceName in networkInterfaces) {
    const interfaces = networkInterfaces[interfaceName];
    for (const netInterface of interfaces) {
      if (!netInterface.internal && netInterface.mac !== "00:00:00:00:00:00") {
        macAddress = netInterface.mac;
        break;
      }
    }
    if (macAddress) break;
  }

  // Create a unique machine ID based on platform, hostname, and MAC address
  const machineData = `${platform}-${hostname}-${macAddress}`;
  return crypto
    .createHash("sha256")
    .update(machineData)
    .digest("hex")
    .substring(0, 16);
}

const MACHINE_ID = generateMachineId();

// License management functions
function initializeTrial() {
  if (!store.has("trialStart")) {
    store.set("trialStart", new Date().toISOString());
  }
}

function isTrialValid() {
  const trialStart = store.get("trialStart");
  if (!trialStart) return false;

  const startDate = new Date(trialStart);
  const now = new Date();
  const trialDuration = 2 * 24 * 60 * 60 * 1000; // 2 days in milliseconds

  return now - startDate < trialDuration;
}

async function isLicenseValid() {
  const licenseKey = store.get("license.key");
  if (!licenseKey) return false;

  try {
    // Validate license with online server
    const response = await axios.post(
      `${LICENSE_SERVER_URL}/api/validate-license`,
      {
        licenseKey: licenseKey,
      },
      {
        timeout: 5000, // 5 second timeout
      }
    );

    return response.data.valid;
  } catch (error) {
    console.error("License validation error:", error.message);
    // Fallback to local validation if server is unavailable
    return false;
  }
}

async function isAppActivated() {
  const hasValidLicense = await isLicenseValid();
  return hasValidLicense || isTrialValid();
}

// Credential storage path
const credentialsPath = path.join(app.getPath("userData"), "credentials.json");

// Load saved credentials
function loadCredentials() {
  try {
    if (fs.existsSync(credentialsPath)) {
      const data = fs.readFileSync(credentialsPath, "utf8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error loading credentials:", error);
  }
  return [];
}

// Save credentials
function saveCredentials(credentials) {
  try {
    fs.writeFileSync(credentialsPath, JSON.stringify(credentials, null, 2));
    return true;
  } catch (error) {
    console.error("Error saving credentials:", error);
    return false;
  }
}

const createWindow = () => {
  // Create the browser window.
  // Try multiple possible paths for the icon
  const possibleIconPaths = [
    path.join(__dirname, "../assets/logo.ico"),
    path.join(__dirname, "../assets/logo.png"),
    path.join(__dirname, "../../assets/logo.ico"),
    path.join(__dirname, "../../assets/logo.png"),
    path.join(process.cwd(), "assets/logo.ico"),
    path.join(process.cwd(), "assets/logo.png"),
  ];

  let iconPath = null;
  for (const testPath of possibleIconPaths) {
    if (fs.existsSync(testPath)) {
      iconPath = testPath;
      break;
    }
  }

  const windowOptions = {
    width: 1000,
    height: 800,
    title: "Email Sender",
    titleBarStyle: "default",
    backgroundColor: "#667eea",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
      devTools: false, // Disable DevTools
    },
    show: false, // Don't show until ready
  };

  // Only add icon if found
  if (iconPath) {
    windowOptions.icon = iconPath;
  }

  mainWindow = new BrowserWindow(windowOptions);

  // Show window when ready to prevent visual flash
  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  // Set icon explicitly after window creation
  if (iconPath) {
    mainWindow.setIcon(iconPath);
  }

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  // DevTools disabled for production
};

// Handle credential management
ipcMain.handle("load-credentials", async () => {
  try {
    const credentials = loadCredentials();
    return { success: true, credentials };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("save-credentials", async (event, credentialData) => {
  try {
    const existingCredentials = loadCredentials();

    // Check if credential with same name already exists
    const existingIndex = existingCredentials.findIndex(
      (c) => c.name === credentialData.name
    );

    if (existingIndex !== -1) {
      // Update existing credential
      existingCredentials[existingIndex] = credentialData;
    } else {
      // Add new credential
      existingCredentials.push(credentialData);
    }

    const success = saveCredentials(existingCredentials);
    if (success) {
      return { success: true, message: "Credentials saved successfully" };
    } else {
      throw new Error("Failed to save credentials");
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

ipcMain.handle("delete-credentials", async (event, credentialName) => {
  try {
    const existingCredentials = loadCredentials();
    const filteredCredentials = existingCredentials.filter(
      (c) => c.name !== credentialName
    );

    const success = saveCredentials(filteredCredentials);
    if (success) {
      return { success: true, message: "Credentials deleted successfully" };
    } else {
      throw new Error("Failed to delete credentials");
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Handle file selection
ipcMain.handle("select-file", async () => {
  console.log("select-file IPC handler called");
  try {
    const result = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [
        { name: "CSV Files", extensions: ["csv"] },
        { name: "Excel Files", extensions: ["xlsx", "xls"] },
        { name: "All Files", extensions: ["*"] },
      ],
      title: "Select Excel or CSV File",
    });

    console.log("Dialog result:", result);

    if (!result.canceled && result.filePaths.length > 0) {
      const selectedFile = result.filePaths[0];
      console.log("Selected file:", selectedFile);
      return { success: true, filePath: selectedFile };
    } else {
      return { success: false, error: "No file selected" };
    }
  } catch (error) {
    console.error("Dialog error:", error);
    return { success: false, error: error.message };
  }
});

// Handle attachment file selection
ipcMain.handle("select-attachment-file", async () => {
  console.log("select-attachment-file IPC handler called");
  try {
    const result = await dialog.showOpenDialog({
      properties: ["openFile"],
      filters: [
        { name: "All Files", extensions: ["*"] },
        { name: "Documents", extensions: ["pdf", "doc", "docx", "txt", "rtf"] },
        {
          name: "Images",
          extensions: ["jpg", "jpeg", "png", "gif", "bmp", "svg"],
        },
        { name: "Archives", extensions: ["zip", "rar", "7z", "tar", "gz"] },
        { name: "Spreadsheets", extensions: ["xlsx", "xls", "csv"] },
        { name: "Presentations", extensions: ["ppt", "pptx"] },
      ],
      title: "Select File to Attach",
    });

    if (!result.canceled && result.filePaths.length > 0) {
      const selectedFile = result.filePaths[0];
      const stats = fs.statSync(selectedFile);
      const fileName = path.basename(selectedFile);
      const fileExtension = path.extname(selectedFile).toLowerCase();

      // Determine MIME type based on file extension
      const mimeTypes = {
        ".pdf": "application/pdf",
        ".doc": "application/msword",
        ".docx":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ".txt": "text/plain",
        ".rtf": "application/rtf",
        ".jpg": "image/jpeg",
        ".jpeg": "image/jpeg",
        ".png": "image/png",
        ".gif": "image/gif",
        ".bmp": "image/bmp",
        ".svg": "image/svg+xml",
        ".zip": "application/zip",
        ".rar": "application/x-rar-compressed",
        ".7z": "application/x-7z-compressed",
        ".tar": "application/x-tar",
        ".gz": "application/gzip",
        ".xlsx":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        ".xls": "application/vnd.ms-excel",
        ".csv": "text/csv",
        ".ppt": "application/vnd.ms-powerpoint",
        ".pptx":
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      };

      return {
        success: true,
        filePath: selectedFile,
        fileName: fileName,
        fileSize: stats.size,
        fileType: mimeTypes[fileExtension] || "application/octet-stream",
      };
    } else {
      return { success: false, error: "No file selected" };
    }
  } catch (error) {
    console.error("Attachment dialog error:", error);
    return { success: false, error: error.message };
  }
});

// Handle single email sending
ipcMain.handle("send-email", async (event, emailData) => {
  console.log("send-email IPC handler called");
  try {
    const transporter = nodemailer.createTransport({
      service: emailData.service || "gmail",
      auth: {
        user: emailData.user,
        pass: emailData.password,
      },
    });

    const mailOptions = {
      from: emailData.user,
      to: emailData.to,
      subject: emailData.subject,
      text: emailData.text,
      html: emailData.html,
    };

    // Add attachments if provided
    if (emailData.attachments && emailData.attachments.length > 0) {
      mailOptions.attachments = emailData.attachments.map((attachment) => ({
        filename: attachment.name,
        path: attachment.path,
        contentType: attachment.type,
      }));
    }

    const result = await transporter.sendMail(mailOptions);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error("Email sending error:", error);
    return { success: false, error: error.message };
  }
});

// Enhanced bulk email sending with batch processing and concurrent sending
ipcMain.handle("send-bulk-emails", async (event, emailData, recipients) => {
  console.log("send-bulk-emails IPC handler called");
  let transporter;

  try {
    // Validate input
    if (!recipients || recipients.length === 0) {
      throw new Error("No recipients provided");
    }

    if (recipients.length > 10000) {
      throw new Error("Maximum 10,000 recipients allowed per batch");
    }

    transporter = nodemailer.createTransport({
      service: emailData.service || "gmail",
      auth: {
        user: emailData.user,
        pass: emailData.password,
      },
      // Add connection pooling for better performance
      pool: true,
      maxConnections: 5,
      maxMessages: 100,
      rateDelta: 1000,
      rateLimit: 5,
    });

    // Verify transporter connection
    await transporter.verify();

    const results = [];
    const totalRecipients = recipients.length;

    // Configuration for different email providers
    const providerConfig = {
      gmail: {
        batchSize: 10,
        delayBetweenBatches: 2000,
        concurrentEmails: 3,
        maxRetries: 3,
      },
      outlook: {
        batchSize: 15,
        delayBetweenBatches: 1500,
        concurrentEmails: 5,
        maxRetries: 2,
      },
      yahoo: {
        batchSize: 8,
        delayBetweenBatches: 2500,
        concurrentEmails: 2,
        maxRetries: 3,
      },
      hotmail: {
        batchSize: 12,
        delayBetweenBatches: 1800,
        concurrentEmails: 4,
        maxRetries: 2,
      },
    };

    const config = providerConfig[emailData.service] || providerConfig.gmail;
    console.log(`Using config for ${emailData.service}:`, config);

    // Send initial progress update
    event.sender.send("bulk-email-progress", {
      current: 0,
      total: totalRecipients,
      completed: 0,
      successful: 0,
      failed: 0,
    });

    // Process emails in batches
    for (
      let batchStart = 0;
      batchStart < totalRecipients;
      batchStart += config.batchSize
    ) {
      const batchEnd = Math.min(batchStart + config.batchSize, totalRecipients);
      const batch = recipients.slice(batchStart, batchEnd);

      console.log(
        `Processing batch ${Math.floor(batchStart / config.batchSize) + 1}: ${batchStart + 1}-${batchEnd} of ${totalRecipients}`
      );

      // Send emails in current batch concurrently with retry logic
      const batchPromises = batch.map(async (recipient, index) => {
        return await sendEmailWithRetry(
          transporter,
          emailData,
          recipient,
          config.maxRetries
        );
      });

      // Process batch with concurrency limit
      const batchResults = await processBatchWithConcurrency(
        batchPromises,
        config.concurrentEmails
      );
      results.push(...batchResults);

      // Send progress update to renderer
      const successfulCount = results.filter((r) => r.success).length;
      const failedCount = results.filter((r) => !r.success).length;
      const progressUpdate = {
        current: batchEnd,
        total: totalRecipients,
        completed: results.length,
        successful: successfulCount,
        failed: failedCount,
      };
      console.log("Sending progress update:", progressUpdate);
      event.sender.send("bulk-email-progress", progressUpdate);

      // Add delay between batches to avoid rate limiting
      if (batchEnd < totalRecipients) {
        await new Promise((resolve) =>
          setTimeout(resolve, config.delayBetweenBatches)
        );
      }

      // Force garbage collection every 10 batches to prevent memory issues
      if (batchStart > 0 && batchStart % (config.batchSize * 10) === 0) {
        if (global.gc) {
          global.gc();
        }
      }
    }

    const successfulCount = results.filter((r) => r.success).length;
    const failedCount = results.filter((r) => !r.success).length;

    // Send final progress update
    const finalProgressUpdate = {
      current: totalRecipients,
      total: totalRecipients,
      completed: totalRecipients,
      successful: successfulCount,
      failed: failedCount,
    };
    console.log("Sending final progress update:", finalProgressUpdate);
    event.sender.send("bulk-email-progress", finalProgressUpdate);

    console.log(
      `Bulk email completed: ${successfulCount} successful, ${failedCount} failed out of ${totalRecipients} total`
    );

    return {
      success: true,
      results,
      summary: {
        total: totalRecipients,
        successful: successfulCount,
        failed: failedCount,
        successRate: ((successfulCount / totalRecipients) * 100).toFixed(1),
      },
    };
  } catch (error) {
    console.error("Bulk email sending error:", error);
    return { success: false, error: error.message };
  } finally {
    // Clean up transporter
    if (transporter) {
      transporter.close();
    }
  }
});

// Helper function to send email with retry logic
async function sendEmailWithRetry(
  transporter,
  emailData,
  recipient,
  maxRetries
) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const mailOptions = {
        from: emailData.user,
        to: recipient.email,
        subject: emailData.subject,
        text: emailData.text,
        html: emailData.html,
      };

      // Add attachments if provided
      if (emailData.attachments && emailData.attachments.length > 0) {
        mailOptions.attachments = emailData.attachments.map((attachment) => ({
          filename: attachment.name,
          path: attachment.path,
          contentType: attachment.type,
        }));
      }

      const result = await transporter.sendMail(mailOptions);
      return {
        email: recipient.email,
        success: true,
        messageId: result.messageId,
        attempts: attempt,
      };
    } catch (error) {
      console.error(
        `Error sending to ${recipient.email} (attempt ${attempt}):`,
        error.message
      );

      if (attempt === maxRetries) {
        return {
          email: recipient.email,
          success: false,
          error: error.message,
          attempts: attempt,
        };
      }

      // Wait before retry (exponential backoff)
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      );
    }
  }
}

// Helper function to process batch with concurrency limit
async function processBatchWithConcurrency(promises, concurrencyLimit) {
  const results = [];
  const executing = [];

  for (const promise of promises) {
    const p = Promise.resolve().then(() => promise);
    results.push(p);

    if (concurrencyLimit <= promises.length) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= concurrencyLimit) {
        await Promise.race(executing);
      }
    }
  }

  return Promise.all(results);
}

// Handle Excel/CSV file reading
ipcMain.handle("read-excel-file", async (event, filePath) => {
  console.log("=== EXCEL FILE READING START ===");
  console.log("read-excel-file IPC handler called with filePath:", filePath);
  try {
    console.log("Reading file...");

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File does not exist: ${filePath}`);
    }

    // Check if file is readable
    try {
      fs.accessSync(filePath, fs.constants.R_OK);
    } catch (accessError) {
      throw new Error(
        `File is not readable: ${filePath}. Please check file permissions.`
      );
    }

    let data;
    const fileExtension = filePath.toLowerCase().split(".").pop();

    if (fileExtension === "csv") {
      console.log("Reading CSV file...");
      try {
        // Read CSV file using XLSX with proper options
        const fileBuffer = fs.readFileSync(filePath);
        const workbook = XLSX.read(fileBuffer, {
          type: "buffer",
          raw: false,
          cellDates: true,
          cellNF: false,
          cellText: false,
        });

        if (workbook.SheetNames.length === 0) {
          throw new Error("No sheets found in CSV file");
        }

        const sheetName = workbook.SheetNames[0];
        console.log("Using sheet:", sheetName);

        const worksheet = workbook.Sheets[sheetName];
        console.log("Worksheet loaded");

        // Convert to JSON with header row
        data = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: "",
          blankrows: false,
        });

        // Convert array format to object format
        if (data.length > 0) {
          const headers = data[0];
          data = data.slice(1).map((row) => {
            const obj = {};
            headers.forEach((header, index) => {
              obj[header] = row[index] || "";
            });
            return obj;
          });
        }
      } catch (csvError) {
        console.error("CSV reading error:", csvError);
        // Fallback: try reading as plain text CSV
        console.log("Trying fallback CSV reading...");
        const fileContent = fs.readFileSync(filePath, "utf8");
        const lines = fileContent
          .split("\n")
          .filter((line) => line.trim() !== "");

        if (lines.length < 2) {
          throw new Error(
            "CSV file must have at least a header row and one data row"
          );
        }

        const headers = lines[0].split(",").map((h) => h.trim());
        data = lines.slice(1).map((line) => {
          const values = line.split(",").map((v) => v.trim());
          const obj = {};
          headers.forEach((header, index) => {
            obj[header] = values[index] || "";
          });
          return obj;
        });
      }
    } else {
      console.log("=== READING EXCEL FILE ===");
      console.log("Reading Excel file...");
      // Read Excel file
      let workbook;
      let worksheet;

      try {
        // Try to read file stats first
        const stats = fs.statSync(filePath);
        console.log("File stats:", {
          size: stats.size,
          isFile: stats.isFile(),
          mode: stats.mode,
        });

        if (stats.size === 0) {
          throw new Error("File is empty");
        }

        // Read Excel file with proper configuration
        const fileBuffer = fs.readFileSync(filePath);

        // Try multiple reading methods
        try {
          workbook = XLSX.read(fileBuffer, {
            type: "buffer",
            cellDates: true,
            cellNF: false,
            cellText: false,
            cellStyles: false,
          });
        } catch (firstError) {
          console.log("First method failed, trying alternative...");
          // Try alternative method
          workbook = XLSX.read(fileBuffer, {
            type: "buffer",
            raw: true,
            cellDates: false,
            cellNF: false,
            cellText: true,
          });
        }

        console.log("Workbook loaded, sheet names:", workbook.SheetNames);

        // Validate workbook
        if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
          throw new Error("No sheets found in Excel file");
        }

        const sheetName = workbook.SheetNames[0];
        worksheet = workbook.Sheets[sheetName];

        if (!worksheet) {
          throw new Error(`Sheet "${sheetName}" not found in Excel file`);
        }

        // Check if worksheet has data
        const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");
        if (range.e.r === 0 && range.e.c === 0) {
          throw new Error("Excel file appears to be empty");
        }

        // Data extraction
        data = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: "",
          blankrows: false,
        });

        // Convert array format to object format if needed
        if (data.length > 0 && Array.isArray(data[0])) {
          const headers = data[0];
          data = data.slice(1).map((row) => {
            const obj = {};
            headers.forEach((header, index) => {
              obj[header] = row[index] || "";
            });
            return obj;
          });
        }
      } catch (xlsxError) {
        console.error("XLSX reading error:", xlsxError);

        // Provide specific error messages based on the error type
        if (xlsxError.message.includes("Cannot access file")) {
          throw new Error(
            `Cannot access file: ${filePath}. Please ensure the file is not open in another application (like Excel) and try again. Try using the CSV file instead: sample-recipients.csv`
          );
        } else if (xlsxError.message.includes("ENOENT")) {
          throw new Error(
            `File not found: ${filePath}. Please check the file path and try again.`
          );
        } else if (xlsxError.message.includes("EACCES")) {
          throw new Error(
            `Permission denied: ${filePath}. Please check file permissions and try again. Try copying the file to the project folder.`
          );
        } else {
          throw new Error(
            `Failed to read Excel file: ${xlsxError.message}. The file might be corrupted or in an unsupported format. Try using the CSV file instead: sample-recipients.csv`
          );
        }
      }
    }

    console.log("Raw data from file:", data);

    // Validate and clean the data
    const validRecipients = data
      .filter((row) => row.email && row.email.trim() !== "")
      .map((row) => ({
        email: row.email.trim(),
        name: row.name || row.Name || row.NAME || "",
        company: row.company || row.Company || row.COMPANY || "",
      }));

    console.log(
      `Loaded ${validRecipients.length} valid recipients from file:`,
      validRecipients
    );
    console.log("=== EXCEL FILE READING SUCCESS ===");
    return { success: true, recipients: validRecipients };
  } catch (error) {
    console.error("=== EXCEL FILE READING ERROR ===");
    console.error("File reading error:", error);
    console.error("Error stack:", error.stack);
    return { success: false, error: error.message };
  }
});

// Machine registration and heartbeat
async function registerMachine() {
  try {
    const machineInfo = {
      machineId: MACHINE_ID,
      machineName: os.hostname(),
      osInfo: `${os.platform()} ${os.release()}`,
      appVersion: app.getVersion(),
      ipAddress: "127.0.0.1", // Will be updated by server
      userAgent: "Email-Sender-App",
    };

    await axios.post(`${LICENSE_SERVER_URL}/api/machine/register`, machineInfo);
    console.log("Machine registered successfully");
  } catch (error) {
    console.error("Failed to register machine:", error.message);
  }
}

async function sendHeartbeat() {
  try {
    const licenseKey = store.get("license.key");
    await axios.post(`${LICENSE_SERVER_URL}/api/machine/heartbeat`, {
      machineId: MACHINE_ID,
      licenseKey: licenseKey || null,
    });
  } catch (error) {
    console.error("Failed to send heartbeat:", error.message);
  }
}

// Register machine on app start
registerMachine();

// Send heartbeat every 5 minutes
setInterval(sendHeartbeat, 5 * 60 * 1000);

// License management IPC handlers
ipcMain.handle("check-license-status", async () => {
  initializeTrial();
  const isActivated = await isAppActivated();
  const isTrial = isTrialValid() && !(await isLicenseValid());
  const trialStart = store.get("trialStart");

  return {
    isActivated,
    isTrial,
    trialStart,
    hasLicense: await isLicenseValid(),
  };
});

ipcMain.handle("activate-license", async (event, licenseKey) => {
  try {
    const response = await axios.post(
      `${LICENSE_SERVER_URL}/api/activate-license`,
      {
        licenseKey: licenseKey,
      },
      {
        timeout: 5000,
      }
    );
    if (response.data.success) {
      store.set("license.key", licenseKey);
      return { success: true, message: "License activated successfully!" };
    } else {
      return {
        success: false,
        error: response.data.message || "Failed to activate license.",
      };
    }
  } catch (error) {
    console.error("License activation error:", error.message);
    return {
      success: false,
      error: error.message || "Failed to activate license.",
    };
  }
});

ipcMain.handle("get-trial-info", async () => {
  const trialStart = store.get("trialStart");
  if (!trialStart) return { daysLeft: 2 };

  const startDate = new Date(trialStart);
  const now = new Date();
  const trialDuration = 2 * 24 * 60 * 60 * 1000; // 2 days
  const elapsed = now - startDate;
  const daysLeft = Math.max(
    0,
    (trialDuration - elapsed) / (24 * 60 * 60 * 1000)
  );

  return { daysLeft: Math.ceil(daysLeft) };
});

ipcMain.handle("reset-license", async () => {
  store.delete("license.key");
  store.delete("trialStart");
  return {
    success: true,
    message:
      "License data reset successfully! New trial will start on next launch.",
  };
});

// Auto-update configuration
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.logger = log;
log.transports.file.level = 'info';

// Configure auto-updater for proper file paths
autoUpdater.allowDowngrade = false;
autoUpdater.allowPrerelease = false;

// Set update server URL for GitHub releases
autoUpdater.setFeedURL({
  provider: "github",
  owner: "YoussefBenhassine",
  repo: "Email-Sender",
  private: false,
  releaseType: "release",
  updateProvider: "github",
  updaterCacheDirName: "email-sender-updater"
});

// Auto-update event handlers
autoUpdater.on("checking-for-update", () => {
  log.info("Checking for updates...");
  if (mainWindow) {
    mainWindow.webContents.send("update-status", { status: "checking", message: "Checking for updates..." });
  }
});

autoUpdater.on("update-available", (info) => {
  log.info("Update available:", info);
  // Send update available notification to renderer
  if (mainWindow) {
    mainWindow.webContents.send("update-available", {
      ...info,
      message: `Update available: ${info.version}`
    });
  }
});

autoUpdater.on("update-not-available", (info) => {
  log.info("Update not available:", info);
  // Send update not available notification to renderer
  if (mainWindow) {
    mainWindow.webContents.send("update-not-available", {
      ...info,
      message: "You are using the latest version"
    });
  }
});

autoUpdater.on("error", (err) => {
  log.error("Auto-updater error:", err);
  // Send error notification to renderer
  if (mainWindow) {
    mainWindow.webContents.send("update-error", {
      error: err.message || "Update check failed",
      details: err
    });
  }
});

autoUpdater.on("download-progress", (progressObj) => {
  log.info("Download progress:", progressObj);
  // Send download progress to renderer
  if (mainWindow) {
    mainWindow.webContents.send("update-download-progress", {
      ...progressObj,
      percent: Math.round(progressObj.percent || 0)
    });
  }
});

autoUpdater.on("update-downloaded", (info) => {
  log.info("Update downloaded:", info);
  // Send update downloaded notification to renderer
  if (mainWindow) {
    mainWindow.webContents.send("update-downloaded", {
      ...info,
      message: "Update downloaded and ready to install"
    });
  }
});

// Auto-update IPC handlers
ipcMain.handle("check-for-updates", async () => {
  try {
    log.info("Manual update check requested");
    await autoUpdater.checkForUpdates();
    return { success: true, message: "Update check completed" };
  } catch (error) {
    log.error("Error checking for updates:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("download-update", async () => {
  try {
    log.info("Manual update download requested");
    await autoUpdater.downloadUpdate();
    return { success: true, message: "Update download started" };
  } catch (error) {
    log.error("Error downloading update:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("install-update", async () => {
  try {
    log.info("Update installation requested");
    autoUpdater.quitAndInstall();
    return { success: true, message: "Update installation started" };
  } catch (error) {
    log.error("Error installing update:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("get-app-version", async () => {
  return { version: app.getVersion() };
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Remove menu completely
  Menu.setApplicationMenu(null);

  createWindow();

  // Initialize auto-updater with delay to ensure window is ready
  setTimeout(() => {
    if (process.env.NODE_ENV !== 'development') {
      autoUpdater.checkForUpdatesAndNotify();
    }
  }, 3000);

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
