import winston from 'winston'

const levels = {
    fatal: 0,
    error: 1,
    warn: 2,
    info: 3,
    debug: 4,
    trace: 5
}

const colors = {
    fatal: 'red',
    error: 'red',
    warn: 'yellow',
    info: 'green',
    debug: 'cyan',
    trace: 'cyan'
}

export interface ILogConfig {
    main: {dirname: string, filename: string, level: string}[]
    wits?: {dirname: string, filename: string}
    console: boolean
}

var logger = null
var wits_logger = null

export function initLoggers(config: ILogConfig) {
    winston.loggers.add('main', {
        levels,
        level: 'trace',
        format: winston.format.json(),
        transports: config.main.map((f) => new winston.transports.File(f))
    })
    
    logger = winston.loggers.get('main')
    
    winston.loggers.add('wits', {
        levels,
        level: 'info',
        format: winston.format.json(),
        transports: config.wits ? [
            new winston.transports.File(config.wits),
        ] : []
    })
    
    wits_logger = winston.loggers.get('wits')

    if (config.console) {
        logger.add(new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize({colors}),
                winston.format.simple()
            ),
        }));
        wits_logger.add(new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize({colors}),
                winston.format.simple()
            ),
        }));
    }
}




export {logger, wits_logger}