const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const token = process.env.TELEGRAM_BOT_TOKEN1;
const bot = new TelegramBot(token, { polling: true });

const users = {}; // Stockage des utilisateurs et leurs stats
const gameMasters = new Set(); // Stockage des Game Masters
let currentQuestions = []; // Tableau pour stocker les questions
let isSaving = false; // Indique si nous sommes en mode d'enregistrement
let currentQuestionIndex = 0; // Suivi de l'index de la question actuelle
let onQuiz = false; // Indique si un quiz est en cours

// Récupérer l'ID du Game Master depuis .env
const defaultGameMasterId = process.env.DEFAULT_GAME_MASTER_ID1;

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

// Commande pour commencer à enregistrer des questions
bot.onText(/\/startsaving(@FGameFra_bot)?/, (msg) => {
    const userId = msg.from.id;

    if (!gameMasters.has(userId.toString())) {
        return bot.sendMessage(msg.chat.id, "⚠️ Seul un Game Master peut commencer à enregistrer des questions.", {
            reply_to_message_id: msg.message_id
        });
    }

    isSaving = true;
    currentQuestions = [];
    currentQuestionIndex = 0;

    bot.sendMessage(msg.chat.id, "📝 Enregistrement des questions commencé. Envoyez votre question en privé.");
});

// Commande pour arrêter l'enregistrement des questions
bot.onText(/\/stopsaving(@FGameFra_bot)?/, (msg) => {
    const userId = msg.from.id;

    if (!gameMasters.has(userId.toString())) {
        return bot.sendMessage(msg.chat.id, "⚠️ Seul un Game Master peut arrêter l'enregistrement des questions.", {
            reply_to_message_id: msg.message_id
        });
    }

    isSaving = false;
    bot.sendMessage(msg.chat.id, "✅ Enregistrement des questions arrêté. Questions sauvegardées :\n" + currentQuestions.join('\n'));
});

// Écoute des messages pour enregistrer les questions
bot.on('message', (msg) => {
    const userId = msg.from.id;

    // Ignore les commandes et ne sauvegarde que les messages de texte normaux
    if (isSaving && gameMasters.has(userId.toString()) && msg.text && !msg.text.startsWith('/')) {
        const question = msg.text;
        currentQuestions.push(question);
        bot.sendMessage(userId, `✅ Question sauvegardée : ${question}`);
        bot.sendMessage(userId, "👉 Veuillez envoyer la prochaine question en privé.");
    }

    // Si le quiz est en cours, poser la question suivante
    if (onQuiz && currentQuestionIndex < currentQuestions.length) {
        const questionToAsk = currentQuestions[currentQuestionIndex];
        bot.sendMessage(msg.chat.id, `🔍 Question à poser : ${questionToAsk}`);
        currentQuestionIndex++;
    }
});

// Commande pour commencer le quiz
bot.onText(/\/quiz(@FGameFra_bot)?/, (msg) => {
    const userId = msg.from.id;

    if (!gameMasters.has(userId.toString())) {
        return bot.sendMessage(msg.chat.id, "⚠️ Seul un Game Master peut démarrer un quiz.", {
            reply_to_message_id: msg.message_id
        });
    }

    if (currentQuestions.length === 0) {
        return bot.sendMessage(msg.chat.id, "🚫 Pas de questions disponibles. Utilisez /startsaving pour ajouter des questions.", {
            reply_to_message_id: msg.message_id
        });
    }

    // Mélanger les questions
    currentQuestions = currentQuestions.sort(() => 0.5 - Math.random());
    currentQuestionIndex = 0;
    onQuiz = true;

    bot.sendMessage(msg.chat.id, "🎉 Le quiz a commencé ! Utilisez /next pour passer à la question suivante.");
});

// Commande pour arrêter le quiz
bot.onText(/\/stopquiz(@FGameFra_bot)?/, (msg) => {
    const userId = msg.from.id;

    if (!gameMasters.has(userId.toString())) {
        return bot.sendMessage(msg.chat.id, "⚠️ Seul un Game Master peut arrêter le quiz.", {
            reply_to_message_id: msg.message_id
        });
    }

    onQuiz = false; // Fin du quiz
    currentQuestions = []; // Réinitialiser les questions
    bot.sendMessage(msg.chat.id, "🛑 Le quiz a été arrêté. Merci d'avoir participé !");
});

// Commande pour valider une réponse
bot.onText(/\/win/, (msg) => {
    const userId = msg.reply_to_message.from.id; // ID de l'utilisateur qui a répondu

    if (onQuiz) {
        bot.sendMessage(msg.chat.id, `🏆 WINNER : ${msg.reply_to_message.from.first_name} [@${msg.reply_to_message.from.username}] 🎉`, {
            reply_to_message_id: msg.message_id
        });
    } else {
        bot.sendMessage(msg.chat.id, "🚫 Aucun quiz en cours pour valider une réponse.", {
            reply_to_message_id: msg.message_id
        });
    }
});

// Commande pour passer à la question suivante
bot.onText(/\/next(@FGameFra_bot)?/, (msg) => {
    const userId = msg.from.id;

    if (!gameMasters.has(userId.toString())) {
        return bot.sendMessage(msg.chat.id, "⚠️ Seul un Game Master peut passer à la question suivante.", {
            reply_to_message_id: msg.message_id
        });
    }

    if (!onQuiz) {
        return bot.sendMessage(msg.chat.id, "🚫 Aucun quiz en cours.", {
            reply_to_message_id: msg.message_id
        });
    }

    if (currentQuestionIndex < currentQuestions.length) {
        const questionToAsk = currentQuestions[currentQuestionIndex];
        bot.sendMessage(msg.chat.id, `🔍 Question suivante : ${questionToAsk}`);
        currentQuestionIndex++;
    } else {
        bot.sendMessage(msg.chat.id, "🏁 THE END. Merci d'avoir participé au quiz ! 🎊", {
            reply_to_message_id: msg.message_id
        });
        onQuiz = false; // Fin du quiz
        currentQuestions = []; // Réinitialiser les questions
    }
});

// Commande pour promouvoir un utilisateur comme Game Master
bot.onText(/\/makegod(@FGameFra_bot)?/, (msg) => {
    const userId = msg.from.id;

    if (!gameMasters.has(userId.toString())) {
        return bot.sendMessage(msg.chat.id, "⚠️ Seul un Game Master peut promouvoir un utilisateur.", {
            reply_to_message_id: msg.message_id
        });
    }

    const replyToMessage = msg.reply_to_message;
    if (replyToMessage && replyToMessage.from) {
        const promotedUserId = replyToMessage.from.id;
        gameMasters.add(promotedUserId);
        bot.sendMessage(msg.chat.id, `🎉 L'utilisateur ${replyToMessage.from.first_name} a été promu comme Game Master ! 🎊`);
    } else {
        bot.sendMessage(msg.chat.id, "🚫 Veuillez répondre à un message d'un utilisateur pour le promouvoir.");
    }
});

// Commande pour afficher les Game Masters
bot.onText(/\/gamemasters(@FGameFra_bot)?/, (msg) => {
    const userId = msg.from.id;

    if (!gameMasters.has(userId.toString())) {
        return bot.sendMessage(msg.chat.id, "⚠️ Seul un Game Master peut voir la liste des Game Masters.", {
            reply_to_message_id: msg.message_id
        });
    }

    const mastersList = Array.from(gameMasters).map(id => `tg://user?id=${id}`).join(', ');
    bot.sendMessage(msg.chat.id, `👥 Game Masters: ${mastersList}`, {
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
            `🎉 Félicitations ${users[userId].firstName}! Vous avez atteint le niveau ${users[userId].level} ! 🎊`
        );
    }
}

// Gestion des erreurs de polling
bot.on("polling_error", (error) => {
    console.error("Erreur de polling:", error);
});