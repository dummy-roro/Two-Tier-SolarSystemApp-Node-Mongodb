# Solar System NodeJS Application

[![LinkedIn](https://img.shields.io/badge/Connect%20with%20me%20on-LinkedIn-blue.svg)](https://www.linkedin.com/in/myat-soe-aumg/)
[![GitHub](https://img.shields.io/github/stars/dummy-roro.svg?style=social)](https://github.com/dummy-roro)
[![AWS](https://img.shields.io/badge/AWS-%F0%9F%9B%A1-orange)](https://aws.amazon.com)
[![Terraform](https://img.shields.io/badge/Terraform-%E2%9C%A8-lightgrey)](https://www.terraform.io)

A simple HTML+MongoDB+NodeJS project to display Solar System and it's planets. This is a two-tier web application and deployed via Jenkins using a full DevSecOps CI/CD pipeline.

## 🔁 DevSecOps CI/CD Workflow (Jenkins)

### 🧪 Feature Branch Workflow

Triggered when a developer pushes to a `feature/*` branch:

1. `npm install --no-audit`
2. `npm audit --audit-level=critical` + exit check
3. OWASP Dependency-Check
4. Unit testing
5. Code coverage (`npm run coverage`)
6. SAST (SonarQube scan)
7. Docker image build
8. Trivy image scan (fail on critical issues)
9. Push image to ECR/DockerHub
10. Deploy to EC2 (Feature environment)
11. Integration testing

### 🔁 PR to `main` Workflow

Triggered when a PR is opened to merge `feature/*` into `main`:

1. Repeat steps 1–9 (skip deploy + integration test)
2. Pull GitOps repo (with Kubernetes manifests)
3. Update image tag and push to GitOps repo
4. ArgoCD syncs application
5. Manual approval in Jenkins to confirm sync
6. Run OWASP ZAP DAST scan on deployed app

---

## 📁 Project Structure

```
solar-system-app/
├── Dockerfile
├── Jenkinsfile
├── README.md
├── app-controller.js
├── app-test
├── app.js
├── index.html
├── integration-testing-ec2.sh
├── oas.json
├── package-lock.json
├── package.json
└── zap_ingnore_rules
```
---
## Requirements

For development, you will only need Node.js and NPM installed in your environement.

### Node
- #### Node installation on Windows

  Just go on [official Node.js website](https://nodejs.org/) and download the installer.
Also, be sure to have `git` available in your PATH, `npm` might need it (You can find git [here](https://git-scm.com/)).

- #### Node installation on Ubuntu

  You can install nodejs and npm easily with apt install, just run the following commands.

      $ sudo apt install nodejs
      $ sudo apt install npm

- #### Other Operating Systems
  You can find more information about the installation on the [official Node.js website](https://nodejs.org/) and the [official NPM website](https://npmjs.org/).

If the installation was successful, you should be able to run the following command.

    $ node --version
    v8.11.3

    $ npm --version
    6.1.0

---
## Install Dependencies from `package.json`
    $ npm install

## Run Unit Testing
    $ npm test

## Run Code Coverage
    $ npm run coverage

## Run Application
    $ npm start

## Access Application on Browser
    http://localhost:3000/

---

      ## 🛠️ Tech Stack
      
      | Layer       | Technology       |
      |-------------|------------------|
      | Backend     | Node.js (Express)|
      | Database    | MongoDB          |
      | Runtime     | Docker           |
      | Deployment  | Jenkins (CI/CD)  |
      | Security    | Trivy, Gitleaks, OWASP Dependency-Check, SonarQube |
      
      ---
      
      ## 🚀 Project Features
      
      - Two-tier architecture: Node.js serves HTML & API; MongoDB handles data.
      - Containerized using Docker.
      - Deployed automatically via Jenkins pipeline.
      - Integrated security and quality scanning tools:
        - 🛡️ **Trivy** – container vulnerability scanning.
        - 🔎 **SonarQube** – code quality analysis.
        - 🕵️ **Gitleaks** – secret detection in code.
        - 🧪 **OWASP Dependency-Check** – third-party dependency scanning.
      
      ---

## 📦 How to Build and Run (Locally using Docker)

### 1. Start MongoDB

```bash
docker network create solar-net

docker run -d \
  --name mongo \
  --network solar-net \
  -p 27017:27017 \
  -e MONGO_INITDB_ROOT_USERNAME=<your_username> \
  -e MONGO_INITDB_ROOT_PASSWORD=<your_password> \
  mongo:4.4.6
```

### 2. Build and Run the Node.js App

```bash
docker build -t solar-backend .

docker run -d \
  --name solar-app \
  --network solar-net \
  -p 3000:3000 \
  -e MONGO_URI="mongodb://myuser:mypassword@mongo:27017" \
  solar-backend
```

---



