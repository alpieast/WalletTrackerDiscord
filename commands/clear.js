module.exports = {
  name: "clear",
  description: "Clear messages",
  async execute(message, args) {
    if (!args[0]) {
      return message.reply("Please specify the number of messages to clear.");
    }
    if (isNaN(args[0])) {
      return message.reply("Please specify a number.");
    }
    if (args[0] > 100) {
      return message.reply("Please specify a number less than 100.");
    }
    if (args[0] < 1) {
      return message.reply("Please specify a number greater than 0.");
    }

    await message.channel.messages
      .fetch({ limit: args[0] })
      .then((messages) => {
        message.channel.bulkDelete(messages);
      });
  },
};
