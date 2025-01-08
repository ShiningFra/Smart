const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const fileType = require('file-type');

// Remplace 'YOUR_TELEGRAM_BOT_TOKEN' par le token que tu as reçu de BotFather
const token = '7884169550:AAFmOQ3tqa12tdO0EZ5_XWLQpkMaL2EhI60';
const bot = new TelegramBot(token, { polling: true });
// Répertoire pour sauvegarder les stickers
const stickerDir = path.join(__dirname, 'sticker1');

// Créer le répertoire si nécessaire
if (!fs.existsSync(stickerDir)) {
    fs.mkdirSync(stickerDir);
}

// Écouter les stickers reçus
bot.on('sticker', async (msg) => {
    const fileId = msg.sticker.file_id;

    // Récupérer les informations sur le fichier
    const file = await bot.getFile(fileId);
    const filePath = file.file_path;
    const url = `https://api.telegram.org/file/bot${token}/${filePath}`;
    
    // Nom de fichier sans extension
    const fileName = path.join(stickerDir, fileId); // Utiliser fileId comme nom de fichier

    try {
        // Télécharger le sticker
        const response = await axios({
            method: 'get',
            url,
            responseType: 'arraybuffer' // Utiliser arraybuffer pour analyser le type de fichier
        });

        // Déterminer le type de fichier
        const type = await fileType.fromBuffer(response.data); // Utilisation asynchrone
        const extension = type ? type.ext : 'bin'; // Utiliser 'bin' par défaut si le type est inconnu

        // Sauvegarder le fichier avec l'extension appropriée
        const completeFileName = `${fileName}.${extension}`;
        fs.writeFileSync(completeFileName, response.data);
        console.log(`Sticker sauvegardé sous: ${completeFileName}`);
    } catch (error) {
        console.error('Erreur lors du téléchargement du sticker:', error);
    }
});
