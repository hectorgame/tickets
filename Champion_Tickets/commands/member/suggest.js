const Command = require("../../structures/Command");
const Discord = require("discord.js");

module.exports = class Suggest extends Command {
  constructor(client) {
    super(client, {
      name: "suggest",
      description: client.cmdConfig.suggest.description,
      usage: client.cmdConfig.suggest.usage,
      permissions: client.cmdConfig.suggest.permissions,
      aliases: client.cmdConfig.suggest.aliases,
      category: "member",
      listed: client.cmdConfig.suggest.enabled,
      slash: true,
      options: [{
        name: 'suggestion',
        type: 'STRING',
        description: "Suggestion to send",
        required: true,
      }]
    });
  }

  async run(message, args) {
    const config = this.client.config;

    if(config.channels.suggestions == "") 
      return message.channel.send({ embeds: [this.client.embedBuilder(this.client, message.author, this.client.embeds.suggestion_title, this.client.language.ticket.no_suggest, this.client.embeds.error_color)] });
    if(!args[0]) return message.channel.send({ embeds: [this.client.utils.usage(this.client, message, this.client.cmdConfig.suggest.usage)] });
    let suggestion = args.join(" ");

    let suggChannel = this.client.utils.findChannel(message.guild, config.channels.suggestions);

    let suggMenu = new Discord.MessageEmbed()
      .setColor(this.client.embeds.suggestion.color);
    
    if(this.client.embeds.suggestion.title) suggMenu.setTitle(this.client.embeds.suggestion.title);
    let field = this.client.embeds.suggestion.fields;
    for(let i = 0; i < this.client.embeds.suggestion.fields.length; i++) {
    suggMenu.addField(field[i].title, field[i].description.replace("<author>", message.author)
      .replace("<suggestion>", `${suggestion}`)
      .replace("<date>", `${new Date().toLocaleString()}`))
    }
    
    if(this.client.embeds.suggestion.footer == true) suggMenu.setFooter({ text: message.author.username, iconURL: message.author.displayAvatarURL({ dynamic: true }) }).setTimestamp();
    if(this.client.embeds.suggestion.thumbnail == true) suggMenu.setThumbnail(message.guild.iconURL());
    
    if(this.client.embeds.suggestion.description) suggMenu.setDescription(this.client.embeds.suggestion.description.replace("<author>", message.author)
      .replace("<suggestion>", `${suggestion}`)
      .replace("<date>", `${new Date().toLocaleString()}`));

    message.channel.send({ embeds: [this.client.embedBuilder(this.client, message.author, this.client.embeds.title, this.client.language.general.sugg_sent, this.client.embeds.success_color)] }).then((m) => setTimeout(() => m.delete(), 5000));
    suggChannel.send({ embeds: [suggMenu] }).then((msg) => {
      msg.react(config.emojis.yes_emoji);
      msg.react(config.emojis.no_emoji);
    })
  }
  async slashRun(interaction, args) {
    const config = this.client.config;
    let suggestion = interaction.options.getString("suggestion");

    if(config.channels.suggestions == "") 
      return interaction.reply({ embeds: [this.client.embedBuilder(this.client, interaction.user, this.client.embeds.suggestion_title, this.client.language.utility.no_text, this.client.embeds.error_color)] });

    let suggChannel = this.client.utils.findChannel(interaction.guild, config.channels.suggestions);

    let suggMenu = new Discord.MessageEmbed()
      .setColor(this.client.embeds.suggestion.color);
    
    if(this.client.embeds.suggestion.title) suggMenu.setTitle(this.client.embeds.suggestion.title);
    let field = this.client.embeds.suggestion.fields;
    for(let i = 0; i < this.client.embeds.suggestion.fields.length; i++) {
    suggMenu.addField(field[i].title, field[i].description.replace("<author>", interaction.user)
      .replace("<suggestion>", `${suggestion}`)
      .replace("<date>", `${new Date().toLocaleString()}`))
    }
    
    if(this.client.embeds.suggestion.footer == true) suggMenu.setFooter({ text: interaction.user.username, iconURL: interaction.user.displayAvatarURL({ dynamic: true }) }).setTimestamp();
    if(this.client.embeds.suggestion.thumbnail == true) suggMenu.setThumbnail(interaction.guild.iconURL());
    
    if(this.client.embeds.suggestion.description) suggMenu.setDescription(this.client.embeds.suggestion.description.replace("<author>", interaction.user)
      .replace("<suggestion>", `${suggestion}`)
      .replace("<date>", `${new Date().toLocaleString()}`));

    interaction.reply({ embeds: [this.client.embedBuilder(this.client, interaction.user, this.client.embeds.title, this.client.language.general.sugg_sent, this.client.embeds.success_color)], ephemeral: true });
    suggChannel.send({ embeds: [suggMenu] }).then((msg) => {
      msg.react(config.emojis.yes_emoji);
      msg.react(config.emojis.no_emoji);
    });
  }
};