Unicode true

####
## Wails-generated tools (populated at build time by wails build -nsis)
####
!include "wails_tools.nsh"

# ── Version metadata ──────────────────────────────────────────────────────────
VIProductVersion "${INFO_PRODUCTVERSION}.0"
VIFileVersion    "${INFO_PRODUCTVERSION}.0"
VIAddVersionKey "CompanyName"     "${INFO_COMPANYNAME}"
VIAddVersionKey "FileDescription" "${INFO_PRODUCTNAME} Installer"
VIAddVersionKey "ProductVersion"  "${INFO_PRODUCTVERSION}"
VIAddVersionKey "FileVersion"     "${INFO_PRODUCTVERSION}"
VIAddVersionKey "LegalCopyright"  "${INFO_COPYRIGHT}"
VIAddVersionKey "ProductName"     "${INFO_PRODUCTNAME}"

ManifestDPIAware true

# ── MUI2 — modern installer UI ────────────────────────────────────────────────
!include "MUI2.nsh"

!define MUI_ICON   "..\icon.ico"
!define MUI_UNICON "..\icon.ico"

!define MUI_FINISHPAGE_NOAUTOCLOSE
!define MUI_ABORTWARNING

# "Launch app" checkbox on the Finish page
!define MUI_FINISHPAGE_RUN      "$INSTDIR\${PRODUCT_EXECUTABLE}"
!define MUI_FINISHPAGE_RUN_TEXT "Запустить AdOps Cockpit"

# ── Installer pages ───────────────────────────────────────────────────────────
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH

# ── Uninstaller pages ─────────────────────────────────────────────────────────
!insertmacro MUI_UNPAGE_INSTFILES

# ── Languages ─────────────────────────────────────────────────────────────────
!insertmacro MUI_LANGUAGE "Russian"
!insertmacro MUI_LANGUAGE "English"

# ── General settings ──────────────────────────────────────────────────────────
Name    "${INFO_PRODUCTNAME}"
OutFile "..\..\bin\${INFO_PROJECTNAME}-${ARCH}-installer.exe"

# Install to a clean single folder (avoids CompanyName\ProductName nesting)
InstallDir "$PROGRAMFILES64\AdOps Cockpit"

# KEY FIX: remember previous install path so silent auto-updates go to same dir
InstallDirRegKey HKLM "Software\AdOps Cockpit" "InstallDir"

ShowInstDetails show

# ── .onInit ───────────────────────────────────────────────────────────────────
Function .onInit
    !insertmacro wails.checkArchitecture

    # Gracefully close a running instance before overwriting files
    FindWindow $0 "" "AdOps Cockpit"
    StrCmp $0 "0" no_window
        SendMessage $0 0x10 0 0   # 0x10 = WM_CLOSE
        Sleep 1000
    no_window:
FunctionEnd

# ── Install section ───────────────────────────────────────────────────────────
Section
    !insertmacro wails.setShellContext
    !insertmacro wails.webview2runtime

    SetOutPath $INSTDIR
    !insertmacro wails.files

    # Save install dir to registry so silent auto-updates find the right path
    WriteRegStr HKLM "Software\AdOps Cockpit" "InstallDir" "$INSTDIR"

    # Start Menu + Desktop shortcuts
    CreateShortcut "$SMPROGRAMS\AdOps Cockpit.lnk" "$INSTDIR\${PRODUCT_EXECUTABLE}"
    CreateShortcut "$DESKTOP\AdOps Cockpit.lnk"    "$INSTDIR\${PRODUCT_EXECUTABLE}"

    !insertmacro wails.associateFiles
    !insertmacro wails.associateCustomProtocols
    !insertmacro wails.writeUninstaller
SectionEnd

# ── Uninstall section ─────────────────────────────────────────────────────────
Section "uninstall"
    !insertmacro wails.setShellContext

    RMDir /r "$AppData\${PRODUCT_EXECUTABLE}"
    RMDir /r $INSTDIR

    Delete "$SMPROGRAMS\AdOps Cockpit.lnk"
    Delete "$DESKTOP\AdOps Cockpit.lnk"

    DeleteRegKey HKLM "Software\AdOps Cockpit"

    !insertmacro wails.unassociateFiles
    !insertmacro wails.unassociateCustomProtocols
    !insertmacro wails.deleteUninstaller
SectionEnd
