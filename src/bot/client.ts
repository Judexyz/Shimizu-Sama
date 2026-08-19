import { Client, Collection, GatewayIntentBits } from 'discord.js';
import { Shoukaku, Connectors } from 'shoukaku';
import { Command } from '../types/index.js';
import { logger } from '../utils/logger.js';

export class ShimizuClient extends Client {
  public commands: Collection<string, Command>;
  public shoukaku: Shoukaku;

  constructor() {
    super({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
      ],
    });

    this.commands = new Collection();

    this.shoukaku = this.createShoukaku();
  }

  private createShoukaku(): Shoukaku {
    const host = process.env.LAVALINK_HOST || '127.0.0.1';
    const port = process.env.LAVALINK_PORT || '2333';
    const password = process.env.LAVALINK_PASSWORD || 'youshallnotpass';

    const secure = process.env.LAVALINK_SECURE === 'true';

    const nodes = [
      {
        name: 'POC_Node',
        url: `${host}:${port}`,
        auth: password,
        secure,
      },
    ];

    logger.info(
      {
        host,
        port,
        secure,
        node: 'POC_Node',
      },
      'Initializing Shoukaku...'
    );

    const shoukaku = new Shoukaku(new Connectors.DiscordJS(this), nodes, {
      moveOnDisconnect: false,
      resume: false,
      reconnectTries: 10,
      restTimeout: 10000,
    });

    shoukaku.on('ready', (name) => {
      logger.info(
        {
          name,
          connectedNodes: [...shoukaku.nodes.keys()],
        },
        'Shoukaku Node Ready'
      );
    });

    shoukaku.on('error', (name, error) => {
      logger.error(
        {
          name,
          error,
        },
        'Shoukaku Node Error'
      );
    });

    shoukaku.on('close', (name, code, reason) => {
      logger.warn(
        {
          name,
          code,
          reason,
          connectedNodes: [...shoukaku.nodes.keys()],
        },
        'Shoukaku Node Closed WebSocket'
      );
    });

    shoukaku.on('disconnect', (name, count) => {
      logger.warn(
        {
          name,
          count,
          connectedNodes: [...shoukaku.nodes.keys()],
        },
        'Shoukaku Node Disconnected'
      );
    });

    shoukaku.on('debug', (name, info) => {
      logger.debug(
        {
          name,
          info,
        },
        'Shoukaku Debug'
      );
    });

    return shoukaku;
  }

  public async start(token: string): Promise<void> {
    try {
      logger.info('Starting Shimizu-sama...');

      await this.login(token);

      logger.info(
        {
          discordReady: this.isReady(),
          connectedNodes: [...this.shoukaku.nodes.keys()],
        },
        'Discord login completed'
      );
    } catch (error) {
      logger.error(
        {
          err: error,
        },
        'Failed to start client'
      );

      process.exit(1);
    }
  }
}
