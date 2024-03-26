const Command = require("../../structures/Command");
const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js');
const db = require("quick.db");

module.exports = class Panel extends Command {
	constructor(client) {
		super(client, {
			name: "panel",
			description: client.cmdConfig.panel.description,
			usage: client.cmdConfig.panel.usage,
			permissions: client.cmdConfig.panel.permissions,
      aliases: client.cmdConfig.panel.aliases,
			category: "tickets",
			listed: client.cmdConfig.panel.enabled,
      slash: true,
		});
	}
  
  async run(message, args) {
    let config = this.client.config;
    if(config.channels.panel_channel == "") return message.channel.send({ embeds: [this.client.embedBuilder(this.client, message.author, this.client.embeds.title, this.client.language.ticket.no_panel, this.client.embeds.error_color)] });
    let panelChannel = this.client.utils.findChannel(message.guild, config.channels.panel_channel);

    const buttonRow = new MessageActionRow()
      .addComponents(
        new MessageButton()
          .setCustomId('createTicket')
          .setLabel(this.client.language.buttons.create)
          .setEmoji(config.emojis.create)
          .setStyle('PRIMARY'),
      );
      
    let embed = new MessageEmbed()
      .setTitle(this.client.embeds.title)
      .setDescription(this.client.embeds.panel_message)
      .setColor(this.client.embeds.general_color);

    if(this.client.embeds.panel.footer.enabled == true) embed.setFooter({ text: this.client.embeds.footer, iconURL: this.client.user.displayAvatarURL() }).setTimestamp();
    if(this.client.embeds.panel.image.enabled == true) embed.setImage(this.client.embeds.panel.image.url);
    if(this.client.embeds.panel.thumbnail.enabled == true) embed.setThumbnail(this.client.embeds.panel.thumbnail.url);

    message.channel.send({ embeds: [this.client.embedBuilder(this.client, message.author, this.client.embeds.title, this.client.language.ticket.panel_created, this.client.embeds.success_color)] }).then((m) => setTimeout(() => m.delete(), 5000));
    panelChannel.send({embeds: [embed], components: [buttonRow]});
  }
  async slashRun(interaction, args) {
    let config = this.client.config;
    if(config.channels.panel_channel == "") return interaction.reply({ embeds: [this.client.embedBuilder(this.client, interaction.user, this.client.embeds.title, this.client.language.ticket.no_panel, this.client.embeds.error_color)] });
    let panelChannel = this.client.utils.findChannel(interaction.guild, config.channels.panel_channel);

    const buttonRow = new MessageActionRow()
      .addComponents(
        new MessageButton()
          .setCustomId('createTicket')
          .setLabel(this.client.language.buttons.create)
          .setEmoji(config.emojis.create)
          .setStyle('PRIMARY'),
      );
      
    let embed = new MessageEmbed()
      .setTitle(this.client.embeds.title)
      .setDescription(this.client.embeds.panel_message)
      .setColor(this.client.embeds.general_color);

    if(this.client.embeds.panel.footer.enabled == true) embed.setFooter({ text: this.client.embeds.footer, iconURL: this.client.user.displayAvatarURL() }).setTimestamp();
    if(this.client.embeds.panel.image.enabled == true) embed.setImage(this.client.embeds.panel.image.url);
    if(this.client.embeds.panel.thumbnail.enabled == true) embed.setThumbnail(this.client.embeds.panel.thumbnail.url);

    interaction.reply({ embeds: [this.client.embedBuilder(this.client, interaction.user, this.client.embeds.title, this.client.language.ticket.panel_created, this.client.embeds.success_color)], ephemeral: true });
    panelChannel.send({embeds: [embed], components: [buttonRow]});
  }
};