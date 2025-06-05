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
        GIT_TOKEN = credentials('gitea-api-token')
    }

    options {
        disableResume()
        disableConcurrentBuilds abortPrevious: true
    }

    stages {
        stage('Installing Dependencies') {
            options { timestamps() }
            steps {
                sh 'npm install --no-audit'
            }
        }

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
                sh 'sleep 5s'
                // timeout(time: 60, unit: 'SECONDS') {
                //     withSonarQubeEnv('sonar-qube-server') {
                //         sh 'echo $SONAR_SCANNER_HOME'
                //         sh '''
                //             $SONAR_SCANNER_HOME/bin/sonar-scanner \
                //                 -Dsonar.projectKey=Solar-System-Project \
                //                 -Dsonar.sources=app.js \
                //                 -Dsonar.javascript.lcov.reportPaths=./coverage/lcov.info
                //         '''
                //     }
                //     waitForQualityGate abortPipeline: true
                // }
            }
        } 

        stage('Build Docker Image') {
            steps {
                sh 'printenv'
                sh """
                    docker build \
                    --build-arg MONGO_URI=${MONGO_URI} \
                    --build-arg MONGO_USERNAME=${MONGO_USERNAME} \
                    --build-arg MONGO_PASSWORD=${MONGO_PASSWORD} \
                    -t siddharth67/solar-system:$GIT_COMMIT .
                """
            }
        }

        stage('Trivy Vulnerability Scanner') {
            steps {
                sh  ''' 
                    trivy image siddharth67/solar-system:$GIT_COMMIT \
                        --severity LOW,MEDIUM,HIGH \
                        --exit-code 0 \
                        --quiet \
                        --format json -o trivy-image-MEDIUM-results.json

                    trivy image siddharth67/solar-system:$GIT_COMMIT \
                        --severity CRITICAL \
                        --exit-code 1 \
                        --quiet \
                        --format json -o trivy-image-CRITICAL-results.json
                '''
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
                    sh  'docker push siddharth67/solar-system:$GIT_COMMIT'
                }
            }
        }

        stage('Deploy - AWS EC2') {
            when {
                branch 'feature/*'
            }
            steps {
                sh 'sleep 5s'
                // script {
                //         sshagent(['aws-dev-deploy-ec2-instance']) {
                //             sh '''
                //                 ssh -o StrictHostKeyChecking=no ubuntu@3.140.244.188 "
                //                     if sudo docker ps -a | grep -q "solar-system"; then
                //                         echo "Container found. Stopping..."
                //                             sudo docker stop "solar-system" && sudo docker rm "solar-system"
                //                         echo "Container stopped and removed."
                //                     fi
                //                         sudo docker run --name solar-system \
                //                             -e MONGO_URI=$MONGO_URI \
                //                             -e MONGO_USERNAME=$MONGO_USERNAME \
                //                             -e MONGO_PASSWORD=$MONGO_PASSWORD \
                //                             -p 3000:3000 -d siddharth67/solar-system:$GIT_COMMIT
                //                 "
                //             '''
                //     }
                // }
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
                sh 'git clone -b main http://64.227.187.25:5555/dasher-org/solar-system-gitops-argocd'
                dir("solar-system-gitops-argocd/kubernetes") {
                    sh '''
                        #### Replace Docker Tag ####
                        git checkout main
                        git checkout -b feature-$BUILD_ID
                        sed -i "s#siddharth67.*#siddharth67/solar-system:$GIT_COMMIT#g" deployment.yml
                        cat deployment.yml
                        
                        #### Commit and Push to Feature Branch ####
                        git config --global user.email "jenkins@dasher.com"
                        git remote set-url origin http://$GITEA_TOKEN@64.227.187.25:5555/dasher-org/solar-system-gitops-argocd
                        git add .
                        git commit -am "Updated docker image"
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
                sh """
                    curl -X 'POST' \
                        'http://64.227.187.25:5555/api/v1/repos/dasher-org/solar-system-gitops-argocd/pulls' \
                        -H 'accept: application/json' \
                        -H 'Authorization: token $GITEA_TOKEN' \
                        -H 'Content-Type: application/json' \
                        -d '{
                            "assignee": "gitea-admin",
                                "assignees": [
                                    "gitea-admin"
                                ],
                            "base": "main",
                            "body": "Updated docker image in deployment manifest",
                            "head": "feature-$BUILD_ID",
                            "title": "Updated Docker Image"
                        }'
                """
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
                sh '''
                    #### REPLACE below with Kubernetes http://IP_Address:30000/api-docs/ #####
                    chmod 777 $(pwd)
                    docker run -v $(pwd):/zap/wrk/:rw  ghcr.io/zaproxy/zaproxy zap-api-scan.py \
                    -t http://134.209.155.222:30000/api-docs/ \
                    -f openapi \
                    -r zap_report.html \
                    -w zap_report.md \
                    -J zap_json_report.json \
                    -x zap_xml_report.xml \
                    -c zap_ignore_rules
                '''
            }
        }

        stage('Upload - AWS S3') {
            when {
                branch 'PR*'
            }
            steps {
                withAWS(credentials: 'aws-s3-ec2-lambda-creds', region: 'us-east-2') {
                    sh  '''
                        ls -ltr
                        mkdir reports-$BUILD_ID
                        cp -rf coverage/ reports-$BUILD_ID/
                        cp dependency*.* test-results.xml trivy*.* zap*.* reports-$BUILD_ID/
                        ls -ltr reports-$BUILD_ID/
                    '''
                    s3Upload(
                        file:"reports-$BUILD_ID", 
                        bucket:'solar-system-jenkins-reports-bucket', 
                        path:"jenkins-$BUILD_ID/"
                    )
                }
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

        stage('Lambda - S3 Upload & Deploy') {
            when {
                branch 'main'
            }
            steps {
                withAWS(credentials: 'aws-s3-ec2-lambda-creds', region: 'us-east-2') {
                    sh '''
                        tail -5 app.js
                        echo "******************************************************************"
                        sed -i "/^app\\.listen(3000/ s/^/\\/\\//" app.js
                        sed -i "s/^module.exports = app;/\\/\\/module.exports = app;/g" app.js
                        sed -i "s|^//module.exports.handler|module.exports.handler|" app.js
                        echo "******************************************************************"
                        tail -5 app.js
                    '''
                    sh  '''
                        zip -qr solar-system-lambda-$BUILD_ID.zip app* package* index.html node*
                        ls -ltr solar-system-lambda-$BUILD_ID.zip
                    '''
                    s3Upload(
                        file: "solar-system-lambda-${BUILD_ID}.zip", 
                        bucket:'solar-system-lambda-bucket'
                    )
                    sh """
                        aws lambda update-function-configuration \
                            --function-name solar-system-function  \
                            --environment '{"Variables":{ "MONGO_USERNAME": "${MONGO_USERNAME}","MONGO_PASSWORD": "${MONGO_PASSWORD}","MONGO_URI": "${MONGO_URI}"}}'
                    """
                    sh '''
                        aws lambda update-function-code \
                            --function-name solar-system-function \
                            --s3-bucket solar-system-lambda-bucket \
                            --s3-key solar-system-lambda-$BUILD_ID.zip
                    '''
                }
            }
        }

        stage('Lambda - Invoke Function') {
            when {
                branch 'main'
            }
            steps {
                withAWS(credentials: 'aws-s3-ec2-lambda-creds', region: 'us-east-2') {
                    sh '''
                        sleep 30s

                        function_url_data=$(aws lambda get-function-url-config --function-name solar-system-function)

                        function_url=$(echo $function_url_data | jq -r '.FunctionUrl | sub("/$"; "")')
                        
                        curl -Is  $function_url/live | grep -i "200 OK"
                    '''
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
