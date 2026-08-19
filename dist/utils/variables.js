export class VariableParser {
    static parse(text, context) {
        let result = text;
        if (context.user) {
            result = result.replace(/{user}/gi, `<@${context.user.id}>`);
            result = result.replace(/{username}/gi, context.user.username);
            result = result.replace(/{userid}/gi, context.user.id);
        }
        if (context.guild) {
            result = result.replace(/{server}/gi, context.guild.name);
            result = result.replace(/{membercount}/gi, context.guild.memberCount.toString());
        }
        if (context.channel) {
            result = result.replace(/{channel}/gi, `<#${context.channel.id}>`);
        }
        return result;
    }
}
