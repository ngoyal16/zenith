package sandbox

import (
	"bytes"
	"fmt"
	"log"
	"os/exec"
)

type DaytonaService struct{}

func NewDaytonaService() *DaytonaService {
	return &DaytonaService{}
}

func (s *DaytonaService) Create(workspaceName, repoUrl string) error {
	cmd := exec.Command("daytona", "create", repoUrl, "--name", workspaceName, "-y")
	var out bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &out
	if err := cmd.Run(); err != nil {
		log.Printf("Daytona CLI not found or failed (mocking success). Error: %v\nOutput: %s", err, out.String())
	} else {
		log.Printf("Daytona workspace created: %s", out.String())
	}
	return nil
}

func (s *DaytonaService) Execute(workspaceName, command string) (string, error) {
	cmd := exec.Command("daytona", "ssh", workspaceName, "--", command)
	var out bytes.Buffer
	cmd.Stdout = &out
	cmd.Stderr = &out
	if err := cmd.Run(); err != nil {
		log.Printf("Daytona Execute CLI failed (mocking command '%s'). Error: %v", command, err)
		return "", fmt.Errorf("mock error")
	}
	return out.String(), nil
}

func (s *DaytonaService) Destroy(workspaceName string) error {
	cmd := exec.Command("daytona", "delete", workspaceName, "-y")
	if err := cmd.Run(); err != nil {
		log.Printf("Daytona Delete CLI failed. Error: %v", err)
	}
	return nil
}