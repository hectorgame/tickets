const Discord = require("discord.js");
const db = require("quick.db");
const Event = require("../../structures/Events");
const { textTranscript, htmlTranscript } = require("../../utils/createTranscript.js");
const askReview = require("../../utils/askReview.js");

let cooldownList = [];

module.exports = class InteractionCreate extends Event {
	constructor(...args) {
		super(...args);
	}

	async run(interaction) {
    const message = interaction.message;
    const user = interaction.user;
    const config = this.client.config;
    const language = this.client.language;
    if(user.bot) return;
    if (interaction.isCommand()) {
      const cmd = this.client.slashCommands.get(interaction.commandName);
      if (!cmd) return interaction.reply({ content: "> Error occured, please contact Bot Owner.", ephemeral: true });

      interaction.member = interaction.guild.members.cache.get(interaction.user.id);
      
      let userPerms = [];
      cmd.permissions.forEach((perm) => {
        if(!interaction.channel.permissionsFor(interaction.member).has(perm)) {
          userPerms.push(perm);
        }
      });
      if(userPerms.length > 0 && !this.client.utils.hasRole(this.client, interaction, this.client.config.roles.bypass.permission)) return interaction.reply({ embeds: [this.client.embedBuilder(this.client, interaction.user, this.client.language.titles.error, this.client.language.general.no_perm, this.client.embeds.error_color)], ephemeral: true });

      const args = [];
      for (let option of interaction.options.data) {
        if (option.type === "SUB_COMMAND") {
          if (option.name) args.push(option.name);
          option.options?.forEach((x) => {
            if (x.value) args.push(x.value);
          });
        } else if (option.value) args.push(option.value);
      }

      if(this.client.cmdConfig[cmd.name]) {
        let cmdConfig = this.client.cmdConfig[cmd.name];
        if(cmdConfig.enabled == false) return interaction.reply({ embeds: [this.client.embedBuilder(this.client, interaction.user, this.client.embeds.title, this.client.language.general.cmd_disabled, this.client.embeds.error_color)] });
        if(cmdConfig && cmdConfig.roles.length > 0 && !this.client.utils.hasRole(this.client, interaction, this.client.config.roles.bypass.permission)) {
          let cmdRoles = cmdConfig.roles.map((x) => this.client.utils.findRole(interaction.guild, x));
          if(!this.client.utils.hasRole(this.client, interaction, cmdConfig.roles)) return interaction.reply({ embeds: [this.client.embedBuilder(this.client, interaction.user, this.client.embeds.title, this.client.language.general.no_role.replace("<role>", cmdRoles.join(", ")), this.client.embeds.error_color)], ephemeral: true });
        }
        let findCooldown = cooldownList.find((c) => c.name == cmd.name && c.id == interaction.user.id);
        if(!this.client.utils.hasRole(this.client, interaction, this.client.config.roles.bypass.cooldown)) {
          if(findCooldown) {
            let time = this.client.utils.formatTime(findCooldown.expiring - Date.now());
            return interaction.reply({ embeds: [this.client.embedBuilder(this.client, interaction.user, this.client.embeds.title, this.client.language.general.cooldown.replace("<cooldown>", time), this.client.embeds.error_color)], ephemeral: true });
          } else if(!findCooldown && this.client.cmdConfig[cmd.name].cooldown > 0) {
            let cooldown = {
              id: interaction.user.id,
              name: cmd.name,
              expiring: Date.now() + (this.client.cmdConfig[cmd.name].cooldown * 1000),
            };
    
            cooldownList.push(cooldown);
    
            setTimeout(() => {
              cooldownList.splice(cooldownList.indexOf(cooldown), 1);
            }, this.client.cmdConfig[cmd.name].cooldown * 1000);
          }
        }
      }

      cmd.slashRun(interaction, args);
    }
    if (!interaction.isButton()) return;
    if(interaction.customId == "createTicket" && interaction.channel.id == config.channels.panel_channel) {
      await interaction.deferUpdate();
      let blackListed = false;
      let member = interaction.guild.members.cache.get(user.id);
      for(let i = 0; i < config.roles.blacklist.length; i++) {
        if(member.roles.cache.has(config.roles.blacklist[i])) blackListed = true;
      }
      if(blackListed == true) 
        return interaction.reply({ embeds: [this.client.embedBuilder(this.client, interaction.user, this.client.embeds.title, this.client.language.ticket.bl_role, this.client.embeds.error_color)], ephemeral: true })
      if(config.users.blacklist.includes(user.id))
        return interaction.reply({ embeds: [this.client.embedBuilder(this.client, interaction.user, this.client.embeds.title, this.client.language.ticket.bl_user, this.client.embeds.error_color)], ephemeral: true })
      const noCategory = new Discord.MessageEmbed()
        .setTitle(this.client.embeds.title)
        .setDescription(this.client.language.ticket.no_category)
        .setFooter({ text: this.client.embeds.footer, iconURL: user.displayAvatarURL({ dynamic: true }) })
        .setTimestamp()
        .setColor(this.client.embeds.error_color);

      if(config.channels.category_id == "") 
        return interaction.reply({ embeds: [noCategory], ephemeral: true });
      
      this.client.emit("ticketCreate", interaction, interaction.member);
    }

    if(interaction.customId == "closeTicket" && interaction.user.bot == false) {
      await interaction.deferUpdate();
      let ticketID = db.fetch(`ticket_${interaction.guild.id}`);
      if(config.general.confirm_close == false) {
        interaction.followUp({ embeds: [this.client.embedBuilder(this.client, interaction.user, this.client.embeds.title, language.ticket.ticket_deleted, this.client.embeds.general_color)] });
        await askReview(this.client, interaction.channel, interaction.guild);
        if(config.general.transcripts == true) {
          if(config.general.transcript_type == "HTML") {
            await htmlTranscript(this.client, interaction, `ticket-${ticketID}`, interaction);
          } else {
            await textTranscript(this.client, interaction, ticketID, interaction);
          }
          setTimeout(() => {
            let dataRemove = db
              .all()
              .filter((i) => i.ID.includes(interaction.channel.id));
      
            dataRemove.forEach((x) => db.delete(x.ID));
          }, 5000);
        } else {
          let dataRemove = db
					  .all()
            .filter((i) => i.ID.includes(interaction.channel.id));
          dataRemove.forEach((x) => db.delete(x.ID));
          setTimeout(async() => {
            interaction.channel.delete();
          }, this.client.config.general.delete_after * 1000);
        }
        return;
      }

      this.client.emit("ticketClose", interaction, interaction.member);
    }
	}
};