// minecraft-bot.js
const mineflayer = require('mineflayer');

// ===== CONFIGURATION =====
const CONFIG = {
    SERVER_IP: 'Nightshade1003.aternos.m',       // e.g., 'play.example.com' or 'localhost'
    PORT: 23136,                       // Default Minecraft port
    BOT_NAME: 'PratiksBot',            // Your bot's username
    PASSWORD: '41234',      // Password for register/login
    VERSION: '1.20.1',                 // Minecraft version
    
    // Register/Login settings
    AUTO_REGISTER: true,               // Set to false if already registered
    COMMAND_DELAY: 3000,               // Delay between commands (ms)
    
    // Chat settings
    CHAT_MESSAGE: 'Hi my owner is Pratik',
    CHAT_INTERVAL: 30000,              // Chat every 30 seconds
    
    // Movement settings
    MOVE_INTERVAL: 20000,              // Move every 20 seconds
    LOG_FILE: 'bot.log'                // Log file location
};

// ===== BOT CLASS =====
class MinecraftBot {
    constructor() {
        this.bot = null;
        this.isLoggedIn = false;
        this.isRegistered = false;
        this.intervals = [];
        this.setupLogging();
        this.createBot();
    }

    setupLogging() {
        const fs = require('fs');
        this.log = (message) => {
            const timestamp = new Date().toISOString();
            const logMessage = `[${timestamp}] ${message}`;
            console.log(logMessage);
            fs.appendFileSync(CONFIG.LOG_FILE, logMessage + '\n', 'utf8');
        };
        this.log('=== Starting Minecraft Bot ===');
    }

    createBot() {
        this.log(`Connecting to ${CONFIG.SERVER_IP}:${CONFIG.PORT}...`);
        
        this.bot = mineflayer.createBot({
            host: CONFIG.SERVER_IP,
            port: CONFIG.PORT,
            username: CONFIG.BOT_NAME,
            version: CONFIG.VERSION,
            auth: 'offline'
        });

        this.setupEventHandlers();
    }

    setupEventHandlers() {
        // Connection events
        this.bot.on('login', () => {
            this.log(`Logged in as ${CONFIG.BOT_NAME}`);
        });

        this.bot.once('spawn', () => {
            this.log('Bot spawned in world');
            this.startActivities();
        });

        // Chat/command events
        this.bot.on('message', (message) => {
            const msg = message.toString().toLowerCase();
            this.log(`[Server] ${message.toString()}`);
            
            // Detect registration prompts
            if (msg.includes('/register') || msg.includes('register')) {
                this.log('Detected registration requirement');
                setTimeout(() => this.registerAccount(), CONFIG.COMMAND_DELAY);
            }
            
            // Detect login prompts
            if (msg.includes('/login') || msg.includes('login') || msg.includes('log in')) {
                this.log('Detected login requirement');
                setTimeout(() => this.loginAccount(), CONFIG.COMMAND_DELAY);
            }
            
            // Detect successful login
            if (msg.includes('successfully') || msg.includes('logged in') || msg.includes('welcome')) {
                this.isLoggedIn = true;
                this.log('Successfully logged in!');
            }
        });

        this.bot.on('whisper', (username, message) => {
            this.log(`[Whisper from ${username}] ${message}`);
        });

        // Error/disconnect events
        this.bot.on('end', (reason) => {
            this.log(`Disconnected: ${reason}`);
            this.cleanup();
            this.reconnect();
        });

        this.bot.on('kicked', (reason) => {
            this.log(`Kicked: ${reason}`);
        });

        this.bot.on('error', (err) => {
            this.log(`Error: ${err.message}`);
        });

        // Server commands response
        this.bot.on('serverAuth', () => {
            this.log('Server requires authentication');
        });
    }

    // ===== REGISTER/LOGIN FUNCTIONS =====
    async registerAccount() {
        if (this.isRegistered && !CONFIG.AUTO_REGISTER) {
            this.log('Skipping registration (already registered)');
            return;
        }
        
        this.log(`Registering account with password: ${CONFIG.PASSWORD}`);
        
        // Try different register command formats
        const registerCommands = [
            `/register ${CONFIG.PASSWORD} ${CONFIG.PASSWORD}`,
            `/register ${CONFIG.PASSWORD}`,
            `/auth register ${CONFIG.PASSWORD} ${CONFIG.PASSWORD}`,
            `register ${CONFIG.PASSWORD} ${CONFIG.PASSWORD}`
        ];
        
        for (let cmd of registerCommands) {
            this.log(`Trying: ${cmd}`);
            this.bot.chat(cmd);
            await this.sleep(2000);
        }
        
        this.isRegistered = true;
        this.log('Registration attempt completed');
        
        // Try to login after registration
        setTimeout(() => this.loginAccount(), CONFIG.COMMAND_DELAY);
    }

    async loginAccount() {
        if (this.isLoggedIn) {
            this.log('Skipping login (already logged in)');
            return;
        }
        
        this.log(`Logging in with password: ${CONFIG.PASSWORD}`);
        
        // Try different login command formats
        const loginCommands = [
            `/login ${CONFIG.PASSWORD}`,
            `/l ${CONFIG.PASSWORD}`,
            `/auth login ${CONFIG.PASSWORD}`,
            `login ${CONFIG.PASSWORD}`,
            `/log ${CONFIG.PASSWORD}`
        ];
        
        for (let cmd of loginCommands) {
            this.log(`Trying: ${cmd}`);
            this.bot.chat(cmd);
            await this.sleep(2000);
        }
        
        this.isLoggedIn = true;
        this.log('Login attempt completed');
    }

    // ===== ACTIVITIES =====
    startActivities() {
        // Auto-register/login on spawn
        setTimeout(() => {
            if (CONFIG.AUTO_REGISTER && !this.isRegistered) {
                this.registerAccount();
            } else if (!this.isLoggedIn) {
                this.loginAccount();
            }
        }, 5000);

        // Periodic chatting
        const chatInterval = setInterval(() => {
            if (this.bot.player) {
                this.bot.chat(CONFIG.CHAT_MESSAGE);
                this.log(`Chatted: ${CONFIG.CHAT_MESSAGE}`);
            }
        }, CONFIG.CHAT_INTERVAL);
        this.intervals.push(chatInterval);

        // Random movement (anti-AFK)
        const moveInterval = setInterval(() => {
            if (this.bot.entity) {
                this.randomMovement();
            }
        }, CONFIG.MOVE_INTERVAL);
        this.intervals.push(moveInterval);

        // Health monitoring
        const healthInterval = setInterval(() => {
            this.log(`Position: ${JSON.stringify(this.bot.entity.position)}`);
            this.log(`Logged in: ${this.isLoggedIn}, Registered: ${this.isRegistered}`);
        }, 60000);
        this.intervals.push(healthInterval);
    }

    randomMovement() {
        const actions = [
            () => this.bot.setControlState('forward', true),
            () => this.bot.setControlState('back', true),
            () => this.bot.setControlState('left', true),
            () => this.bot.setControlState('right', true),
            () => this.bot.setControlState('jump', true)
        ];
        
        const action = actions[Math.floor(Math.random() * actions.length)];
        action();
        
        setTimeout(() => {
            if (this.bot.entity) {
                this.bot.clearControlStates();
            }
        }, 1000);
        
        this.log('Random movement performed');
    }

    // ===== UTILITIES =====
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    cleanup() {
        this.intervals.forEach(interval => clearInterval(interval));
        this.intervals = [];
        this.isLoggedIn = false;
    }

    reconnect() {
        this.log('Reconnecting in 10 seconds...');
        setTimeout(() => {
            this.createBot();
        }, 10000);
    }
}

// ===== START THE BOT =====
new MinecraftBot();

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down bot...');
    process.exit();
});