const TelegramBot = require('node-telegram-bot-api');
const token = '7635135897:AAHmj4Nmanh15Zavn5tnSqkdedRbRwH9zsU';  // Remplacez par votre token de bot
const bot = new TelegramBot(token, { polling: true });

// Commande pour démarrer la sélection des couples
bot.onText(/\/chooseCouples/, async (msg) => {
  const chatId = msg.chat.id;

  try {
    // Récupérer la liste des membres du groupe
    const members = await getAllMembers(chatId);
    if (members.length < 2) {
      bot.sendMessage(chatId, 'Pas assez de membres dans le groupe pour former un couple.');
      return;
    }

    // Mélanger la liste des membres pour choisir au hasard
    const shuffledMembers = members.sort(() => 0.5 - Math.random());

    // Choisir les couples (en prenant deux membres à la fois)
    const couples = [];
    while (shuffledMembers.length >= 2) {
      const first = shuffledMembers.pop();
      const second = shuffledMembers.pop();
      couples.push([first, second]);
    }

    // Envoyer les couples formés au groupe
    let message = 'Voici les couples choisis au hasard :\n';
    couples.forEach((couple, index) => {
      message += `Couple ${index + 1}: @${getUserNameById(couple[0])} et @${getUserNameById(couple[1])}\n`;
    });

    bot.sendMessage(chatId, message);

  } catch (error) {
    console.error('Erreur lors de la récupération des membres:', error);
    bot.sendMessage(chatId, 'Une erreur est survenue lors de la sélection des couples.');
  }
});

// Fonction pour obtenir tous les membres du groupe
async function getAllMembers(chatId) {
  const members = [];
  let offset = 0;
  const limit = 200;  // Nombre maximum de membres récupérés à la fois

  try {
    // Récupérer les membres du groupe par lots
    while (true) {
      const chatMembers = await bot.getChatMembers(chatId, offset, limit);
      if (chatMembers.length === 0) break;
      
      chatMembers.forEach(member => {
        members.push(member.user.id);
      });

      // Mettre à jour l'offset pour obtenir les membres suivants
      offset += chatMembers.length;
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des membres:', error);
  }

  return members;
}

// Fonction pour obtenir le nom d'utilisateur d'un membre par son ID
async function getUserNameById(userId) {
  try {
    const user = await bot.getUserProfilePhotos(userId);
    return user.username || 'utilisateur sans nom d\'utilisateur';
  } catch (error) {
    return 'utilisateur non trouvé';
  }
}

// Démarre le bot
console.log('Bot Telegram en ligne...');
