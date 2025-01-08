const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

// Remplace 'YOUR_TELEGRAM_BOT_TOKEN' par le token que tu as reçu de BotFather
const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

let messageAuthors = {}; // Stockage des auteurs des messages

// Écoute tous les messages dans le groupe
bot.on('message', (msg) => {
    const chatId = msg.chat.id;

    // Vérifie si le message provient d'un groupe
    if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
        const userId = msg.from.id;

        // Stocke l'auteur du message
        if (!messageAuthors[chatId]) {
            messageAuthors[chatId] = new Set(); // Utiliser Set pour éviter les doublons
        }
        messageAuthors[chatId].add(userId);
    }
});

// Commande pour afficher tous les utilisateurs actifs
bot.onText(/\/active_users/, async (msg) => {
    const chatId = msg.chat.id;

    if (messageAuthors[chatId]) {
        const authors = Array.from(messageAuthors[chatId]);
        const validAuthors = [];

        // Vérifie si chaque auteur est toujours membre du groupe
        for (let authorId of authors) {
            try {
                const member = await bot.getChatMember(chatId, authorId);
                if (member.status === 'member' || member.status === 'administrator' || member.status === 'creator') {
                    validAuthors.push({ id: authorId, firstName: member.user.first_name });
                }
            } catch (error) {
                console.error(`Erreur lors de la vérification de l'auteur ${authorId}:`, error);
            }
        }

        // Afficher les membres valides avec leurs prénoms
        if (validAuthors.length > 0) {
            bot.sendMessage(chatId, "Voici tous les utilisateurs actifs :");
            const mentions = validAuthors.map(({ id, firstName }) => {
                return `<a href="tg://user?id=${id}">${firstName}</a>`;
            }).join(', ');

            const message = `${mentions}`;
            await bot.sendMessage(chatId, message, { parse_mode: 'HTML' });
        } else {
            bot.sendMessage(chatId, "Aucun utilisateur actif à afficher.");
        }
    } else {
        bot.sendMessage(chatId, "Aucun utilisateur actif à afficher.");
    }
});