; Inno Setup Script for Mazekty Pro (مزيكتي برو)
#define MyAppName "مزيكتي - Mazekty Pro"
#define MyAppVersion "2.1.0"
#define MyAppPublisher "Mazekty Media"
#define MyAppURL "https://github.com/alahmedelhamed/mazekty"
#define MyAppExeName "start_windows.bat"

[Setup]
AppId={{D5F8A0E4-3C84-4B29-8756-3FEA6615BC3D}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
DefaultDirName={autopf}\Mazekty
DefaultGroupName=Mazekty
OutputDir=.
OutputBaseFilename=Mazekty_Windows_Setup
SetupIconFile=AppIcon.ico
Compression=lzma
SolidCompression=yes
WizardStyle=modern

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"

[Files]
Source: "*"; DestDir: "{app}"; Flags: recursesubdirs createallsubdirs ignoreversion; Excludes: "*.dmg,*.app,*.git*,__pycache__,*.log,venv,dmg_temp"

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\AppIcon.ico"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; IconFilename: "{app}\AppIcon.ico"; Tasks: desktopicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: shellexec postinstall nowait skipifsilent
