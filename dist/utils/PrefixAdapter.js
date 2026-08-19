export class PrefixAdapter {
    message;
    commandName;
    subcommandName;
    args;
    deferredMessage = null;
    replied = false;
    constructor(message, commandName, subcommandName, args = {}) {
        this.message = message;
        this.commandName = commandName;
        this.subcommandName = subcommandName;
        this.args = args;
    }
    get guild() {
        return this.message.guild;
    }
    get channel() {
        return this.message.channel;
    }
    get member() {
        return this.message.member;
    }
    get user() {
        return this.message.author;
    }
    get client() {
        return this.message.client;
    }
    inCachedGuild() {
        return true;
    }
    options = {
        getSubcommand: () => this.subcommandName,
        getString: (name) => this.args[name] ?? null,
        getInteger: (name) => (this.args[name] ? parseInt(this.args[name], 10) : null),
        getUser: (name) => null,
        getRole: (name) => null,
    };
    async deferReply(options) {
        this.deferredMessage = await this.message.channel.send('⏳ Processing...');
        return this.deferredMessage;
    }
    async reply(options) {
        this.replied = true;
        return await this.message.reply(options);
    }
    async editReply(options) {
        if (this.deferredMessage) {
            this.replied = true;
            return await this.deferredMessage.edit(options);
        }
        if (!this.replied) {
            this.replied = true;
            return await this.message.channel.send(options);
        }
        return await this.message.channel.send(options);
    }
    async followUp(options) {
        return await this.message.channel.send(options);
    }
}
