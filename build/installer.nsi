[Setup]
AppId={{com.emailsender.pro}
AppName=Email Sender Pro
AppVersion={#Version}
AppVerName=Email Sender Pro {#Version}
AppPublisher=Email Sender Pro
AppPublisherURL=https://github.com/YoussefBenhassine/Email-Sender
AppSupportURL=https://github.com/YoussefBenhassine/Email-Sender/issues
AppUpdatesURL=https://github.com/YoussefBenhassine/Email-Sender/releases
DefaultDirName={autopf}\Email Sender Pro
DefaultGroupName=Email Sender Pro
AllowNoIcons=yes
LicenseFile=LICENSE
OutputDir=dist
OutputBaseFilename=EmailSenderPro-Setup-{#Version}
SetupIconFile=assets\logo.ico
Compression=lzma
SolidCompression=yes
WizardStyle=modern
PrivilegesRequired=lowest
ArchitecturesAllowed=x64
ArchitecturesInstallIn64BitMode=x64

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "quicklaunchicon"; Description: "{cm:CreateQuickLaunchIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked; OnlyBelowVersion: 6.1; Check: not IsAdminInstallMode

[Files]
Source: "dist\win-unpacked\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{group}\Email Sender Pro"; Filename: "{app}\Email Sender Pro.exe"
Name: "{group}\{cm:UninstallProgram,Email Sender Pro}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\Email Sender Pro"; Filename: "{app}\Email Sender Pro.exe"; Tasks: desktopicon
Name: "{userappdata}\Microsoft\Internet Explorer\Quick Launch\Email Sender Pro"; Filename: "{app}\Email Sender Pro.exe"; Tasks: quicklaunchicon

[Run]
Filename: "{app}\Email Sender Pro.exe"; Description: "{cm:LaunchProgram,Email Sender Pro}"; Flags: nowait postinstall skipifsilent

[Code]
function InitializeSetup(): Boolean;
begin
  Result := True;
end; 