const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
// Import conditionnel pour supporter différentes versions de file-type
let fileType;
try {
    fileType = require('file-type');
} catch (error) {
    console.log('⚠️  file-type non disponible, utilisation de la détection basique');
}

// Configuration
const CONFIG = {
    token: '7660800869:AAGC77AKLInARiKtXmXqUlBSe9nZiT6lO_4',
    stickerDir: path.join(__dirname, 'stickers'),
    maxRetries: 3,
    timeout: 30000
};

// Initialisation du bot
const bot = new TelegramBot(CONFIG.token, { 
    polling: true,
    request: {
        timeout: CONFIG.timeout
    }
});

/**
 * Crée le répertoire de stockage des stickers s'il n'existe pas
 */
async function createStickerDirectory() {
    try {
        await fs.access(CONFIG.stickerDir);
    } catch {
        await fs.mkdir(CONFIG.stickerDir, { recursive: true });
        console.log(`📁 Répertoire créé: ${CONFIG.stickerDir}`);
    }
}

/**
 * Détecte le type de fichier de manière compatible avec différentes versions
 */
async function detectFileType(buffer) {
    try {
        if (!fileType) {
            // Fallback : détection basique basée sur les magic numbers
            return detectFileTypeBasic(buffer);
        }
        
        // Essayer d'abord la version moderne (ESM)
        if (typeof fileType.fromBuffer === 'function') {
            return await fileType.fromBuffer(buffer);
        }
        
        // Essayer la version ancienne (CommonJS)
        if (typeof fileType === 'function') {
            return await fileType(buffer);
        }
        
        // Si aucune méthode ne fonctionne, utiliser la détection basique
        return detectFileTypeBasic(buffer);
        
    } catch (error) {
        console.log('⚠️  Erreur détection file-type, utilisation du fallback');
        return detectFileTypeBasic(buffer);
    }
}

/**
 * Génère un nom de fichier unique basé sur la date et l'ID du fichier
 */
function generateFileName(fileId) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const shortId = fileId.substring(0, 8);
    return `sticker_${timestamp}_${shortId}`;
}

/**
 * Télécharge un sticker avec gestion des erreurs et retry
 */
async function downloadSticker(fileId, retryCount = 0) {
    try {
        // Récupérer les informations sur le fichier
        const file = await bot.getFile(fileId);
        const fileUrl = `https://api.telegram.org/file/bot${CONFIG.token}/${file.file_path}`;
        
        // Télécharger le fichier
        const response = await axios({
            method: 'GET',
            url: fileUrl,
            responseType: 'arraybuffer',
            timeout: CONFIG.timeout,
            headers: {
                'User-Agent': 'TelegramStickerBot/1.0'
            }
        });

        // Déterminer le type de fichier et l'extension
        const type = await detectFileType(response.data);
        const extension = type?.ext || 'webp'; // Les stickers Telegram sont généralement en webp
        
        // Générer le nom de fichier complet
        const fileName = generateFileName(fileId);
        const fullPath = path.join(CONFIG.stickerDir, `${fileName}.${extension}`);
        
        // Sauvegarder le fichier
        await fs.writeFile(fullPath, response.data);
        
        return {
            success: true,
            path: fullPath,
            size: response.data.length,
            type: type?.mime || 'unknown'
        };
        
    } catch (error) {
        if (retryCount < CONFIG.maxRetries) {
            console.log(`⚠️  Tentative ${retryCount + 1} échouée, retry dans 2s...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
            return downloadSticker(fileId, retryCount + 1);
        }
        
        throw error;
    }
}

/**
 * Formate la taille du fichier pour l'affichage
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Gestionnaire d'événements pour les stickers
bot.on('sticker', async (msg) => {
    const chatId = msg.chat.id;
    const fileId = msg.sticker.file_id;
    const emoji = msg.sticker.emoji || '🎨';
    
    console.log(`\n📨 Nouveau sticker reçu:`);
    console.log(`   Chat ID: ${chatId}`);
    console.log(`   File ID: ${fileId}`);
    console.log(`   Emoji: ${emoji}`);
    
    try {
        // Envoyer un message de confirmation
        await bot.sendMessage(chatId, '⏳ Téléchargement du sticker en cours...');
        
        // Télécharger le sticker
        const result = await downloadSticker(fileId);
        
        if (result.success) {
            const successMessage = `✅ Sticker sauvegardé avec succès!\n\n` +
                                 `📁 Fichier: ${path.basename(result.path)}\n` +
                                 `📊 Taille: ${formatFileSize(result.size)}\n` +
                                 `🎯 Type: ${result.type}\n` +
                                 `${emoji} Emoji: ${emoji}`;
            
            await bot.sendMessage(chatId, successMessage);
            
            console.log(`✅ Sticker sauvegardé: ${result.path}`);
            console.log(`   Taille: ${formatFileSize(result.size)}`);
            console.log(`   Type: ${result.type}`);
        }
        
    } catch (error) {
        console.error(`❌ Erreur lors du téléchargement:`, error.message);
        
        const errorMessage = `❌ Erreur lors du téléchargement du sticker.\n\n` +
                            `Détails: ${error.message}`;
        
        await bot.sendMessage(chatId, errorMessage);
    }
});

// Gestionnaire d'événements pour les messages texte
bot.on('message', async (msg) => {
    if (msg.text && !msg.sticker) {
        const chatId = msg.chat.id;
        const text = msg.text.toLowerCase();
        
        if (text === '/start' || text === '/help') {
            const helpMessage = `🤖 **Bot Téléchargeur de Stickers**\n\n` +
                               `Envoyez-moi simplement un sticker et je le sauvegarderai automatiquement!\n\n` +
                               `📁 Répertoire: ${CONFIG.stickerDir}\n` +
                               `⚡ Commandes disponibles:\n` +
                               `   • /start - Afficher ce message\n` +
                               `   • /help - Afficher l'aide\n` +
                               `   • /stats - Statistiques du bot`;
            
            await bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
        }
        
        if (text === '/stats') {
            try {
                const files = await fs.readdir(CONFIG.stickerDir);
                const stickerCount = files.filter(f => f.startsWith('sticker_')).length;
                
                const statsMessage = `📊 **Statistiques du Bot**\n\n` +
                                   `🎨 Stickers sauvegardés: ${stickerCount}\n` +
                                   `📁 Répertoire: ${CONFIG.stickerDir}\n` +
                                   `🕐 Uptime: ${process.uptime().toFixed(0)}s`;
                
                await bot.sendMessage(chatId, statsMessage, { parse_mode: 'Markdown' });
            } catch (error) {
                await bot.sendMessage(chatId, '❌ Erreur lors de la récupération des statistiques.');
            }
        }
    }
});

// Gestionnaire d'erreurs global
bot.on('error', (error) => {
    console.error('❌ Erreur du bot:', error);
});

bot.on('polling_error', (error) => {
    console.error('❌ Erreur de polling:', error);
});

// Initialisation
async function initializeBot() {
    try {
        await createStickerDirectory();
        
        const botInfo = await bot.getMe();
        console.log(`🤖 Bot initialisé avec succès!`);
        console.log(`   Nom: ${botInfo.first_name}`);
        console.log(`   Username: @${botInfo.username}`);
        console.log(`   ID: ${botInfo.id}`);
        console.log(`📁 Répertoire de stockage: ${CONFIG.stickerDir}`);
        console.log(`🚀 Bot en cours d'exécution...\n`);
        
    } catch (error) {
        console.error('❌ Erreur lors de l\'initialisation:', error);
        process.exit(1);
    }
}

// Gestion propre de l'arrêt
process.on('SIGINT', async () => {
    console.log('\n🛑 Arrêt du bot...');
    await bot.stopPolling();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Arrêt du bot...');
    await bot.stopPolling();
    process.exit(0);
});

// Démarrer le bot
initializeBot();