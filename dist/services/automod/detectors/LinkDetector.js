export class LinkDetector {
    type = 'Links';
    linkRegex = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/gi;
    inviteRegex = /(discord\.gg|discordapp\.com\/invite|discord\.com\/invite)\/[a-zA-Z0-9]+/gi;
    async detect(message, context) {
        if (!message.guild || message.author.bot)
            return null;
        const data = context.rule.data;
        const isInviteDetector = data?.mode === 'invites_only';
        const text = message.content;
        if (isInviteDetector) {
            if (this.inviteRegex.test(text)) {
                return {
                    type: this.type,
                    reason: 'Posted a Discord invite link',
                    context: { text }
                };
            }
        }
        else {
            // General link detector (which also catches invites)
            if (this.linkRegex.test(text)) {
                return {
                    type: this.type,
                    reason: 'Posted an unauthorized external link',
                    context: { text }
                };
            }
        }
        return null;
    }
}
