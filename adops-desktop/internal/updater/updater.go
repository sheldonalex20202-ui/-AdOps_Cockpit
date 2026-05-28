package updater

import (
	"encoding/json"
	"fmt"
	"net/http"
	goruntime "runtime"
	"strings"
	"time"
)

type ReleaseInfo struct {
	Available bool   `json:"available"`
	Version   string `json:"version"`
	URL       string `json:"url"`
	Notes     string `json:"notes"`
}

type versionManifest struct {
	Version       string `json:"version"`
	WindowsURL    string `json:"windowsUrl"`
	MacosArmURL   string `json:"macosArmUrl"`
	MacosIntelURL string `json:"macosIntelUrl"`
}

// Check fetches /version.json from the web server and compares it with currentVersion.
// Returns empty ReleaseInfo (Available=false) for dev builds or on network error.
func Check(webURL, currentVersion string) (ReleaseInfo, error) {
	if currentVersion == "" || currentVersion == "dev" {
		return ReleaseInfo{}, nil
	}

	endpoint := strings.TrimRight(webURL, "/") + "/api/version"
	client := &http.Client{Timeout: 8 * time.Second}
	resp, err := client.Get(endpoint)
	if err != nil {
		return ReleaseInfo{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return ReleaseInfo{}, fmt.Errorf("version check: http %d", resp.StatusCode)
	}

	var manifest versionManifest
	if err := json.NewDecoder(resp.Body).Decode(&manifest); err != nil {
		return ReleaseInfo{}, err
	}

	url := manifest.WindowsURL
	if goruntime.GOOS == "darwin" {
		if goruntime.GOARCH == "arm64" {
			url = manifest.MacosArmURL
		} else {
			url = manifest.MacosIntelURL
		}
	}

	return ReleaseInfo{
		Available: isNewer(manifest.Version, currentVersion),
		Version:   manifest.Version,
		URL:       url,
	}, nil
}

func isNewer(latest, current string) bool {
	l := parseSemver(strings.TrimPrefix(latest, "v"))
	c := parseSemver(strings.TrimPrefix(current, "v"))
	if l[0] != c[0] {
		return l[0] > c[0]
	}
	if l[1] != c[1] {
		return l[1] > c[1]
	}
	return l[2] > c[2]
}

func parseSemver(v string) [3]int {
	var a, b, c int
	fmt.Sscanf(v, "%d.%d.%d", &a, &b, &c)
	return [3]int{a, b, c}
}
