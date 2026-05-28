package updater

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

const repoAPI = "https://api.github.com/repos/sheldonalex20202-ui/-AdOps_Cockpit/releases/latest"

type ReleaseInfo struct {
	Available bool   `json:"available"`
	Version   string `json:"version"`
	URL       string `json:"url"`
	Notes     string `json:"notes"`
}

type githubRelease struct {
	TagName string `json:"tag_name"`
	HTMLURL string `json:"html_url"`
	Body    string `json:"body"`
}

// Check fetches the latest GitHub release and compares it with currentVersion.
// Returns empty ReleaseInfo (Available=false) for dev builds or on network error.
func Check(currentVersion string) (ReleaseInfo, error) {
	if currentVersion == "" || currentVersion == "dev" {
		return ReleaseInfo{}, nil
	}

	client := &http.Client{Timeout: 8 * time.Second}
	req, err := http.NewRequest("GET", repoAPI, nil)
	if err != nil {
		return ReleaseInfo{}, err
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("User-Agent", "AdOpsCockpit/"+currentVersion)

	resp, err := client.Do(req)
	if err != nil {
		return ReleaseInfo{}, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return ReleaseInfo{}, fmt.Errorf("github api: %d", resp.StatusCode)
	}

	var rel githubRelease
	if err := json.NewDecoder(resp.Body).Decode(&rel); err != nil {
		return ReleaseInfo{}, err
	}

	return ReleaseInfo{
		Available: isNewer(rel.TagName, currentVersion),
		Version:   rel.TagName,
		URL:       rel.HTMLURL,
		Notes:     rel.Body,
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
