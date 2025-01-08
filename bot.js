const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const token = process.env.TELEGRAM_BOT_TOKEN;
const bot = new TelegramBot(token, { polling: true });

const users = {}; // Stockage des utilisateurs et leurs stats
const gameMasters = new Set(); // Stockage des Game Masters
let currentQuiz = null; // Stockage du quiz actuel
const waitingForQuestion = new Set(); // Stockage des Game Masters en attente d'une question

// Récupérer l'ID du Game Master depuis .env
const defaultGameMasterId = process.env.DEFAULT_GAME_MASTER_ID;

// Ajouter le Game Master par défaut
if (defaultGameMasterId) {
    gameMasters.add(defaultGameMasterId);
    console.log(`Game Master par défaut ajouté: ${defaultGameMasterId}`);
} else {
    console.error("Aucun ID de Game Master par défaut trouvé dans .env");
}

// Log de démarrage
console.log("Bot démarré. En attente de messages...");

// Fonction pour obtenir la mention des Game Masters par ID
function getGameMasterMentions() {
    return Array.from(gameMasters).map(id => `tg://user?id=${id}`).join(', ');
}

// Commande pour démarrer un quiz
bot.onText(/\/quiz(@FGameFra_bot)?/, (msg) => {
    const userId = msg.from.id;
    console.log(`ID de l'utilisateur qui demande /quiz: ${userId}`);

    if (!gameMasters.has(userId.toString())) {
        const mentions = getGameMasterMentions();
        const responseMessage = mentions.length > 0 
            ? `Seul un Game Master peut démarrer un quiz. Game Masters: ${mentions}` 
            : "Seul un Game Master peut démarrer un quiz.";
        
        return bot.sendMessage(msg.chat.id, responseMessage, {
            reply_to_message_id: msg.message_id,
            disable_web_page_preview: true
        });
    }

    bot.sendMessage(msg.chat.id, "Un quiz a été lancé ! Utilisez /question pour poser une question.")
        .then(sentMessage => {
            // Épingler le message
            bot.pinChatMessage(msg.chat.id, sentMessage.message_id).catch(err => {
                console.error("Erreur lors de l'épinglage du message:", err);
            });
        });
});

// Commande pour poser une question
bot.onText(/\/question(@FGameFra_bot)?/, (msg) => {
    const userId = msg.from.id;

    if (!gameMasters.has(userId.toString())) {
        return bot.sendMessage(msg.chat.id, "Seul un Game Master peut poser une question.", {
            reply_to_message_id: msg.message_id
        });
    }

    // Indiquer que le Game Master attend une question
    waitingForQuestion.add(userId);
    bot.sendMessage(msg.chat.id, "Veuillez envoyer votre question maintenant.");
});

// Écoute des messages pour les Game Masters en attente d'une question
bot.on('message', (msg) => {
    const userId = msg.from.id;

    if (waitingForQuestion.has(userId)) {
        const question = msg.text;
        currentQuiz = { question };

        bot.sendMessage(msg.chat.id, `Question épinglée: ${question}`)
            .then(sentMessage => {
                // Épingler le message de question
                bot.pinChatMessage(msg.chat.id, sentMessage.message_id).catch(err => {
                    console.error("Erreur lors de l'épinglage du message:", err);
                });
            });

        // Retirer l'utilisateur de la liste d'attente
        waitingForQuestion.delete(userId);
    }
});

// Commande pour gagner
bot.onText(/\/win/, (msg) => {
    const userId = msg.reply_to_message.from.id; // ID de l'utilisateur qui a répondu

    if (currentQuiz) {
        addPoints(userId, 10); // 10 points par exemple
        bot.sendMessage(msg.chat.id, `${msg.reply_to_message.from.first_name} a gagné 10 points !`, {
            reply_to_message_id: msg.message_id
        });
    }
});

// Commande pour annuler la question
bot.onText(/\/cancel(@FGameFra_bot)?/, (msg) => {
    const userId = msg.from.id;

    if (!gameMasters.has(userId.toString())) {
        return bot.sendMessage(msg.chat.id, "Seul un Game Master peut annuler une question.", {
            reply_to_message_id: msg.message_id
        });
    }

    currentQuiz = null;
    bot.sendMessage(msg.chat.id, "La question a été annulée.", {
        reply_to_message_id: msg.message_id
    });
});

// Commande pour terminer le quiz
bot.onText(/\/end(@FGameFra_bot)?/, (msg) => {
    const userId = msg.from.id;

    if (!gameMasters.has(userId.toString())) {
        return bot.sendMessage(msg.chat.id, "Seul un Game Master peut terminer le quiz.", {
            reply_to_message_id: msg.message_id
        });
    }

    currentQuiz = null;
    bot.sendMessage(msg.chat.id, "Le quiz est terminé. Merci à tous d'avoir participé !", {
        reply_to_message_id: msg.message_id
    });
});

// Commande pour afficher les Game Masters
bot.onText(/\/gamemasters(@FGameFra_bot)?/, (msg) => {
    const userId = msg.from.id;

    if (!gameMasters.has(userId.toString())) {
        return bot.sendMessage(msg.chat.id, "Seul un Game Master peut voir la liste des Game Masters.", {
            reply_to_message_id: msg.message_id
        });
    }

    const mastersList = Array.from(gameMasters).map(id => `tg://user?id=${id}`).join(', ');
    bot.sendMessage(msg.chat.id, `Game Masters: ${mastersList}`, {
        reply_to_message_id: msg.message_id,
        disable_web_page_preview: true
    });
});

// Fonction pour ajouter des points à un utilisateur
function addPoints(userId, points) {
    if (!users[userId]) {
        users[userId] = { points: 0, level: 1 };
    }
    users[userId].points += points;

    // Vérifier le niveau
    const currentPoints = users[userId].points;
    const currentLevel = users[userId].level;

    if (currentPoints >= currentLevel * 30) {
        users[userId].level += 1;
        bot.sendMessage(
            users[userId].chatId, 
            `Félicitations ${users[userId].firstName}! Vous avez atteint le niveau ${users[userId].level} ! 🎉`
        );
    }
}

// Gestion des erreurs de polling
bot.on("polling_error", (error) => {
    console.error("Erreur de polling:", error);
});