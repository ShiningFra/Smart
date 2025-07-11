const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const https = require('https');
require('dotenv').config();


const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
    console.error('❌ BOT_TOKEN manquant dans le fichier .env');
    process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });


const TEMP_DIR = './temp';
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR);
}


const downloadFile = (url, filepath) => {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(filepath);
        https.get(url, (response) => {
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve(filepath);
            });
        }).on('error', (err) => {
            fs.unlink(filepath, () => {}); // Supprimer le fichier en cas d'erreur
            reject(err);
        });
    });
};


const cleanupFiles = (...files) => {
    files.forEach(file => {
        if (fs.existsSync(file)) {
            fs.unlinkSync(file);
        }
    });
};


let conversionsCount = 0;
const startTime = Date.now();


const convertToVoiceNote = async (chatId, fileId, fileName) => {
    try {
        
        const fileLink = await bot.getFileLink(fileId);
        
        
        const timestamp = Date.now();
        const tempPath = path.join(TEMP_DIR, `temp_${timestamp}.ogg`);
        
        
        await downloadFile(fileLink, tempPath);
        
        

        await bot.sendVoice(chatId, tempPath, {
            caption: `🎙️ Voice note convertie depuis: ${fileName || 'fichier audio'}`,
            duration: undefined // Telegram calculera automatiquement
        });
        
        
        cleanupFiles(tempPath);
        
        
        conversionsCount++;
        
        return true;
    } catch (error) {
        console.error('Erreur lors de la conversion:', error);
        return false;
    }
};


bot.on('audio', async (msg) => {
    const chatId = msg.chat.id;
    const audio = msg.audio;
    
    try {
        // Envoyer un message de traitement
        const processingMsg = await bot.sendMessage(chatId, '🎵 Conversion en cours...');
        
        
        const success = await convertToVoiceNote(chatId, audio.file_id, audio.title || audio.file_name);
        
        
        await bot.deleteMessage(chatId, processingMsg.message_id);
        
        if (!success) {
            await bot.sendMessage(chatId, '❌ Erreur lors de la conversion. Réessaie avec un autre fichier.');
        }
        
    } catch (error) {
        console.error('Erreur lors du traitement audio:', error);
        await bot.sendMessage(chatId, '❌ Erreur lors de la conversion. Assure-toi que le fichier est un audio valide.');
    }
});


bot.on('document', async (msg) => {
    const chatId = msg.chat.id;
    const document = msg.document;
    
    // Vérifier si c'est un fichier audio
    const audioExtensions = ['.mp3', '.wav', '.flac', '.aac', '.m4a', '.wma', '.ogg', '.opus'];
    const isAudio = audioExtensions.some(ext => 
        document.file_name?.toLowerCase().endsWith(ext)
    ) || document.mime_type?.startsWith('audio/');
    
    if (!isAudio) {
        return; // Ne pas traiter si ce n'est pas un fichier audio
    }
    
    try {
        // Envoyer un message de traitement
        const processingMsg = await bot.sendMessage(chatId, '🎵 Conversion en cours...');
        
        // Convertir en voice note
        const success = await convertToVoiceNote(chatId, document.file_id, document.file_name);
        
        // Supprimer le message de traitement
        await bot.deleteMessage(chatId, processingMsg.message_id);
        
        if (!success) {
            await bot.sendMessage(chatId, '❌ Erreur lors de la conversion. Réessaie avec un autre fichier.');
        }
        
    } catch (error) {
        console.error('Erreur lors du traitement document:', error);
        await bot.sendMessage(chatId, '❌ Erreur lors de la conversion. Assure-toi que le fichier est un audio valide.');
    }
});


bot.on('voice', async (msg) => {
    const chatId = msg.chat.id;
    
    await bot.sendMessage(chatId, '🎙️ C\'est déjà une voice note ! Si tu veux la reconvertir, envoie-la comme fichier audio.');
});


bot.onText(/\/start/, (msg) => {
    const chatId = msg.chat.id;
    const welcomeMessage = `
🎵 *Bot Convertisseur Audio vers Voice Note*

Salut ! Je peux convertir tes fichiers audio en voice notes Telegram.

*Comment utiliser :*
• Envoie-moi un fichier audio (MP3, WAV, FLAC, AAC, etc.)
• Je vais le convertir automatiquement en voice note
• Tu recevras la voice note optimisée pour Telegram

*Formats supportés :*
MP3, WAV, FLAC, AAC, M4A, WMA, OGG, OPUS

*Astuce :* Telegram fait la conversion automatiquement côté serveur, donc pas besoin d'outils externes !

Envoie-moi ton fichier audio pour commencer ! 🎧
    `;
    
    bot.sendMessage(chatId, welcomeMessage, { parse_mode: 'Markdown' });
});


bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    const helpMessage = `
🆘 *Aide - Bot Convertisseur Audio*

*Commandes disponibles :*
• /start - Démarrer le bot
• /help - Afficher cette aide
• /stats - Voir les statistiques

*Utilisation :*
1. Envoie-moi un fichier audio
2. Attends la conversion (quelques secondes)
3. Reçois ta voice note !

*Formats supportés :*
MP3, WAV, FLAC, AAC, M4A, WMA, OGG, OPUS

*Limitations :*
• Taille max : 50MB (limitation Telegram)
• Durée recommandée : < 1 heure

*Note :* Les fichiers sont automatiquement supprimés après conversion pour protéger ta vie privée.
    `;
    
    bot.sendMessage(chatId, helpMessage, { parse_mode: 'Markdown' });
});

// Commande de statistiques
bot.onText(/\/stats/, (msg) => {
    const chatId = msg.chat.id;
    const uptime = Math.floor((Date.now() - startTime) / 1000);
    const hours = Math.floor(uptime / 3600);
    const minutes = Math.floor((uptime % 3600) / 60);
    const seconds = uptime % 60;
    
    const statsMessage = `
📊 *Statistiques du Bot*

🔄 Conversions réalisées : ${conversionsCount}
⏱️ Temps de fonctionnement : ${hours}h ${minutes}m ${seconds}s
🤖 Statut : Opérationnel

*Merci d'utiliser ce bot !* 🎵
    `;
    
    bot.sendMessage(chatId, statsMessage, { parse_mode: 'Markdown' });
});


bot.on('message', (msg) => {
    const chatId = msg.chat.id;
    
    
    if (msg.audio || msg.document || msg.voice || msg.text?.startsWith('/')) {
        return;
    }
    
    
    if (msg.text) {
        bot.sendMessage(chatId, 
            '🎵 Salut ! Envoie-moi un fichier audio et je le convertirai en voice note.\n\n' +
            'Utilise /help pour voir toutes les commandes disponibles.'
        );
    }
});


bot.on('polling_error', (error) => {
    console.error('Erreur de polling:', error);
});

console.log('🤖 Bot démarré ! En attente de fichiers audio...');
console.log(`📱 Nom du bot : @${bot.getMe().then(me => console.log(`Bot: ${me.username}`))}`);


const cleanup = () => {
    console.log('\n🧹 Nettoyage des fichiers temporaires...');
    if (fs.existsSync(TEMP_DIR)) {
        const files = fs.readdirSync(TEMP_DIR);
        files.forEach(file => {
            fs.unlinkSync(path.join(TEMP_DIR, file));
        });
    }
};

process.on('SIGINT', () => {
    cleanup();
    console.log('👋 Bot arrêté proprement');
    process.exit(0);
});

process.on('SIGTERM', () => {
    cleanup();
    console.log('👋 Bot arrêté proprement');
    process.exit(0);
});