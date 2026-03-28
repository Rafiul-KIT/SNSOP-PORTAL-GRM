pipeline {
    agent any

    tools {
        nodejs 'Node 24'
    }

    environment {
        TARGET_ENV   = 'STAGING'
        BUILD_CMD    = 'build-staging'
        DIST_PATH    = 'dist\\snsop-mf-portal-payment\\browser'
        DEPLOY_TARGET = 'C:\\Program Files (x86)\\Apache Software Foundation\\Tomcat 9.0\\webapps\\ROOT\\trial\\grm'
        DEPLOY_URL   = 'http://167.86.68.15/trial/grm/'
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

                    if (!branch.endsWith('dev-jenkins') && !branch.endsWith('dev-qa')) {
                        error "Branch '${branch}' is not allowed. Only dev-jenkins and dev-qa are permitted."
                    }

                    def commitMsg = bat(
                        script: '@echo off\r\ngit log -1 --pretty^=%%B 2>nul',
                        returnStdout: true
                    )?.trim()
                    env.GIT_COMMIT_TEXT = commitMsg ?: 'NO_COMMIT_MESSAGE'

                    if (branch.endsWith('dev-qa')) {
                        env.TARGET_ENV    = 'QA'
                        env.BUILD_CMD     = 'build-qa'
                        env.DIST_PATH     = 'dist\\snsop-mf-portal-payment\\browser'
                        env.DEPLOY_TARGET = 'C:\\Program Files\\Apache Software Foundation\\Tomcat 9.0\\webapps\\v2\\grm'
                        env.DEPLOY_URL    = 'http://213.136.73.10/v2/grm/'
                    } else {
                        env.TARGET_ENV    = 'STAGING'
                        env.BUILD_CMD     = 'build-staging'
                        env.DIST_PATH     = 'dist\\snsop-mf-portal-payment\\browser'
                        env.DEPLOY_TARGET = 'C:\\Program Files (x86)\\Apache Software Foundation\\Tomcat 9.0\\webapps\\ROOT\\trial\\grm'
                        env.DEPLOY_URL    = 'http://167.86.68.15/trial/grm/'
                    }
                }

                echo "Branch:      ${env.GIT_BRANCH}"
                echo "Environment: ${env.TARGET_ENV}"
                echo "Build cmd:   npm run ${env.BUILD_CMD}"
                echo "Dist path:   ${env.DIST_PATH}"
                echo "Deploy to:   ${env.DEPLOY_TARGET}"
                echo "Commit:      ${env.GIT_COMMIT_TEXT}"
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
                echo 'Verifying build output...'
                bat """
                    @echo off
                    echo Checking: ${env.DIST_PATH}\\index.html
                    if exist "${env.DIST_PATH}\\index.html" (
                        echo Build successful - index.html found
                    ) else (
                        echo Build failed - index.html not found
                        echo Listing dist folder:
                        dir dist /s /b
                        exit /b 1
                    )
                """
            }
        }

        stage('Clean Old Deployment') {
            steps {
                echo "Cleaning ${env.TARGET_ENV} deployment..."
                bat """
                    @echo off
                    if exist "${env.DEPLOY_TARGET}" (
                        del /q "${env.DEPLOY_TARGET}\\*.*" 2>nul
                        for /d %%p in ("${env.DEPLOY_TARGET}\\*") do rmdir "%%p" /s /q 2>nul
                        echo Old files deleted.
                    ) else (
                        mkdir "${env.DEPLOY_TARGET}"
                        echo Directory created.
                    )
                """
            }
        }

        stage('Deploy to Tomcat') {
            steps {
                echo "Deploying to ${env.TARGET_ENV}..."
                bat """
                    @echo off
                    echo Source: ${env.DIST_PATH}
                    echo Target: ${env.DEPLOY_TARGET}
                    xcopy /E /I /Y /Q "${WORKSPACE}\\${env.DIST_PATH}\\*" "${env.DEPLOY_TARGET}\\"
                    if errorlevel 1 (
                        echo Deployment failed.
                        exit /b 1
                    )
                    echo Deployed successfully.
                """
            }
        }

        stage('Verify Deployment') {
            steps {
                echo 'Verifying deployment...'
                bat """
                    @echo off
                    if exist "${env.DEPLOY_TARGET}\\index.html" (
                        echo ================================================
                        echo DEPLOYMENT SUCCESSFUL - ${env.TARGET_ENV}
                        echo ================================================
                    ) else (
                        echo ================================================
                        echo DEPLOYMENT FAILED - index.html not found
                        echo ================================================
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
            echo "URL:     ${env.DEPLOY_URL}"
            echo "Branch:  ${env.GIT_BRANCH}"
            echo "Build:   #${env.BUILD_NUMBER}"
            echo "Commit:  ${env.GIT_COMMIT_TEXT}"
            echo '======================================================='
        }
        failure {
            echo '======================================================='
            echo "FAILED - ${env.TARGET_ENV}"
            echo "Branch:  ${env.GIT_BRANCH}"
            echo "Build:   #${env.BUILD_NUMBER}"
            echo '======================================================='
        }
        always {
            echo 'Cleaning up workspace...'
            cleanWs()
        }
    }
}