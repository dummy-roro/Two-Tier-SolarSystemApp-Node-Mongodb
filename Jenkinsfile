pipeline {
    agent any

    tools {
        nodejs 'nodejs-22-6-0'
    }

    environment {
        MONGO_URI = "mongodb+srv://dummycluster.d83jj.mongodb.net/superData"
        MONGO_DB_CREDS = credentials('mongo-db-credentials')
        MONGO_USERNAME = credentials('mongo-db-username')
        MONGO_PASSWORD = credentials('mongo-db-password')
        SONAR_SCANNER_HOME = tool 'sonarqube-scanner-610';
        EC2_IP = '<UR_EC2_IP>'  // Or get it from credentials or elsewhere
        GIT_TOKEN = credentials('git-api-token')
    }

    options {
        disableResume()
        disableConcurrentBuilds abortPrevious: true
    }    

    stages {
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
            options { timestamps() }
            steps {
                sh 'npm install --no-audit'
            }
        }

        // Parallel Depedency Check
        stage('Dependency Scanning') {
            parallel {
                stage('NPM Dependency Audit') {
                    steps {
                        sh '''
                            npm audit --audit-level=critical
                            echo $?
                        '''
                    }
                }

                stage('OWASP Dependency Check') {
                    steps {
                        dependencyCheck additionalArguments: '''
                            --scan \'./\' 
                            --out \'./\'  
                            --format \'ALL\' 
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
                sh 'echo Colon-Separated - $MONGO_DB_CREDS'
                sh 'echo Username - $MONGO_DB_CREDS_USR'
                sh 'echo Password - $MONGO_DB_CREDS_PSW'
                sh 'npm test' 
            }
        }    

        stage('Code Coverage') {
            steps {
                catchError(buildResult: 'SUCCESS', message: 'Oops! it will be fixed in future releases', stageResult: 'UNSTABLE') {
                    sh 'npm run coverage'
                }
            }
        }

        stage('SAST - SonarQube') {
            steps {
                timeout(time: 60, unit: 'SECONDS') {
                    withSonarQubeEnv('sonar-qube-server') {
                        sh 'echo $SONAR_SCANNER_HOME'
                        sh '''
                            $SONAR_SCANNER_HOME/bin/sonar-scanner \
                                -Dsonar.projectKey=Solar-System-Project \
                                -Dsonar.sources=. \
                                -Dsonar.javascript.lcov.reportPaths=coverage/lcov.info
                        '''
                    }
                    waitForQualityGate abortPipeline: true
                }
            }
        }
 
        stage('Build Docker Image') {
            steps {
                sh 'printenv'
                sh " docker build -t dummyroro/solar-system:1.0.${env.BUILD_NUMBER} ."
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
                        --exit-code 1 \
                        --quiet \
                        --format json -o trivy-image-CRITICAL-results.json
                """
            }
            post {
                always {
                    sh '''
                        trivy convert \
                            --format template --template "@/usr/local/share/trivy/templates/html.tpl" \
                            --output trivy-image-MEDIUM-results.html trivy-image-MEDIUM-results.json 

                        trivy convert \
                            --format template --template "@/usr/local/share/trivy/templates/html.tpl" \
                            --output trivy-image-CRITICAL-results.html trivy-image-CRITICAL-results.json

                        trivy convert \
                            --format template --template "@/usr/local/share/trivy/templates/junit.tpl" \
                            --output trivy-image-MEDIUM-results.xml  trivy-image-MEDIUM-results.json 

                        trivy convert \
                            --format template --template "@/usr/local/share/trivy/templates/junit.tpl" \
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

        stage('Deploy - AWS EC2') {
            when {
                branch pattern: "feature/.*", comparator: "REGEXP"
            }
            steps {
                sshagent(['aws-dev-deploy-ec2-instance']) {
                    sh '''
                        ssh -o StrictHostKeyChecking=no ubuntu@${EC2_IP} '
                            if sudo docker ps -a --format "{{.Names}}" | grep -q "^solar-system$"; then
                                echo "Stopping and removing existing container..."
                                sudo docker stop solar-system && sudo docker rm solar-system
                            else
                                echo "No existing container found."
                            fi
        
                            sudo docker run --name solar-system \
                                -e MONGO_URI=${MONGO_URI} \
                                -e MONGO_USERNAME=${MONGO_USERNAME} \
                                -e MONGO_PASSWORD=${MONGO_PASSWORD} \
                                -p 3000:3000 -d dummyroro/solar-system:1.0.${BUILD_NUMBER}
                        '
                    '''
                }
            }
        }

        stage('Integration Testing - AWS EC2') {
            when {
                branch 'feature/*'
            }
            steps {
                sh 'printenv | grep -i branch'
                withAWS(credentials: 'aws-s3-ec2-lambda-creds', region: 'us-east-2') {
                    sh  '''
                        bash integration-testing-ec2.sh
                    '''
                }
            }
        }

        stage('K8S - Update Image Tag') {
            when {
                branch 'PR*'
            }
            steps {
                sh 'git clone https://github.com/dummy-roro/solar-system-gitops-argocd.git'
                dir("solar-system-gitops-argocd/kubernetes") {
                    sh '''
                        git checkout main
                        git checkout -b feature-$BUILD_ID
        
                        imageTag=$(grep -oP '(?<=dummyroro/solar-system:1.0\\.)[^ ]+' deployment.yml)
                        sed -i "s/dummyroro\\/solar-system:1.0\\.${imageTag}/dummyroro\\/solar-system:1.0.${BUILD_NUMBER}/" deployment.yml
                        cat deployment.yml
        
                        git config --global user.email "jenkins@robot.com"
                        git remote set-url origin https://$GIT_TOKEN@github.com/dummy-roro/solar-system-gitops-argocd.git
                        git add .
                        git commit -m "Updated docker image"
                        git push -u origin feature-$BUILD_ID
                    '''
                }
            }
        }

        stage('K8S - Raise PR') {
            when {
                branch 'PR*'
            }
            steps {
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
                            -H 'Accept: application/vnd.github+json' \\
                            -H 'Authorization: token ${env.GIT_TOKEN}' \\
                            -H 'Content-Type: application/json' \\
                            -d '${prPayload}'
                    """
                }
            }
        }

        stage('App Deployed?') {
            when {
                branch 'PR*'
            }
            steps {
                timeout(time: 1, unit: 'DAYS') {
                    input message: 'Is the PR Merged and ArgoCD Synced?', ok: 'YES! PR is Merged and ArgoCD Application is Synced'
                }
            }
        }

        stage('DAST - OWASP ZAP') {
            when {
                branch 'PR*'
            }
            steps {
                def zapApiUrl = "http://<IP_OF_K8POD>:30000/api-docs/"  // Replace this with actual URL or use env var
                sh '''
                    chmod 777 $(pwd)
                    docker run -v $(pwd):/zap/wrk/:rw ghcr.io/zaproxy/zaproxy zap-api-scan.py \
                        -t ${zapApiUrl} \\
                        -f openapi \
                        -r zap_report.html \
                        -w zap_report.md \
                        -J zap_json_report.json \
                        -x zap_xml_report.xml \
                        -c zap_ignore_rules
                '''
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
        }
    }

    post {
        always {
            script {
                if (fileExists('solar-system-gitops-argocd')) {
                    sh 'rm -rf solar-system-gitops-argocd'
                }
            }

            junit allowEmptyResults: true, stdioRetention: '', testResults: 'test-results.xml'
            junit allowEmptyResults: true, stdioRetention: '', testResults: 'dependency-check-junit.xml' 
            junit allowEmptyResults: true, stdioRetention: '', testResults: 'trivy-image-CRITICAL-results.xml'
            junit allowEmptyResults: true, stdioRetention: '', testResults: 'trivy-image-MEDIUM-results.xml'

            publishHTML([allowMissing: true, alwaysLinkToLastBuild: true, keepAll: true, reportDir: './', reportFiles: 'zap_report.html', reportName: 'DAST - OWASP ZAP Report', reportTitles: '', useWrapperFileDirectly: true])

            publishHTML([allowMissing: true, alwaysLinkToLastBuild: true, keepAll: true, reportDir: './', reportFiles: 'trivy-image-CRITICAL-results.html', reportName: 'Trivy Image Critical Vul Report', reportTitles: '', useWrapperFileDirectly: true])

            publishHTML([allowMissing: true, alwaysLinkToLastBuild: true, keepAll: true, reportDir: './', reportFiles: 'trivy-image-MEDIUM-results.html', reportName: 'Trivy Image Medium Vul Report', reportTitles: '', useWrapperFileDirectly: true])

            publishHTML([allowMissing: true, alwaysLinkToLastBuild: true, keepAll: true, reportDir: './', reportFiles: 'dependency-check-jenkins.html', reportName: 'Dependency Check HTML Report', reportTitles: '', useWrapperFileDirectly: true])

            publishHTML([allowMissing: true, alwaysLinkToLastBuild: true, keepAll: true, reportDir: 'coverage/lcov-report', reportFiles: 'index.html', reportName: 'Code Coverage HTML Report', reportTitles: '', useWrapperFileDirectly: true])
        }
    }
}
