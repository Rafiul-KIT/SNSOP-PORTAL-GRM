pipeline {
    agent any
    
    tools {
        nodejs 'Node 24'
    }
    
    environment {
        TOMCAT_PATH = 'C:\\Program Files (x86)\\Apache Software Foundation\\Tomcat 9.0\\webapps\\ROOT\\trial\\grm'
    }
    
    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 30, unit: 'MINUTES')
    }
    
    stages {
        stage('Checkout') {
            steps {
                echo '🔄 Checking out code from repository...'
                checkout scm
            }
        }
        
        stage('Install Dependencies') {
            steps {
                echo '📦 Installing npm packages...'
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
                echo '🏗️ Building Angular application for DEVELOPMENT...'
                echo 'Base href will be automatically set to /trial/grm/'
                bat 'call npm run build-dev'
            }
        }
        
        stage('Verify Build Output') {
            steps {
                echo '🔍 Verifying build output...'
                bat '''
                    @echo off
                    echo Checking build directory...
                    dir dist\\browser
                    echo.
                    echo Checking if index.html exists...
                    if exist "dist\\browser\\index.html" (
                        echo ✅ Build successful - index.html found
                    ) else (
                        echo ❌ Build failed - index.html not found
                        exit /b 1
                    )
                '''
            }
        }
        
        stage('Clean Old Deployment') {
            steps {
                echo '🧹 Cleaning old deployment files...'
                bat """
                    @echo off
                    echo Cleaning deployment directory: ${TOMCAT_PATH}
                    
                    if exist "${TOMCAT_PATH}" (
                        echo Directory exists, deleting all files...
                        del /q "${TOMCAT_PATH}\\*.*" 2>nul
                        for /d %%p in ("${TOMCAT_PATH}\\*") do (
                            echo Removing folder: %%p
                            rmdir "%%p" /s /q 2>nul
                        )
                        echo ✅ Old files deleted successfully!
                    ) else (
                        echo Directory does not exist, creating it...
                        mkdir "${TOMCAT_PATH}"
                        echo ✅ Directory created!
                    )
                """
            }
        }
        
        stage('Deploy to Tomcat') {
            steps {
                echo '🚀 Deploying new build to Tomcat...'
                bat """
                    @echo off
                    echo.
                    echo Source: ${WORKSPACE}\\dist\\browser
                    echo Target: ${TOMCAT_PATH}
                    echo.
                    echo Copying files...
                    xcopy /E /I /Y /Q "${WORKSPACE}\\dist\\browser\\*" "${TOMCAT_PATH}\\"
                    
                    if errorlevel 1 (
                        echo ❌ File copy failed!
                        exit /b 1
                    ) else (
                        echo ✅ Files copied successfully!
                    )
                """
            }
        }
        
        stage('Verify Deployment') {
            steps {
                echo '✅ Verifying deployment...'
                bat """
                    @echo off
                    echo.
                    echo Checking deployment directory...
                    
                    if exist "${TOMCAT_PATH}\\index.html" (
                        echo.
                        echo ================================================
                        echo ✅ DEPLOYMENT SUCCESSFUL!
                        echo ================================================
                        echo.
                        echo Deployed files:
                        dir "${TOMCAT_PATH}" /B
                        echo.
                        exit /b 0
                    ) else (
                        echo.
                        echo ================================================
                        echo ❌ DEPLOYMENT FAILED!
                        echo ================================================
                        echo index.html not found in: ${TOMCAT_PATH}
                        echo.
                        exit /b 1
                    )
                """
            }
        }
    }
    
    post {
        success {
            echo ''
            echo '======================================================='
            echo '✅ DEVELOPMENT BUILD AND DEPLOYMENT SUCCESSFUL!'
            echo '======================================================='
            echo ''
            echo "📁 Deployed to: ${TOMCAT_PATH}"
            echo "🌐 Access your app at: http://167.86.68.15/trial/grm/"
            echo ''
            echo '📊 Build Details:'
            echo "   - Environment: DEVELOPMENT"
            echo "   - Job: ${env.JOB_NAME}"
            echo "   - Build: #${env.BUILD_NUMBER}"
            echo "   - Branch: ${env.GIT_BRANCH}"
            echo "   - Commit: ${env.GIT_COMMIT}"
            echo ''
            echo '🎯 Development Features Enabled:'
            echo '   - Source maps enabled'
            echo '   - No optimization'
            echo '   - Debug mode'
            echo ''
            echo '======================================================='
        }
        failure {
            echo ''
            echo '======================================================='
            echo '❌ BUILD OR DEPLOYMENT FAILED!'
            echo '======================================================='
            echo ''
            echo "Job: ${env.JOB_NAME}"
            echo "Build: #${env.BUILD_NUMBER}"
            echo ''
            echo 'Check the console output above for errors'
            echo ''
            echo '======================================================='
        }
        always {
            echo ''
            echo '🧹 Cleaning up Jenkins workspace...'
            cleanWs()
            echo '✅ Cleanup complete'
        }
    }
}