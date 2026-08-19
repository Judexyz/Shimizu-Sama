export class CapsDetector {
    type = 'Caps';
    async detect(message, context) {
        if (!message.guild || message.author.bot)
            return null;
        const text = message.content;
        if (text.length < 15)
            return null; // Don't trigger on short messages like "HELLO"
        const data = context.rule.data;
        const maxPercentage = data?.maxPercentage || 70; // e.g. 70%
        const upperCaseCount = (text.match(/[A-Z]/g) || []).length;
        const letterCount = (text.match(/[a-zA-Z]/g) || []).length;
        if (letterCount < 10)
            return null; // Need enough letters to get a good percentage
        const percentage = (upperCaseCount / letterCount) * 100;
        if (percentage > maxPercentage) {
            return {
                type: this.type,
                reason: `Message contained ${Math.round(percentage)}% uppercase letters`,
                context: { percentage, maxPercentage, text }
            };
        }
        return null;
    }
}
