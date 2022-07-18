import { readFileSync, writeFileSync } from "fs"
import { config } from "./config"
import { logger } from "./logger";
import fetch from 'node-fetch'

const BUFFER_FILE = 'buffer.json'

const defaultUs = {
    'acceleration': 'm/s^2',
    'angle': 'deg',
    'density': 'g/ml',
    'diameter': 'mm',
    'length': 'm',
    'magind': 'nT',
    'mass': 'kg',
    'temperature': 'degC',
    'ratio': 'percent',
    'ratio_fine': 'fraction',
    'dls_interval': 30.,
    'gaxes': ['X', 'Y', 'Z'],
    'maxes': ['X', 'Y', 'Z'],
    'gaxesi': [false, false, false],
    'maxesi': [false, false, false]
}

class HttpError extends Error {
    name: 'HttpError' = 'HttpError'
    code: number
    constructor(code: number, message?: string) {
        super(message)
        Object.setPrototypeOf(this, HttpError.prototype);
        this.code = code
    }
}

class MwdStdConnector {
    private token?: string = null
    private requestsBuffer: any[] = []
    private bufferFilename: string = null
    constructor() {
        try{
            this.bufferFilename = config.mwdstd.buffer || BUFFER_FILE
            this.requestsBuffer = JSON.parse(readFileSync(this.bufferFilename).toString())
        } catch {
            logger.log('warn', 'Saved request buffer cannot be read')
            this.requestsBuffer = []
        }
        this.sendBuffer();
        ['SIGHUP', `SIGINT`, `SIGUSR1`, `SIGUSR2`, `uncaughtException`, `SIGTERM`].forEach(eventType => {
            process.on(eventType, () => {
                logger.log('info', `Caught termination signal: ${eventType}`)
                process.exit()
            })
        })
        process.on('exit', (code) => {
            if(code == 0) {
                logger.log('info', 'Saving unsent requests...')
                writeFileSync(this.bufferFilename, JSON.stringify(this.requestsBuffer, null, 2))
            }
        })
    }

    pushRequest(body: any) {
        this.requestsBuffer.push(body)
    }

    private async sendBuffer() {
        if (!this.token)
            await this.auth()
        while (this.token && this.requestsBuffer.length > 0) {
            try {
                let rq = this.requestsBuffer[0]
                const calc = this.requestsBuffer.length == 1 && config.mwdstd.autocor ? {calc:true} : {}
                await this.makeRequest('POST', `workflow/survey`, calc, rq)
                this.requestsBuffer.shift()
            } catch (error) {
                if (error.name === 'HttpError') {
                    if (error.code == 401) {
                        this.token = null
                        logger.log('info', 'Token expired will refresh on next try')
                        break
                    }
                    logger.log('error', `Unexpected response code: ${error.code}`)
                    break
                }
                logger.log('warn', 'Error in estabilishing connection to MWDSTD backend. Will retry')
                break
            }
        }
        setTimeout(async() => await this.sendBuffer(), config.mwdstd.timeout * 1000)        
    }

    private getUrl(url: string, params: {[key: string]: any} = {}) {
        const p = Object.keys(params).map(k => `${k}=${params[k]}`).join('&')
        return `${config.mwdstd.url}${url}${p ? `?${p}` : ''}`
    }

    private async auth() {
        try {
            const response = await fetch(this.getUrl('auth/signin'), {
                method: 'POST', 
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    provider: 'mwdstd',
                    args: {
                        login: config.mwdstd.auth.login,
                        password: config.mwdstd.auth.password
                    }
                })
            });
            if (!response.ok) throw new HttpError(response.status)
            this.token = (<any>await response.json())?.token;
        } catch (error) {
            if (error.name === 'HttpError') {
                if (error.code == 401) {
                    logger.log('error', 'Authentication failure. Please provide valid credentials')
                    return
                }
                logger.log('error', `Unexpected response code: ${error.code}`)
                return
            }
            logger.log('warn', 'Error in estabilishing connection to MWDSTD backend. Will retry')
        }
    }

    private async makeRequest(method: string, url: string, params: {[key: string]: any}, body?: any) : Promise<any> {
        const us = config.units || config.axis_mapping ? {
            us: Buffer.from(JSON.stringify({...defaultUs, ...config.units, ...config.axis_mapping})).toString('base64')} : {}
        let res = await fetch(this.getUrl(url, {...params, ...us}), {
            method, body: JSON.stringify(body),
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            }
        })
        if(!res.ok) {
            throw new HttpError(res.status)
        }
        let json = await res.json()
        return json
    }
}

export class MwdStdBackend {
    private cis: any[] = []
    private connector = new MwdStdConnector()
    constructor() {
    }
    pushCi(ci) {
        this.cis.push(ci)
    }
    pushSurvey(survey) {
        const body = {
            survey: {...survey, pre_qc: true},
            ci: this.cis
        }
        this.connector.pushRequest(body)
        this.cis = []
    }
}

