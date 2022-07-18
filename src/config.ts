import { readFileSync, writeFileSync } from "fs"
import _ from 'lodash'
import { ILogConfig } from "./logger"


interface IConfig {
    app: { 
        host: string, 
        port: number,
        logs: ILogConfig
    },
    mwdstd: {
        url: string,
        auth: {login: string, password: string},
        autocor: boolean,
        timeout: number,
        buffer?: string
    },
    channel_mapping: {
        survey: {
            time: {
                date: {tag: string, format: string}
                time: {tag: string, format: string}
            },
            md: string, 
            gx: string, 
            gy: string, 
            gz: string, 
            bx: string, 
            by: string, 
            bz: string, 
        },
        ci: {
            md: string, 
            inc: string, 
        }
    },
    units: any,
    axis_mapping: any,
    wits_dictionary: any
}

const default_config: IConfig = {
    app: {
        host: "localhost",
        port: 6789,
        logs: {
            main: [
                {"dirname": "log", "filename": "error.log", "level": "info"}
            ],
            wits: { dirname: "log", filename: "wits.log"},
            console: true
        }
    },
    mwdstd: {
        url: 'http://localhost:8000/',
        auth: {login: 'username', password: 'password_here'},
        autocor: true,
        timeout: 30,
    },
    channel_mapping: {
        survey: {
            time: {time: {tag: "0706", format: "HHmmss"}, date: {tag: "0705", format: "YYMMDD"}},
            md: "0708",
            gx: "0722",
            gy: "0723",
            gz: "0724",
            bx: "0725",
            by: "0726",
            bz: "0727",
        },
        ci: {
            md: "0118",
            inc: "0116"
        }
    },
    units: {
        acceleration: 'mgn',
        angle: 'deg',
        length: 'm',
        magind: 'nT',
    },
    axis_mapping: {
        gaxes: ['X', 'Y', 'Z'],
        maxes: ['X', 'Y', 'Z'],
        gaxesi: [false, false, false],
        maxesi: [false, false, false],
    },
    wits_dictionary: {
        "0727": {
            "description": "< SPARE 6>",
            "mneml": "SPARE6",
            "mnems": "SPR6",
            "type": "F",
            "length": 4,
            "unit_metric": "---",
            "unit_fps": "----"
        },
        "0199": {
            "description": "Some timestamp",
            "mneml": "UDTM",
        }
    },
}

var config: IConfig = null

export function initConfig(config_file: string) {
    var json_config: any

    try {
        json_config = JSON.parse(readFileSync(config_file).toString())
    } catch {
        console.warn(`Can not open config file ${config_file}. Recreating...`)
        writeFileSync(config_file, JSON.stringify(default_config, null, 2))
    }
    
    config = _.merge(default_config, json_config)
}

export {config}