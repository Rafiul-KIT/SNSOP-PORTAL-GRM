pipeline {
    agent any

    tools {
        nodejs 'Node 24'
    }

    environment {
        TARGET_ENV = 'STAGING'
        BUILD_CMD = 'build-staging'
        TOMCAT_PATH = 'C:\\Program Files (x86)\\Apache Software Foundation\\Tomcat 9.0\\webapps\\ROOT\\trial\\grm'
        DEPLOY_URL = 'http://167.86.68.15/trial/grm/'
        GIT_COMMIT_TEXT = ''
        QA_UNC_PATH = '\\\\213.136.73.10\\grm_deploy'
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

                    // block any branch that is not dev-jenkins or dev-qa
                    if (!branch.endsWith('dev-jenkins') && !branch.endsWith('dev-qa')) {
                        error "Branch '${branch}' is not allowed to deploy. Only dev-jenkins and dev-qa branches are permitted."
                    }

                    def commitMsg = bat(
                        script: '@echo off\r\ngit log -1 --pretty^=%%B 2>nul',
                        returnStdout: true
                    )
                    commitMsg = (commitMsg ?: '').trim()
                    if (!commitMsg) {
                        commitMsg = (env.CHANGE_TITLE ?: '').trim()
                    }
                    if (!commitMsg) {
                        commitMsg = 'NO_COMMIT_MESSAGE'
                    }
                    env.GIT_COMMIT_TEXT = commitMsg

                    if (branch.endsWith('dev-qa')) {
                        env.TARGET_ENV = 'QA'
                        env.BUILD_CMD = 'build-qa'
                        env.DEPLOY_URL = 'http://213.136.73.10/v2/grm/'
                    } else {
                        env.TARGET_ENV = 'STAGING'
                        env.BUILD_CMD = 'build-staging'
                        env.TOMCAT_PATH = 'C:\\Program Files (x86)\\Apache Software Foundation\\Tomcat 9.0\\webapps\\ROOT\\trial\\grm'
                        env.DEPLOY_URL = 'http://167.86.68.15/trial/grm/'
                    }
                }

                echo "Branch: ${env.GIT_BRANCH}"
                echo "Target environment: ${env.TARGET_ENV}"
                echo "Build command: npm run ${env.BUILD_CMD}"
                echo "Commit message: ${env.GIT_COMMIT_TEXT}"
                bat 'hostname'
            }
        }

        stage('Install Dependencies') {
            steps {
                echo 'Installing npm packages...'
                bat '''
                    echo Node version:
                    node --version
                    echo NPM version:
                    call npm --version
                    call npm install
                '''
            }
        }

        stage('Build Angular Application') {
            steps {
                echo "Building Angular application for ${env.TARGET_ENV}..."
                bat "call npm run ${env.BUILD_CMD}"
            }
        }

        stage('Verify Build Output') {
            steps {
                echo 'Verifying build output...'
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
                script {
                    if (env.TARGET_ENV == 'QA') {
                        withCredentials([usernamePassword(
                            credentialsId: 'qa-server-creds',
                            usernameVariable: 'QA_USER',
                            passwordVariable: 'QA_PASS'
                        )]) {
                            bat """
                                @echo off
                                echo Connecting to QA server share...
                                net use "${env.QA_UNC_PATH}" /user:%QA_USER% %QA_PASS% /persistent:no
                                if errorlevel 1 (
                                    echo ERROR: Cannot connect to QA server share.
                                    exit /b 1
                                )
                                echo Cleaning QA deployment folder...
                                del /q "${env.QA_UNC_PATH}\\*.*" 2>nul
                                for /d %%p in ("${env.QA_UNC_PATH}\\*") do rmdir "%%p" /s /q 2>nul
                                echo QA folder cleaned.
                            """
                        }
                    } else {
                        bat """
                            @echo off
                            echo Cleaning STAGING deployment directory...
                            if exist "${TOMCAT_PATH}" (
                                del /q "${TOMCAT_PATH}\\*.*" 2>nul
                                for /d %%p in ("${TOMCAT_PATH}\\*") do rmdir "%%p" /s /q 2>nul
                                echo Old files deleted.
                            ) else (
                                mkdir "${TOMCAT_PATH}"
                                echo Directory created.
                            )
                        """
                    }
                }
            }
        }

        stage('Deploy to Tomcat') {
            steps {
                script {
                    if (env.TARGET_ENV == 'QA') {
                        bat """
                            @echo off
                            echo Copying files to QA server...
                            xcopy /E /I /Y /Q "${WORKSPACE}\\dist\\browser\\*" "${env.QA_UNC_PATH}\\"
                            if errorlevel 1 (
                                echo File copy to QA failed.
                                net use "${env.QA_UNC_PATH}" /delete 2>nul
                                exit /b 1
                            )
                            echo Files copied to QA successfully.
                            net use "${env.QA_UNC_PATH}" /delete 2>nul
                        """
                    } else {
                        bat """
                            @echo off
                            echo Copying files to STAGING...
                            xcopy /E /I /Y /Q "${WORKSPACE}\\dist\\browser\\*" "${TOMCAT_PATH}\\"
                            if errorlevel 1 (
                                echo File copy to STAGING failed.
                                exit /b 1
                            )
                            echo Files copied to STAGING successfully.
                        """
                    }
                }
            }
        }

        stage('Verify Deployment') {
            steps {
                script {
                    def checkPath = (env.TARGET_ENV == 'QA')
                        ? "${env.QA_UNC_PATH}\\index.html"
                        : "${TOMCAT_PATH}\\index.html"
                    bat """
                        @echo off
                        if exist "${checkPath}" (
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
    }

    post {
        success {
            echo '======================================================='
            echo "BUILD AND DEPLOYMENT SUCCESSFUL - ${env.TARGET_ENV}"
            echo '======================================================='
            echo "Branch: ${env.GIT_BRANCH}"
            echo "Access your app at: ${env.DEPLOY_URL}"
            echo "Job: ${env.JOB_NAME} | Build: #${env.BUILD_NUMBER}"
            echo "Commit: ${env.GIT_COMMIT}"
            echo "Commit Message: ${env.GIT_COMMIT_TEXT}"
            echo '======================================================='
        }
        failure {
            echo '======================================================='
            echo "BUILD OR DEPLOYMENT FAILED - ${env.TARGET_ENV}"
            echo '======================================================='
            echo "Branch: ${env.GIT_BRANCH}"
            echo "Job: ${env.JOB_NAME} | Build: #${env.BUILD_NUMBER}"
            echo '======================================================='
        }
        always {
            echo 'Cleaning up Jenkins workspace...'
            cleanWs()
        }
    }
}