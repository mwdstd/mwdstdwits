import * as net from 'net'
import go from 'node-getopt'
import { parse } from 'date-format-parse';
import { initConfig, config } from './config'
import { initLoggers, logger, wits_logger } from './logger'
import { MwdStdBackend } from './mwdstd'
import { WitsAttribute, WitsParser } from './wits-parser'
import { WitsDictionary as wd } from "./wits-dictionary"

const CONFIG_FILE = 'wits_config.json'

const opt = go.create([
    ['h', 'host=ARG', 'Listening host'],
    ['p', 'port=ARG', 'Listening port'],
    ['c', 'config=ARG', 'Configuration file']
]).bindHelp().parseSystem()

initConfig(<string>opt.options.config || CONFIG_FILE)
initLoggers(config.app.logs)

const WitsDictionary = {
    ...wd,
    ...config.wits_dictionary
}

const survey_fields = Object.values(config.channel_mapping.survey).filter((x): x is string => typeof x === 'string')
survey_fields.push(config.channel_mapping.survey.time.time.tag)
survey_fields.push(config.channel_mapping.survey.time.date.tag)
const ci_fields = Object.values(config.channel_mapping.ci)

const be = new MwdStdBackend()

function processCiRecord(record: WitsAttribute[]) {
    const rec: {[code: string]: WitsAttribute} = record.reduce((a, c) => ({...a, [c.code]: c}), {})
    const ci = {
        md: Number(rec[config.channel_mapping.ci.md].value),
        inc: Number(rec[config.channel_mapping.ci.inc].value)
    }
    be.pushCi(ci)
}

function processSurveyRecord(record: WitsAttribute[]) {
    const rec: {[code: string]: WitsAttribute} = record.reduce((a, c) => ({...a, [c.code]: c}), {})
    const dstr = rec[config.channel_mapping.survey.time.date.tag].value
    const tstr = rec[config.channel_mapping.survey.time.time.tag].value
    const srv = {
        time: parse(tstr, config.channel_mapping.survey.time.time.format, 
            {
                backupDate: parse(dstr, config.channel_mapping.survey.time.date.format)
            }),
        md: Number(rec[config.channel_mapping.survey.md].value),
        gx: Number(rec[config.channel_mapping.survey.gx].value),
        gy: Number(rec[config.channel_mapping.survey.gy].value),
        gz: Number(rec[config.channel_mapping.survey.gz].value),
        bx: Number(rec[config.channel_mapping.survey.bx].value),
        by: Number(rec[config.channel_mapping.survey.by].value),
        bz: Number(rec[config.channel_mapping.survey.bz].value),
    }
    be.pushSurvey(srv)
}

function processRecord(record: WitsAttribute[], client?: string) {
    wits_logger.info('wits-record', {client, record})
    //console.log(record.map(a => ({...WitsDictionary[a.code], ...a})).map(a => `${a.code}(${a.mneml}): ${a.value}`).join('\t'))
    const record_fields = record.map(a => a.code)    
    if (ci_fields.every(f => record_fields.includes(f)))
        processCiRecord(record)
    if (survey_fields.every(f => record_fields.includes(f)))
        processSurveyRecord(record)
}

function onConnection(s: net.Socket) {
    const addr = `${s.remoteAddress}:${s.remotePort}`
    logger.log('info', `${addr} - CONNECT`)
    s.setEncoding('ascii')
    const wp = new WitsParser()
    s.on('data', (data: string) => {
        //console.log(`${addr} - DATA: ${data}`)
        let recs = wp.push(data)
        recs.forEach(r => processRecord(r, addr))
    })
    s.once('error', (e: Error & {code: string}) => {
        logger.warn(`${addr} - Error: ${e.code}`)
    })
    s.once('end', () => {
        logger.info(`${addr} - END`)
    })
}

const host = <string>opt.options.host || config.app.host
const port = Number(opt.options.port) || config.app.port
const server = new net.Server(onConnection)

server.on('error', (e: Error & {code: string}) => {
    if (e.code === 'EADDRINUSE') {
      logger.log('fatal', `Cannot listen on ${host}:${port} as it is already in use`);
      process.exit(1)
    }
    logger.log('error', `${e.code}:${e.message}`);
  });
server.on('listening', () => {
    logger.info(`Listening on ${host}:${port}`)
})
server.listen(port, host)

