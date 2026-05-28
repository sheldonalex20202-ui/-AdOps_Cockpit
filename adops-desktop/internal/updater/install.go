package updater

import (
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	goruntime "runtime"
	"strings"
)

// Install downloads url, calls onProgress on each chunk, then launches the
// platform-specific silent installer. The caller should call wails.Quit after
// this returns to allow the installer to take over.
func Install(url string, onProgress func(done, total int64), onInstalling func()) error {
	ext := ".exe"
	if goruntime.GOOS == "darwin" {
		ext = ".dmg"
	}

	tmp, err := os.CreateTemp("", "adops-update-*"+ext)
	if err != nil {
		return fmt.Errorf("create temp: %w", err)
	}
	tmpPath := tmp.Name()

	if err := downloadTo(tmp, url, onProgress); err != nil {
		tmp.Close()
		os.Remove(tmpPath)
		return err
	}
	tmp.Close()

	onInstalling()

	switch goruntime.GOOS {
	case "windows":
		return installWindows(tmpPath)
	case "darwin":
		return installDarwin(tmpPath)
	default:
		os.Remove(tmpPath)
		return fmt.Errorf("auto-update not supported on %s", goruntime.GOOS)
	}
}

func downloadTo(dst *os.File, url string, onProgress func(done, total int64)) error {
	resp, err := http.Get(url)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	total := resp.ContentLength
	var done int64
	buf := make([]byte, 64<<10)

	for {
		n, rerr := resp.Body.Read(buf)
		if n > 0 {
			if _, werr := dst.Write(buf[:n]); werr != nil {
				return werr
			}
			done += int64(n)
			onProgress(done, total)
		}
		if rerr == io.EOF {
			break
		}
		if rerr != nil {
			return rerr
		}
	}
	return nil
}

// installWindows runs the NSIS installer silently. NSIS handles closing the
// running process and relaunching after install.
func installWindows(exePath string) error {
	return exec.Command(exePath, "/S").Start()
}

// installDarwin writes a helper shell script that runs after we quit:
// it mounts the DMG, replaces the .app bundle in-place, and relaunches.
func installDarwin(dmgPath string) error {
	exe, err := os.Executable()
	if err != nil {
		return err
	}
	appBundle := findAppBundle(exe)
	if appBundle == "" {
		os.Remove(dmgPath)
		return fmt.Errorf("cannot locate .app bundle for current executable")
	}

	script := fmt.Sprintf(`#!/bin/bash
sleep 1
hdiutil attach -nobrowse -quiet '%s' -mountpoint /tmp/adops-vol 2>/dev/null
APP_SRC=$(find /tmp/adops-vol -name "*.app" -maxdepth 1 | head -1)
if [ -n "$APP_SRC" ]; then
  rm -rf '%s'
  ditto "$APP_SRC" '%s'
fi
hdiutil detach /tmp/adops-vol -quiet -force 2>/dev/null || true
rm -f '%s'
open '%s'
`, dmgPath, appBundle, appBundle, dmgPath, appBundle)

	scriptPath := filepath.Join(os.TempDir(), "adops-updater.sh")
	if err := os.WriteFile(scriptPath, []byte(script), 0755); err != nil {
		return err
	}
	return exec.Command("bash", scriptPath).Start()
}

func findAppBundle(exe string) string {
	dir := exe
	for {
		if strings.HasSuffix(dir, ".app") {
			return dir
		}
		parent := filepath.Dir(dir)
		if parent == dir {
			return ""
		}
		dir = parent
	}
}
