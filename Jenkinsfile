pipeline {
    agent any

    tools {
        nodejs 'Node 24'
    }

    environment {
        GIT_COMMIT_TEXT = ''
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 30, unit: 'MINUTES')
    }

    stages {
        stage('Checkout') {
            steps {
                echo 'Checking out code from repository...'
                checkout scm
            }
        }

        stage('Detect Target Environment') {
            steps {
                script {
                    def branch = env.GIT_BRANCH?.trim() ?: ''
                    echo "Building branch: ${branch}"

                    def commitMsg = bat(
                        script: '@echo off\r\ngit log -1 --pretty^=%%B 2>nul',
                        returnStdout: true
                    )
                    commitMsg = (commitMsg ?: '').trim()
                    if (!commitMsg) commitMsg = (env.CHANGE_TITLE ?: '').trim()
                    if (!commitMsg) commitMsg = 'NO_COMMIT_MESSAGE'
                    env.GIT_COMMIT_TEXT = commitMsg

                    if (branch.endsWith('dev-qa')) {
                        env.TARGET_ENV = 'QA'
                        env.BUILD_CMD = 'build-qa'
                        env.DEPLOY_TARGET = 'C:\\Program Files\\Apache Software Foundation\\Tomcat 9.0\\webapps\\v2\\grm'
                        env.DEPLOY_URL = 'http://213.136.73.10/v2/grm/'
                        env.IS_REMOTE = 'false'
                    } else if (branch.endsWith('dev-jenkins')) {
                        env.TARGET_ENV = 'STAGING'
                        env.BUILD_CMD = 'build-staging'
                        env.DEPLOY_TARGET = 'C:\\Program Files (x86)\\Apache Software Foundation\\Tomcat 9.0\\webapps\\ROOT\\trial\\grm'
                        env.DEPLOY_URL = 'http://167.86.68.15/trial/grm/'
                        env.IS_REMOTE = 'false'
                    } else {
                        error "Branch '${branch}' is not allowed to deploy."
                    }
                }

                echo "Target environment: ${env.TARGET_ENV}"
                echo "Deploy target: ${env.DEPLOY_TARGET}"
                echo "Commit message: ${env.GIT_COMMIT_TEXT}"
                bat 'hostname'
            }
        }

        stage('Install Dependencies') {
            steps {
                echo 'Installing npm packages...'
                bat '''
                    node --version
                    call npm --version
                    call npm install
                '''
            }
        }

        stage('Build Angular Application') {
            steps {
                echo "Building for ${env.TARGET_ENV}..."
                bat "call npm run ${env.BUILD_CMD}"
            }
        }

        stage('Verify Build Output') {
            steps {
                bat '''
                    @echo off
                    if exist "dist\\browser\\index.html" (
                        echo Build successful - index.html found
                    ) else (
                        echo Build failed - index.html not found
                        exit /b 1
                    )
                '''
            }
        }

        stage('Clean Old Deployment') {
            steps {
                bat """
                    @echo off
                    echo Cleaning: ${env.DEPLOY_TARGET}
                    if exist "${env.DEPLOY_TARGET}" (
                        del /q "${env.DEPLOY_TARGET}\\*.*" 2>nul
                        for /d %%p in ("${env.DEPLOY_TARGET}\\*") do rmdir "%%p" /s /q 2>nul
                        echo Cleaned successfully.
                    ) else (
                        mkdir "${env.DEPLOY_TARGET}"
                        echo Directory created.
                    )
                """
            }
        }

        stage('Deploy to Tomcat') {
            steps {
                bat """
                    @echo off
                    echo Deploying to: ${env.DEPLOY_TARGET}
                    xcopy /E /I /Y /Q "${WORKSPACE}\\dist\\browser\\*" "${env.DEPLOY_TARGET}\\"
                    if errorlevel 1 (
                        echo Deployment failed.
                        exit /b 1
                    )
                    echo Deployment successful.
                """
            }
        }

        stage('Verify Deployment') {
            steps {
                bat """
                    @echo off
                    if exist "${env.DEPLOY_TARGET}\\index.html" (
                        echo ================================================
                        echo DEPLOYMENT SUCCESSFUL - ${env.TARGET_ENV}
                        echo ================================================
                    ) else (
                        echo DEPLOYMENT FAILED - index.html not found
                        exit /b 1
                    )
                """
            }
        }
    }

    post {
        success {
            echo '======================================================='
            echo "SUCCESSFUL - ${env.TARGET_ENV}"
            echo "URL: ${env.DEPLOY_URL}"
            echo "Branch: ${env.GIT_BRANCH}"
            echo "Build: #${env.BUILD_NUMBER}"
            echo "Commit: ${env.GIT_COMMIT_TEXT}"
            echo '======================================================='
        }
        failure {
            echo '======================================================='
            echo "FAILED - ${env.TARGET_ENV}"
            echo "Branch: ${env.GIT_BRANCH}"
            echo "Build: #${env.BUILD_NUMBER}"
            echo '======================================================='
        }
        always {
            cleanWs()
        }
    }
}