# E-Paper Clock

A Node.js application that transforms a Linux-based e-paper device into a smart display for time, alerts, and news updates. The system features a web-based clock interface with scheduled content rotation and SSH-based device control.

## Features

- **Browser-based Clock Display**: Renders a modern web interface on the e-paper screen using Puppeteer
- **Scheduled Content Rotation**: Alternates between alerts and news items every 15 minutes
- **Active Hours Scheduling**: Automatically activates between 7:00 AM and 11:00 PM IST
- **Redis-backed Content**: Fetches alerts and news from a Redis database via REST API
- **SSH Control**: Manages the e-paper device remotely using SSH2
- **Display Optimization**: Uses fbink for efficient e-paper rendering with proper refresh modes

## Architecture

The project consists of several key components:

- **main.js**: Core application logic with scheduling and mode management
- **browser.js**: Puppeteer-based browser automation for rendering web content
- **screen.js**: Legacy screen mode for displaying alerts and news
- **connect.js**: SSH connection management for the e-paper device
- **server/**: Express server providing REST endpoints for content delivery
- **helper.js**: Utility functions for display control (backlight, rotation, etc.)
- **time.js**: Time utilities for IST timezone handling

## Prerequisites

- Node.js (v14 or higher)
- Redis server
- Linux-based e-paper device with SSH access and fbink installed
- Network connectivity between the host machine and e-paper device

## Installation

1. Clone the repository:

```bash
git clone https://github.com/aneeshpatne/Clock.git
cd Clock
```

2. Install dependencies:

```bash
npm install
```

3. Configure your e-paper device SSH credentials in `connect.js`

4. Set up Redis and populate content:

```bash
# Start Redis server
redis-server

# Set alert data (example)
redis-cli SET alert '{"message":"Hello World","color":"blue"}'

# Set news items (example)
redis-cli SET news_items '[{"title":"Breaking News","summary":"Summary of the news article"}]'
```

## Usage

### Start the Content Server

```bash
cd server
node server.js
```

The server runs on port 3000 and provides:

- `GET /alert` - Returns current alert from Redis
- `GET /news_items` - Returns a random news item from Redis

### Start the Main Application

```bash
node main.js
```

The application will:

1. Connect to the e-paper device via SSH
2. Start the browser-based clock display (during active hours)
3. Rotate alerts and news every 15 minutes
4. Automatically shutdown display at 11:00 PM
5. Automatically restart display at 7:00 AM

## Configuration

Key configuration options in `main.js`:

```javascript
const ACTIVE_START_HOUR = 7; // Start display at 7:00 AM IST
const ACTIVE_END_HOUR = 23; // Stop display at 11:00 PM IST
const BROWSER_URL = "http://192.168.1.36:8000"; // Clock web interface URL
const NEWS_ENABLED = true; // Enable news rotation
```

## E-Paper Device Setup

Your e-paper device needs:

1. SSH server running
2. fbink installed at `/mnt/us/usbnet/bin/fbink`
3. Custom fonts at `/mnt/us/fonts/` (InstrumentSerif-Regular.ttf)
4. Network connectivity

## Display Modes

### Browser Mode

- Renders a web-based clock interface using Puppeteer
- Active during configured hours (7 AM - 11 PM)
- Efficient partial screen updates

### Legacy Screen Mode

- Displays alerts and news using fbink text rendering
- Alternates content every 15 minutes
- Supports color-coded alerts
- Shows news titles and summaries

## Dependencies

- **express**: Web server for content API
- **ioredis**: Redis client for content storage
- **puppeteer**: Headless browser for rendering
- **ssh2**: SSH client for device control
