# Twilio Voice Client - Next.js App

A Next.js application that provides a simple UI to make voice calls to your Twilio German agent number using Twilio Client SDK (WebRTC).

## Features

- **WebRTC Calling**: Make calls directly from the browser using Twilio Voice SDK
- **Clean UI**: Modern, responsive interface built with TailwindCSS
- **Real-time Status**: Live call status updates (Connecting, In Call, Call Ended)
- **Caller ID**: Uses your verified Pakistan number (+4981424634018) as caller ID
- **Production Ready**: Complete Next.js 14 setup with TypeScript

## Prerequisites

1. **Twilio Account**: You need a Twilio account with:
   - Account SID
   - API Key and API Secret
   - TwiML Application configured to dial your German agent number
   - Verified phone number (+4981424634018)

2. **TwiML App Setup**: Your TwiML application should be configured in Twilio Console to handle outbound calls to your German agent number.

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Environment Configuration

Create a `.env.local` file in the project root with your Twilio credentials:

```env
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxx
TWILIO_API_KEY=SKxxxxxxxxxxxx
TWILIO_API_SECRET=your_api_secret
TWILIO_APP_SID=APxxxxxxxxxxxx
```

**How to get these values:**

- **TWILIO_ACCOUNT_SID**: Found in your Twilio Console Dashboard
- **TWILIO_API_KEY & TWILIO_API_SECRET**: Create these in Twilio Console → Settings → API Keys
- **TWILIO_APP_SID**: Create a TwiML App in Twilio Console → Voice → TwiML Apps

### 3. TwiML App Configuration

Your TwiML application should have a webhook URL that returns TwiML to dial your German agent number. Example TwiML response:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Dial callerId="+4981424634018">
        <Number>+49XXXXXXXXXX</Number>
    </Dial>
</Response>
```

### 4. Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

1. **Initialize**: The app will automatically initialize the Twilio Device when loaded
2. **Call Agent**: Click the "Call Agent" button to initiate a call
3. **In Call**: The button changes to "Hang Up" during active calls
4. **Status Updates**: Watch the status area for real-time call updates

## Project Structure

```
twilio-client/
├── pages/
│   ├── api/
│   │   └── token.ts          # Twilio Access Token generation
│   ├── _app.tsx              # Next.js app wrapper
│   └── index.tsx             # Main page with calling interface
├── styles/
│   └── globals.css           # Global styles with TailwindCSS
├── package.json              # Dependencies and scripts
├── tsconfig.json             # TypeScript configuration
├── tailwind.config.js        # TailwindCSS configuration
└── next.config.js            # Next.js configuration
```

## API Endpoints

### POST `/api/token`

Generates a Twilio Access Token for the Voice SDK.

**Response:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "identity": "web-client"
}
```

## Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript
- **Styling**: TailwindCSS
- **Voice**: Twilio Voice SDK (@twilio/voice-sdk)
- **Backend**: Next.js API Routes, Twilio Node.js SDK

## Troubleshooting

### Common Issues

1. **"Device not initialized"**: Check your environment variables and ensure they're correct
2. **"Failed to get access token"**: Verify your Twilio credentials and API key permissions
3. **Call fails immediately**: Check your TwiML App configuration and webhook URL
4. **No audio**: Ensure microphone permissions are granted in your browser

### Browser Requirements

- Modern browser with WebRTC support (Chrome, Firefox, Safari, Edge)
- Microphone permissions granted
- HTTPS required for production (localhost works for development)

## Security Notes

- Access tokens are generated server-side and have a 1-hour expiration
- Environment variables are kept secure and not exposed to the client
- The app only allows outgoing calls (no incoming call handling)

## Production Deployment

When deploying to production:

1. Ensure your TwiML App webhook URL is accessible and returns proper TwiML
2. Configure environment variables in your hosting platform
3. Use HTTPS (required for WebRTC)
4. Test thoroughly with your actual German agent number

## Support

For issues with:
- **Twilio Configuration**: Check Twilio Console and documentation
- **Next.js Setup**: Refer to Next.js documentation
- **WebRTC Issues**: Check browser compatibility and permissions




