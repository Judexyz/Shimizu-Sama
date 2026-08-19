export class DurationParser {
    static parse(input) {
        const match = input.match(/^(\d+)(s|m|h|d|w)$/);
        if (!match)
            return null;
        const value = parseInt(match[1], 10);
        const unit = match[2];
        if (isNaN(value) || value <= 0)
            return null;
        switch (unit) {
            case 's':
                return value * 1000;
            case 'm':
                return value * 60 * 1000;
            case 'h':
                return value * 60 * 60 * 1000;
            case 'd':
                return value * 24 * 60 * 60 * 1000;
            case 'w':
                return value * 7 * 24 * 60 * 60 * 1000;
            default:
                return null;
        }
    }
}
