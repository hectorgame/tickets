const db = require("quick.db");
const Event = require("../../structures/Events");
const { MessageEmbed, MessageActionRow, MessageButton, MessageSelectMenu, Permissions } = require("discord.js");
const { categoryCollector, generalCategory } = require("../../utils/askQuestions.js"); 

module.exports = class TicketCreate extends Event {
  constructor(...args) {
    super(...args);
  }

  async run(message, member, reason = "No Reason Provided") {
    let config = this.client.config;
    let language = this.client.language;
    let mainCategory = this.client.utils.findChannel(message.guild, config.channels.category_id);
    if(!mainCategory) this.client.utils.sendError("Provided Channel Category ID (category_id) is invalid or belongs to other Server.");
    let everyone = message.guild.roles.cache.find(r => r.name === "@everyone");
    
    if(config.category.status == false) {
      let mainCategory = this.client.utils.findChannel(message.guild, config.channels.category_id);
      let userTickets = [...mainCategory.children.filter(ch => ch.name == config.channels.channel_name + this.client.utils.ticketUsername(member.user)).values()];
      if(userTickets.length >= config.general.ticket_limit) {
        if(message.type == "APPLICATION_COMMAND" || message.type == "MESSAGE_COMPONENT") {
          message.followUp({ embeds: [this.client.embedBuilder(this.client, member.user, this.client.embeds.title, this.client.language.ticket.already_open, this.client.embeds.error_color)], ephemeral: true }); 
          return;
        } else {
          message.channel.send({ embeds: [this.client.embedBuilder(this.client, member.user, this.client.embeds.title, this.client.language.ticket.already_open, this.client.embeds.error_color)] }).then((msg) => setTimeout(() => msg.delete(), 5000)) 
          return;
        }
      }
    }
    message.guild.channels.create(config.channels.channel_name.toLowerCase() + this.client.utils.ticketUsername(member.user), {
        type: "GUILD_TEXT",
        parent: mainCategory,
        permissionOverwrites: [
          {
            id: this.client.user,
            allow: [Permissions.FLAGS.VIEW_CHANNEL, Permissions.FLAGS.SEND_MESSAGES, Permissions.FLAGS.MANAGE_CHANNELS],
          },
          {
            id: member.user.id,
            allow: [Permissions.FLAGS.VIEW_CHANNEL, Permissions.FLAGS.SEND_MESSAGES],
          },
          {
            id: everyone,
            deny: [Permissions.FLAGS.VIEW_CHANNEL, Permissions.FLAGS.SEND_MESSAGES],
          }
        ],
      }).then(async (c) => {
        db.set(`ticketOwner_${c.id}`, member.user.id);
        db.set(`openedAt_${c.id}`, new Date());
        db.set(`openedTimestamp_${c.id}`, `${message.createdTimestamp}`);
        db.add(`ticket_${message.guild.id}`, 1);

        if(this.client.config.category.status == false) {
          c.permissionOverwrites.edit(member.user, {
            SEND_MESSAGES: true,
            VIEW_CHANNEL: true
          });
        } else {
          c.permissionOverwrites.edit(member.user, {
            SEND_MESSAGES: false,
            VIEW_CHANNEL: true
          });
        }

        c.setTopic(language.ticket.channel_topic.replace("<author>", member.user.username));
        if(config.roles.support.length > 0) {
          for(let i = 0; i < config.roles.support.length; i++) {
            let findRole = this.client.utils.findRole(message.guild, config.roles.support[i]);
            c.permissionOverwrites.create(findRole, {
                SEND_MESSAGES: true,
                VIEW_CHANNEL: true
            });
          }
        }
  
        const buttonRow = new MessageActionRow()
          .addComponents(
            new MessageButton()
              .setCustomId('closeTicket')
              .setLabel(this.client.language.buttons.close)
              .setEmoji(config.emojis.close)
              .setStyle('DANGER'),
          );
  
        const jumpRow = new MessageActionRow()
          .addComponents(
            new MessageButton()
              .setURL(`https://discord.com/channels/${message.guild.id}/${c.id}`)
              .setLabel(this.client.language.buttons.go_ticket)
              .setStyle('LINK')
          );
  
        if(message.type == "APPLICATION_COMMAND") {
          message.reply({ embeds: [this.client.embedBuilder(this.client, member.user, this.client.embeds.title, language.ticket.ticket_created
            .replace("<channel>", `<#${c.id}>`)
            .replace("<reason>", `${reason}`)
            .replace("<user>", member), this.client.embeds.success_color)], components: [jumpRow], ephemeral: this.client.cmdConfig.new.ephemeral });
        } else if(message.type == "MESSAGE_COMPONENT") {
          message.followUp({ embeds: [this.client.embedBuilder(this.client, member.user, this.client.embeds.title, language.ticket.ticket_created
            .replace("<channel>", `<#${c.id}>`)
            .replace("<reason>", `${reason}`)
            .replace("<user>", member), this.client.embeds.success_color)], components: [jumpRow], ephemeral: true });
        } else {
          message.channel.send({ embeds: [this.client.embedBuilder(this.client, member.user, this.client.embeds.title, language.ticket.ticket_created
            .replace("<channel>", `<#${c.id}>`)
            .replace("<reason>", `${reason}`)
            .replace("<user>", member), this.client.embeds.success_color)], components: [jumpRow] }).then(m => setTimeout(() => m.delete(), 5000)); 
        }
          
        if(config.general.mention_author == true) c.send(`<@${member.id}>`).then((msg) => setTimeout(() => msg.delete(), 5000));
        if(config.general.mention_support == true && config.roles.support.length > 0) {
          let supp = config.roles.support.map((r) => {
            let findSupport = this.client.utils.findRole(message.guild, r);
            
            if(findSupport) return findSupport;
          });
          
          c.send(supp.join(" ")).then((msg) => setTimeout(() => msg.delete(), 5000));
        } 
        
        const embed = new MessageEmbed()
          .setColor(this.client.embeds.general_color)
          .setTitle(this.client.embeds.title)
          .setDescription(this.client.embeds.ticket_message.replace("<user>", member)
            .replace("<reason>", `${reason}`));
            
        if(config.category.status == true) embed.setDescription(this.client.embeds.select_category);
        if(this.client.embeds.ticket.footer.enabled == true) embed.setFooter({ text: this.client.embeds.footer, iconURL: this.client.user.displayAvatarURL({ size: 1024, dynamic: true }) }).setTimestamp();
        if(this.client.embeds.ticket.image.enabled == true) embed.setImage(this.client.embeds.ticket.image.url);
        if(this.client.embeds.ticket.thumbnail.enabled == true) embed.setThumbnail(this.client.embeds.ticket.thumbnail.url);
        let msg = await c.send({ embeds: [embed], components: this.client.config.general.close_button == true ? [buttonRow] : [] });
        
        if(config.category.questions == true && this.client.config.category.status == false) {
          await generalCategory(this.client, member, c);
        }
  
        if(this.client.config.category.status == false) return;
        const options = [];
        config.categories.forEach(c => {
          options.push({
            label: c.name,
            value: c.id, 
            emoji: c.emoji,
          });
        });
        
        let sMenu = new MessageSelectMenu()
          .setCustomId("categorySelect")
          .setPlaceholder(config.category.placeholder)
          .addOptions(options);
  
        let row = new MessageActionRow()
          .addComponents(sMenu);
        
        msg.edit({ embeds: [embed], components: this.client.config.general.close_button == true ? [row, buttonRow] : [row] });
        
        const filter = (interaction) => interaction.customId == "categorySelect" && interaction.user.id === member.id;
        const rCollector = msg.createMessageComponentCollector({ filter, componentType: "SELECT_MENU", time: this.client.config.general.no_select_delete * 1000 });
        
        let claimed = false;
        let haveTicket = false;
              
        rCollector.on("collect", async (i) => {
          await i.deferUpdate();
          let value = i.values[0];
          claimed = true;
          this.client.config.categories.forEach(async (ca) => {
            if(value == ca.id) {
              let moveCategory = this.client.utils.findChannel(message.guild, ca.category);
              if(config.category.separateCategories == true && ca.category != "" && moveCategory) {
                let priorityEmoji = config.emojis.priority;
                const prArr = [
                  priorityEmoji["low"], 
                  priorityEmoji["normal"], 
                  priorityEmoji["high"], 
                  priorityEmoji["urgent"]
                ];
                let childrenArray = [...moveCategory.children.filter(ch => ch.name == config.channels.channel_name + this.client.utils.ticketUsername(member.user) || 
                  ch.name == config.channels.priority_name.replace("<priority>", prArr[0]) + this.client.utils.ticketUsername(member.user) ||
                  ch.name == config.channels.priority_name.replace("<priority>", prArr[1]) + this.client.utils.ticketUsername(member.user) ||
                  ch.name == config.channels.priority_name.replace("<priority>", prArr[2]) + this.client.utils.ticketUsername(member.user) ||
                  ch.name == config.channels.priority_name.replace("<priority>", prArr[3]) + this.client.utils.ticketUsername(member.user)
                ).values()];
                if(childrenArray.length < ca.limit) {
                  c.setParent(moveCategory, { lockPermissions: false }).then((ch) => {
                    if(this.client.config.category.separateRoles.enabled == true && ca.roles.length > 0) {
                      let editRole = ca.roles.map((x) => this.client.utils.findRole(message.guild, x));
                      editRole = editRole.filter((r) => r != undefined);
                  
                      for(const r of editRole) {
                        c.permissionOverwrites.edit(r, {
                          SEND_MESSAGES: true,
                          VIEW_CHANNEL: true
                        }); 
                      }
                      if(config.roles.support.length > 0 && this.client.config.category.separateRoles.both == false) {
                        let suppEdit = config.roles.support.map((x) => this.client.utils.findRole(message.guild, x));
                        suppEdit = suppEdit.filter((r) => r != undefined); 
                        
                        for(const supp of suppEdit) {
                          c.permissionOverwrites.edit(supp, {
                            SEND_MESSAGES: false,
                            VIEW_CHANNEL: false
                          });
                        }
                      }
                    }
                    ch.permissionOverwrites.edit(member.user, {
                      SEND_MESSAGES: true,
                      VIEW_CHANNEL: true
                    });
                  });
                  embed.setTitle(ca.title);
                  embed.setDescription(this.client.embeds.ticket_message.replace("<user>", member)
                    .replace("<reason>", `${reason}`)
                    .replace("<category>", ca.name));
                  msg.edit({ embeds: [embed], components: this.client.config.general.close_button == true ? [buttonRow] : []});
                  haveTicket = false;
                  if(ca.ask == true && config.category.questions == false) {
                    await categoryCollector(this.client, member, ca, c);
                  }
                } else {
                  msg.edit({ embeds: [embed], components: this.client.config.general.close_button == true ? [row, buttonRow] : []});
                  haveTicket = true;
                }
              } else {
                if(this.client.config.category.separateRoles.enabled == true && ca.roles.length > 0) {
                  let editRole = ca.roles.map((x) => this.client.utils.findRole(message.guild, x));
                  editRole = editRole.filter((r) => r != undefined);
                  
                  for(const r of editRole) {
                    c.permissionOverwrites.edit(r, {
                      SEND_MESSAGES: true,
                      VIEW_CHANNEL: true
                    }); 
                  }
                  if(config.roles.support.length > 0 && this.client.config.category.separateRoles.both == false) {
                    let suppEdit = config.roles.support.map((x) => this.client.utils.findRole(message.guild, x));
                    suppEdit = suppEdit.filter((r) => r != undefined); 
                    
                    for(const supp of suppEdit) {
                      c.permissionOverwrites.edit(supp, {
                        SEND_MESSAGES: false,
                        VIEW_CHANNEL: false
                      });
                    }
                  }
                }
                c.permissionOverwrites.edit(member.user, {
                  SEND_MESSAGES: true,
                  VIEW_CHANNEL: true
                });
                embed.setTitle(ca.title);
                embed.setDescription(this.client.embeds.ticket_message.replace("<user>", member)
                  .replace("<reason>", `${reason}`)
                  .replace("<category>", ca.name));
                msg.edit({ embeds: [embed], components: this.client.config.general.close_button == true ? [buttonRow] : []});
                haveTicket = false;
                if(ca.ask == true && config.category.questions == false) {
                  await categoryCollector(this.client, member, ca, c);
                }
              }
            }
          });
          if(haveTicket == true) c.send({ embeds: [this.client.embedBuilder(this.client, member.user, this.client.embeds.title, language.ticket.have_ticket_category, this.client.embeds.error_color)], ephemeral: true }).then((msg) => setTimeout(() => msg.delete(), 5000))
          if(haveTicket == false) rCollector.stop();
        });
        
        rCollector.on("end", (collected, reason) => {
          if(claimed == true) return;
          if(reason != "time") return;
          c.delete();
        });
      }).catch(console.error);
  }
};