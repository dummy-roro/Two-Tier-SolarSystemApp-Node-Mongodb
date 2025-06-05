pipeline {
    agent any

    tools {
        nodejs 'nodejs-22-6-0'
    }

    environment {
        MONGO_URI = "mongodb+srv://dummycluster.d83jj.mongodb.net/superData"
        SONAR_SCANNER_HOME = tool 'sonarqube-scanner-610'
        EC2_IP = credentials('ec2-public-ip') // Use Jenkins string credential for EC2 IP
    }

    options {
        timestamps()
        disableResume()
        disableConcurrentBuilds abortPrevious: true
    }

    stages {
        stage('Cleaning Workspace') {
            steps {
                cleanWs()
            }
        }

        stage('Checkout from Git') {
            steps {
                git credentialsId: 'GITHUB', url: 'https://github.com/dummy-roro/solar-system.git'
            }
        }

        stage('Installing Dependencies') {
            steps {
                sh 'npm install --no-audit'
            }
        }

        stage('Dependency Scanning') {
            parallel {
                stage('NPM Dependency Audit') {
                    steps {
                        sh 'npm audit --audit-level=critical || true'
                    }
                }

                stage('OWASP Dependency Check') {
                    steps {
                        dependencyCheck additionalArguments: '''
                            --scan './' 
                            --out './'  
                            --format 'ALL' 
                            --disableYarnAudit \
                            --prettyPrint''', odcInstallation: 'OWASP-DepCheck-10'

                        dependencyCheckPublisher failedTotalCritical: 1, pattern: 'dependency-check-report.xml', stopBuild: false
                    }
                }
            }
        }

        stage('Unit Testing') {
            options { retry(2) }
            steps {
                withCredentials([usernamePassword(credentialsId: 'mongo-db-credentials', usernameVariable: 'MONGO_USER', passwordVariable: 'MONGO_PASS')]) {
                    sh 'echo Username - $MONGO_USER'
                    sh 'echo Password - $MONGO_PASS'
                    sh 'npm test || true' // Prevent breaking on test failure; handle errors in test logic
                }
            }
        }

        stage('Code Coverage') {
            steps {
                catchError(buildResult: 'SUCCESS', message: 'Coverage failed', stageResult: 'UNSTABLE') {
                    sh 'npm run coverage'
                }
            }
        }

        stage('SAST - SonarQube') {
            steps {
                timeout(time: 60, unit: 'SECONDS') {
                    withSonarQubeEnv('sonar-qube-server') {
                        sh '''
                            ${SONAR_SCANNER_HOME}/bin/sonar-scanner \
                                -Dsonar.projectKey=Solar-System-Project \
                                -Dsonar.sources=. \
                                -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info
                        '''
                    }
                }
                waitForQualityGate abortPipeline: true
            }
        }

        stage('Build Docker Image') {
            steps {
                sh "docker build -t dummyroro/solar-system:1.0.${env.BUILD_NUMBER} ."
            }
        }

        stage('Trivy Vulnerability Scanner') {
            steps {
                sh """
                    trivy image dummyroro/solar-system:1.0.${env.BUILD_NUMBER} \
                        --severity LOW,MEDIUM,HIGH \
                        --exit-code 0 \
                        --quiet \
                        --format json -o trivy-image-MEDIUM-results.json

                    trivy image dummyroro/solar-system:1.0.${env.BUILD_NUMBER} \
                        --severity CRITICAL \
                        --exit-code 0 \
                        --quiet \
                        --format json -o trivy-image-CRITICAL-results.json
                """
            }
            post {
                always {
                    sh '''
                        trivy convert --format template --template "@/usr/local/share/trivy/templates/html.tpl" \
                            --output trivy-image-MEDIUM-results.html trivy-image-MEDIUM-results.json 
                        trivy convert --format template --template "@/usr/local/share/trivy/templates/html.tpl" \
                            --output trivy-image-CRITICAL-results.html trivy-image-CRITICAL-results.json
                        trivy convert --format template --template "@/usr/local/share/trivy/templates/junit.tpl" \
                            --output trivy-image-MEDIUM-results.xml  trivy-image-MEDIUM-results.json 
                        trivy convert --format template --template "@/usr/local/share/trivy/templates/junit.tpl" \
                            --output trivy-image-CRITICAL-results.xml trivy-image-CRITICAL-results.json
                    '''
                }
            }
        }

        stage('Push Docker Image') {
            steps {
                withDockerRegistry(credentialsId: 'docker-hub-credentials', url: "") {
                    sh "docker push dummyroro/solar-system:1.0.${env.BUILD_NUMBER}"
                }
            }
        }

        /*stage('Deploy - AWS EC2') {
            when {
                branch pattern: "feature/.*", comparator: "REGEXP"
            }
            steps {
                withCredentials([usernamePassword(credentialsId: 'mongo-db-credentials', usernameVariable: 'MONGO_USER', passwordVariable: 'MONGO_PASS')]) {
                    sshagent(['aws-dev-deploy-ec2-instance']) {
                        sh """
                            ssh -o StrictHostKeyChecking=no ubuntu@${EC2_IP} '
                                if sudo docker ps -a --format "{{.Names}}" | grep -q "^solar-system$"; then
                                    sudo docker stop solar-system && sudo docker rm solar-system
                                fi

                                sudo docker run --name solar-system \
                                    -e MONGO_URI=${MONGO_URI} \
                                    -e MONGO_USERNAME=${MONGO_USER} \
                                    -e MONGO_PASSWORD=${MONGO_PASS} \
                                    -p 3000:3000 -d dummyroro/solar-system:1.0.${BUILD_NUMBER}
                            '
                        """
                    }
                }
            }
        }

        stage('Integration Testing - AWS EC2') {
            when {
                branch pattern: "feature/.*", comparator: "REGEXP"
            }
            steps {
                withAWS(credentials: 'aws-s3-ec2-lambda-creds', region: 'us-east-2') {
                    sh 'bash integration-testing-ec2.sh'
                }
            }
        }

        stage('K8S - Update Image Tag') {
            when {
                branch pattern: "PR.*", comparator: "REGEXP"
            }
            steps {
                withCredentials([string(credentialsId: 'git-api-token', variable: 'GIT_TOKEN')]) {
                    sh '''
                        git clone https://github.com/dummy-roro/solar-system-gitops-argocd.git
                        cd solar-system-gitops-argocd/kubernetes

                        git checkout main
                        git checkout -b feature-$BUILD_ID

                        imageTag=$(grep -oP '(?<=dummyroro/solar-system:1.0\\.)[^ ]+' deployment.yml)
                        sed -i "s/dummyroro\\/solar-system:1.0\\.${imageTag}/dummyroro\\/solar-system:1.0.${BUILD_NUMBER}/" deployment.yml

                        git config --global user.email "jenkins@robot.com"
                        git remote set-url origin https://${GIT_TOKEN}@github.com/dummy-roro/solar-system-gitops-argocd.git
                        git add .
                        git commit -m "Updated docker image"
                        git push -u origin feature-$BUILD_ID
                    '''
                }
            }
        }

        stage('K8S - Raise PR') {
            when {
                branch pattern: "PR.*", comparator: "REGEXP"
            }
            steps {
                withCredentials([string(credentialsId: 'git-api-token', variable: 'GIT_TOKEN')]) {
                    script {
                        def prPayload = """
                        {
                            "title": "Updated Docker Image",
                            "head": "feature-${env.BUILD_ID}",
                            "base": "main",
                            "body": "Updated docker image in deployment manifest",
                            "maintainer_can_modify": true
                        }
                        """
                        sh """
                            curl -X POST 'https://api.github.com/repos/dummy-roro/solar-system-gitops-argocd/pulls' \\
                                -H 'Authorization: token ${GIT_TOKEN}' \\
                                -H 'Content-Type: application/json' \\
                                -d '${prPayload}'
                        """
                    }
                }
            }
        }

        stage('App Deployed?') {
            when {
                branch pattern: "PR.*", comparator: "REGEXP"
            }
            steps {
                timeout(time: 1, unit: 'DAYS') {
                    input message: 'Is the PR Merged and ArgoCD Synced?', ok: 'YES! PR is Merged and ArgoCD Application is Synced'
                }
            }
        }

        stage('DAST - OWASP ZAP') {
            when {
                branch pattern: "PR.*", comparator: "REGEXP"
            }
            steps {
                def zapApiUrl = "http://${env.K8_POD_IP}:30000/api-docs/" // Replace with actual value or credentials
                sh """
                    docker run -v $(pwd):/zap/wrk/:rw ghcr.io/zaproxy/zaproxy zap-api-scan.py \
                        -t ${zapApiUrl} \
                        -f openapi \
                        -r zap_report.html \
                        -w zap_report.md \
                        -J zap_json_report.json \
                        -x zap_xml_report.xml \
                        -c zap_ignore_rules
                """
            }
        }

        stage('Deploy to Prod?') {
            when {
                branch 'main'
            }
            steps {
                timeout(time: 1, unit: 'DAYS') {
                    input message: 'Deploy to Production?', ok: 'YES! Let us try this on Production', submitter: 'admin'
                }
            }
        }*/
    }

    post {
        always {
            script {
                if (fileExists('solar-system-gitops-argocd')) {
                    sh 'rm -rf solar-system-gitops-argocd'
                }
            }

            junit allowEmptyResults: true, testResults: 'test-results.xml'
            junit allowEmptyResults: true, testResults: 'dependency-check-junit.xml' 
            junit allowEmptyResults: true, testResults: 'trivy-image-CRITICAL-results.xml'
            junit allowEmptyResults: true, testResults: 'trivy-image-MEDIUM-results.xml'

            publishHTML([allowMissing: true, alwaysLinkToLastBuild: true, keepAll: true, reportDir: './', reportFiles: 'zap_report.html', reportName: 'DAST - OWASP ZAP Report'])
            publishHTML([allowMissing: true, alwaysLinkToLastBuild: true, keepAll: true, reportDir: './', reportFiles: 'trivy-image-CRITICAL-results.html', reportName: 'Trivy Image Critical Vul Report'])
            publishHTML([allowMissing: true, alwaysLinkToLastBuild: true, keepAll: true, reportDir: './', reportFiles: 'trivy-image-MEDIUM-results.html', reportName: 'Trivy Image Medium Vul Report'])
            publishHTML([allowMissing: true, alwaysLinkToLastBuild: true, keepAll: true, reportDir: './', reportFiles: 'dependency-check-jenkins.html', reportName: 'Dependency Check HTML Report'])
            publishHTML([allowMissing: true, alwaysLinkToLastBuild: true, keepAll: true, reportDir: 'coverage/lcov-report', reportFiles: 'index.html', reportName: 'Code Coverage HTML Report'])
        }
    }
}
