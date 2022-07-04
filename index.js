const Discord = require("discord.js");
const { Formatters } = require("discord.js");
const client = new Discord.Client({ intents: ["GUILDS", "GUILD_MESSAGES"] });
const axios = require("axios");
const { token } = require("./config.js");
const fs = require("fs");

client.commands = new Discord.Collection();
const commandFiles = fs
  .readdirSync("./commands")
  .filter((file) => file.endsWith(".js"));
for (const file of commandFiles) {
  const command = require(`./commands/${file}`);
  client.commands.set(command.name, command);
}

let signatures = [];

let wallets = [];
let startStatus = false;
let channelId = "";

const prefix = "!-";

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
  client.user.setActivity("!-help", { type: "WATCHING" });

  setInterval(() => {
    if (startStatus) {
      getAllWalletTransactions(wallets);
    }
  }, 1000 * 60);
});

const addwallet = (message, args) => {
  if (!args[1]) {
    return message.reply("Please specify the wallet name.");
  }
  if (!args[0]) {
    return message.reply("Please specify the wallet id.");
  }
  const walletId = {
    id: args[0],
    name: args[1],
  };

  wallets.push(walletId);
  message.reply(`Wallet ${walletId.name} added.`);
};

const deleteWallet = (message, args) => {
  if (!args[0]) {
    return message.reply("Please specify the wallet id.");
  }
  const walletId = args[0];
  const wallet = wallets.find((wallet) => wallet.id === walletId);
  if (!wallet) {
    return message.reply("Wallet not found.");
  }
  wallets = wallets.filter((wallet) => wallet.id !== walletId);
  message.reply(`Wallet ${wallet.name} deleted.`);
};

const listWallets = (message, args) => {
  if (wallets.length === 0) {
    return message.reply("You have no wallets.");
  }
  const walletList = wallets.map((wallet) => {
    wallet.id;
  });
  message.reply(walletList.join(", ") + "    ");
};
const start = (message) => {
  if (wallets.length === 0) {
    return message.reply("You have no wallets.");
  }
  console.log("Starting bot...");
  message.reply("Starting bot...");
  channelId = message.channel.id;
  startStatus = true;
};
const stop = (message) => {
  console.log("Stopping bot...");
  message.reply("Stopping bot...");
  startStatus = false;
};

const messageCommands = (message) => {
  message.reply(
    "Available commands: \n" +
      "Use `!-start` to the bot \n" +
      "Use `!-addwallet <wallet id> <wallet name>` to add a wallet." +
      "\n" +
      "Use `!-deletewallet <wallet id>` to delete a wallet." +
      "\n" +
      "Use `!-listwallets` to list all your wallets." +
      "\n" +
      "Use `!-stop` to stop the bot." +
      "\n" +
      "Use `!-clear <number>` to see this message."
  );
};

client.on("message", (message) => {
  if (!message.content.startsWith(prefix) || message.author.bot) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();

  if (command === "clear") {
    client.commands.get("clear").execute(message, args);
  } else if (command === "addwallet") {
    addwallet(message, args);
  } else if (command === "deletewallet") {
    deleteWallet(message, args);
  } else if (command === "listwallets") {
    listWallets(message, args);
  } else if (command === "help") {
    messageCommands(message);
  } else if (command === "start") {
    start(message);
  } else if (command === "stop") {
    stop(message);
  } else {
    message.reply("Command not found.");
    messageCommands(message);
  }
});
client.login(token);

const sendMessageToChannel = (message) => {
  client.channels.fetch(channelId).then((channel) => {
    channel.send(message);
  });
};

const sendNewTransactionMessageToChannel = (walletId, transaction) => {
  client.channels.fetch(channelId).then((channel) => {
    channel.send(
      walletId.name +
        Formatters.bold(
          checkIfTransactionIsBuyOrSell(transaction, walletId.id)
        ) +
        transaction.collection +
        " for " +
        Formatters.italic(transaction.price) +
        " SOL " +
        Formatters.hideLinkEmbed(
          `${createLinkForCollection(transaction.collection)}`
        )
    );
  });
};

const createLinkForCollection = (collectionId) => {
  return `https://magiceden.io/marketplace/${collectionId}`;
};

//check for new transactions
let intervalTime = 1000;

const getAllWalletTransactions = (walletIdS) => {
  console.log("Checking for new transactions");
  walletIdS.forEach((walletId) => {
    setTimeout(() => {
      getWalletTransactions(walletId);
    }, intervalTime * 1);
    intervalTime += 1000;
  });

  console.log("Transactions checked");
  intervalTime = 1000;
};

//check if the transaction is buy or sell
const checkIfTransactionIsBuyOrSell = (transaction, walletId) => {
  if (transaction.buyer === walletId) {
    return " bought ";
  } else if (transaction.seller === walletId) {
    return " sold ";
  } else {
    return "error";
  }
};

//if no new transactions, dont send message to channel

var config = (walletId) => {
  return {
    method: "get",
    url: `https://api-mainnet.magiceden.dev/v2/wallets/${walletId}/activities?offset=0&limit=100`,
    headers: {},
  };
};

const getWalletTransactions = (walletId) => {
  axios(config(walletId.id))
    .then(function (response) {
      response.data.forEach((transaction) => {
        if (transaction.type === "buyNow") {
          if (!signatures.includes(transaction.signature)) {
            signatures.push(transaction.signature);

            sendNewTransactionMessageToChannel(walletId, transaction);
          } else {
            console.log("Transaction already sent");
            return;
          }
        }
      });
    })
    .catch(function (error) {
      console.log(error);
    });
};
