const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();

const token = process.env.TELEGRAM_BOT_TOKEN1;
const bot = new TelegramBot(token, { polling: true });

const users = {}; // Stockage des utilisateurs et leurs stats
const gameMasters = new Set(); // Stockage des Game Masters
const joinedUsers = new Set(); // Stockage des utilisateurs ayant rejoint
let currentQuestions = []; // Tableau pour stocker les questions
let isSaving = false; // Indique si nous sommes en mode d'enregistrement
let currentQuestionIndex = 0; // Suivi de l'index de la question actuelle
let onQuiz = false; // Indique si un quiz est en cours
let answeredQuestions = new Set(); // Stockage des questions déjà répondues

// Récupérer l'ID du Game Master depuis .env
const defaultGameMasterId = process.env.DEFAULT_GAME_MASTER_ID1;
const defaultGameMasterId1 = process.env.DEFAULT_GAME_MASTER_ID2;
const defaultGameMasterId2 = process.env.DEFAULT_GAME_MASTER_ID3;

// Ajouter le Game Master par défaut
if (defaultGameMasterId) {
    gameMasters.add(defaultGameMasterId);
    console.log(`Game Master par défaut ajouté: ${defaultGameMasterId}`);
} else {
    console.error("Aucun ID de Game Master par défaut trouvé dans .env");
}
if (defaultGameMasterId1) {
    gameMasters.add(defaultGameMasterId1);
    console.log(`Game Master par défaut ajouté: ${defaultGameMasterId1}`);
} else {
    console.error("Aucun ID de Game Master par défaut trouvé dans .env");
}
if (defaultGameMasterId2) {
    gameMasters.add(defaultGameMasterId2);
    console.log(`Game Master par défaut ajouté: ${defaultGameMasterId2}`);
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

    // Vérifier si le message est en privé
    const isPrivateChat = msg.chat.type === 'private';

    // Ignore les commandes et ne sauvegarde que les messages de texte normaux
    if (isSaving && gameMasters.has(userId.toString()) && isPrivateChat && msg.text && !msg.text.startsWith('/')) {
        const question = msg.text;
        currentQuestions.push(question);
        bot.sendMessage(userId, `✅ Question sauvegardée : ${question}`);
        bot.sendMessage(userId, "👉 Veuillez envoyer la prochaine question en privé.");
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
    answeredQuestions.clear(); // Réinitialiser les questions répondues

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
        if (gameMasters.has(promotedUserId.toString())) {
            return bot.sendMessage(msg.chat.id, "🚫 Cet utilisateur est déjà un Game Master.");
        }
        gameMasters.add(promotedUserId);
        bot.sendMessage(msg.chat.id, `🎉 L'utilisateur ${replyToMessage.from.first_name} a été promu comme Game Master ! 🎊`);
    } else {
        bot.sendMessage(msg.chat.id, "🚫 Veuillez répondre à un message d'un utilisateur pour le promouvoir.");
    }
});

// Commande pour afficher les Game Masters
// Commande pour afficher les Game Masters
bot.onText(/\/gamemasters(@FGameFra_bot)?/, (msg) => {
    const userId = msg.from.id;

    if (!gameMasters.has(userId.toString())) {
        return bot.sendMessage(msg.chat.id, "⚠️ Seul un Game Master peut voir la liste des Game Masters.", {
            reply_to_message_id: msg.message_id
        });
    }

    const mastersList = Array.from(gameMasters).map(id => `<a href="tg://user?id=${id}">${id}</a>`).join(', ');
    bot.sendMessage(msg.chat.id, `👥 Game Masters: ${mastersList}`, {
        reply_to_message_id: msg.message_id,
        parse_mode: 'HTML' // Utiliser le mode HTML pour les liens
    });
});

// Commande pour rejoindre le quiz
bot.onText(/\/join(@FGameFra_bot)?/, (msg) => {
    const userId = msg.from.id;

    if (gameMasters.has(userId.toString())) {
        return bot.sendMessage(msg.chat.id, "🚫 Les Game Masters ne peuvent pas rejoindre le quiz.");
    }

    if (!joinedUsers.has(userId)) {
        joinedUsers.add(userId);
        users[userId] = {
            points: 0,
            level: 1,
            firstName: msg.from.first_name || "Inconnu", // Récupérer le prénom
            username: msg.from.username || "Inconnu" // Récupérer le nom d'utilisateur
        };
        bot.sendMessage(msg.chat.id, `✅ Vous avez rejoint le quiz !`);
    } else {
        bot.sendMessage(msg.chat.id, `🚫 Vous êtes déjà inscrit au quiz.`);
    }
});

// Commande pour valider une réponse
bot.onText(/\/win/, (msg) => {
    const userId = msg.reply_to_message.from.id; // ID de l'utilisateur qui a répondu
    const Id = msg.from.id;

    if (!gameMasters.has(Id.toString())) {
        return bot.sendMessage(msg.chat.id, "⚠️ Seul un Game Master peut valider une réponse.", {
            reply_to_message_id: msg.message_id
        });
    }

    if (!onQuiz) {
        return bot.sendMessage(msg.chat.id, "🚫 Aucun quiz en cours pour valider une réponse.", {
            reply_to_message_id: msg.message_id
        });
    }

    if (!joinedUsers.has(userId)) {
        return bot.sendMessage(msg.chat.id, "🚫 Ce joueur n'est pas inscrit au quiz.", {
            reply_to_message_id: msg.message_id
        });
    }

    if (answeredQuestions.has(currentQuestionIndex)) {
        return bot.sendMessage(msg.chat.id, "🚫 Cette question a déjà été répondue.", {
            reply_to_message_id: msg.message_id
        });
    }

    // Ajouter 5 points au joueur gagnant
    addPoints(userId, 5);
    answeredQuestions.add(currentQuestionIndex);
    bot.sendMessage(msg.chat.id, `🏆 WINNER : ${msg.reply_to_message.from.first_name} [@${msg.reply_to_message.from.username}] 🎉`, {
        reply_to_message_id: msg.message_id
    }); 
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

// Commande pour afficher les joueurs, leurs points et leurs niveaux
bot.onText(/\/players(@FGameFra_bot)?/, (msg) => {
    const userId = msg.from.id;

    if (!gameMasters.has(userId.toString())) {
        return bot.sendMessage(msg.chat.id, "⚠️ Seul un Game Master peut voir la liste des joueurs.", {
            reply_to_message_id: msg.message_id
        });
    }

    if (Object.keys(users).length === 0) {
        return bot.sendMessage(msg.chat.id, "🚫 Aucun joueur n'a encore participé au quiz.", {
            reply_to_message_id: msg.message_id
        });
    }

    const playersList = Object.entries(users)
        .map(([id, data]) => {
            const usernameLink = data.username ? `<a href="tg://user?id=${id}">${data.firstName}</a>` : data.firstName;
            return `👤 ${usernameLink}: ${data.points} points, Niveau ${data.level}`;
        })
        .join('\n');

    bot.sendMessage(msg.chat.id, `📊 Joueurs et leurs stats:\n${playersList}`, {
        reply_to_message_id: msg.message_id,
        parse_mode: 'HTML' // Utiliser le mode HTML pour les liens
    });
});

// Gestion des erreurs de polling
bot.on("polling_error", (error) => {
    console.error("Erreur de polling:", error);
});