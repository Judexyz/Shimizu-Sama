export class BadWordDetector {
    type = 'BadWords';
    async detect(message, context) {
        if (!message.guild || message.author.bot)
            return null;
        const data = context.rule.data;
        if (!data || !Array.isArray(data.words))
            return null;
        const words = data.words;
        if (words.length === 0)
            return null;
        const text = message.content.toLowerCase();
        for (const word of words) {
            if (text.includes(word.toLowerCase())) {
                return {
                    type: this.type,
                    reason: `Used a blocked word: ||${word}||`,
                    context: { word, text: message.content },
                };
            }
        }
        return null;
    }
}
