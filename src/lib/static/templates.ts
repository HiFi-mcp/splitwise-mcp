/**
 * HTML Templates for the Splitwise MCP Server
 */

export const SUCCESS_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Authorization Complete - Splitwise MCP</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .container {
            background: white;
            border-radius: 16px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            text-align: center;
            max-width: 500px;
            width: 100%;
        }

        .icon {
            width: 80px;
            height: 80px;
            background: #4CAF50;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
            animation: pulse 2s infinite;
        }

        .icon svg {
            width: 40px;
            height: 40px;
            fill: white;
        }

        @keyframes pulse {
            0% {
                transform: scale(1);
                box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7);
            }
            70% {
                transform: scale(1.05);
                box-shadow: 0 0 0 10px rgba(76, 175, 80, 0);
            }
            100% {
                transform: scale(1);
                box-shadow: 0 0 0 0 rgba(76, 175, 80, 0);
            }
        }

        h1 {
            color: #333;
            margin-bottom: 16px;
            font-size: 28px;
            font-weight: 600;
        }

        .message {
            color: #666;
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 32px;
        }

        .highlight {
            background: #f0f8ff;
            border-left: 4px solid #667eea;
            padding: 16px;
            margin: 24px 0;
            border-radius: 8px;
            text-align: left;
        }

        .highlight strong {
            color: #333;
            font-weight: 600;
        }

        .steps {
            text-align: left;
            margin: 24px 0;
        }

        .step {
            display: flex;
            align-items: flex-start;
            margin-bottom: 12px;
            color: #555;
        }

        .step-number {
            background: #667eea;
            color: white;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: 600;
            margin-right: 12px;
            flex-shrink: 0;
            margin-top: 2px;
        }

        .footer {
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid #eee;
            color: #999;
            font-size: 14px;
        }

        .loading {
            display: inline-block;
            width: 20px;
            height: 20px;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #667eea;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin-left: 8px;
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">
            <svg viewBox="0 0 24 24">
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
            </svg>
        </div>
        
        <h1>Authorization Complete!</h1>
        
        <p class="message">
            Your Splitwise account has been successfully connected. You can now close this window and return to your chat.
        </p>

        <div class="highlight">
            <strong>Next Steps:</strong><br>
            Go back to your chat application where you initiated this authorization process.
        </div>

        <div class="steps">
            <div class="step">
                <div class="step-number">1</div>
                <div>Return to your chat application</div>
            </div>
            <div class="step">
                <div class="step-number">2</div>
                <div>Your Splitwise integration is now ready to use</div>
            </div>
            <div class="step">
                <div class="step-number">3</div>
                <div>You can start using Splitwise commands in your chat</div>
            </div>
        </div>

        <div class="footer">
            <p>This window will automatically close in <span id="countdown">10</span> seconds</p>
            <div class="loading"></div>
        </div>
    </div>

    <script>
        // Auto-close countdown
        let countdown = 10;
        const countdownElement = document.getElementById('countdown');
        
        const timer = setInterval(() => {
            countdown--;
            countdownElement.textContent = countdown;
            
            if (countdown <= 0) {
                clearInterval(timer);
                window.close();
            }
        }, 1000);

        // Also allow manual close with escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                window.close();
            }
        });
    </script>
</body>
</html>`;

/**
 * Utility function to create HTML responses
 */
export function createHtmlResponse(html: string, status: number = 200): Response {
    return new Response(html, {
        status,
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
        },
    });
}

/**
 * Get the success page response
 */
export function getSuccessPageResponse(): Response {
    return createHtmlResponse(SUCCESS_HTML);
}

export const ERROR_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Authorization Error - Splitwise MCP</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background: linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }

        .container {
            background: white;
            border-radius: 16px;
            padding: 40px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            text-align: center;
            max-width: 500px;
            width: 100%;
        }

        .icon {
            width: 80px;
            height: 80px;
            background: #ff6b6b;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 24px;
        }

        .icon svg {
            width: 40px;
            height: 40px;
            fill: white;
        }

        h1 {
            color: #333;
            margin-bottom: 16px;
            font-size: 28px;
            font-weight: 600;
        }

        .message {
            color: #666;
            font-size: 16px;
            line-height: 1.6;
            margin-bottom: 32px;
        }

        .error-details {
            background: #fff5f5;
            border-left: 4px solid #ff6b6b;
            padding: 16px;
            margin: 24px 0;
            border-radius: 8px;
            text-align: left;
        }

        .error-details strong {
            color: #333;
            font-weight: 600;
        }

        .actions {
            margin-top: 32px;
        }

        .btn {
            display: inline-block;
            padding: 12px 24px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            transition: background 0.3s ease;
        }

        .btn:hover {
            background: #5a6fd8;
        }

        .footer {
            margin-top: 32px;
            padding-top: 24px;
            border-top: 1px solid #eee;
            color: #999;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">
            <svg viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
        </div>
        
        <h1>Authorization Failed</h1>
        
        <p class="message">
            There was an error during the authorization process. Please try again or contact support if the problem persists.
        </p>

        <div class="error-details">
            <strong>What happened:</strong><br>
            The authorization process could not be completed successfully.
        </div>

        <div class="actions">
            <a href="javascript:window.close()" class="btn">Close Window</a>
        </div>

        <div class="footer">
            <p>You can close this window and try the authorization process again.</p>
        </div>
    </div>

    <script>
        // Allow manual close with escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                window.close();
            }
        });
    </script>
</body>
</html>`;

/**
 * Get the error page response
 */
export function getErrorPageResponse(message?: string): Response {
    const html = message
        ? ERROR_HTML.replace('The authorization process could not be completed successfully.', message)
        : ERROR_HTML;
    return createHtmlResponse(html, 400);
}
