import { logger } from "./logger"

const BEGIN_RECORD = '&&\r\n'
const END_RECORD = '!!\r\n'
const SEPARATOR = '\r\n'

export interface WitsAttribute {
    code: string
    value: string
}

function parseRecord(s: string) : WitsAttribute {
    if (s.length < 4) return null
    const code = s.slice(0, 4)
    return {
        code,
        value: s.slice(4)
    }    
}

export class WitsParser {
    private buffer: string
    push(s: string) {
        let buf = this.buffer
        if(buf)
            buf += s
        else
            buf = s

        const records: string[] = []
        while (buf.length > 0) {
            let start = buf.indexOf(BEGIN_RECORD)
            if (start < 0) break
            if (start > 0) {
                logger.debug(`Junk data in buffer. Removing...`, {junk: buf.slice(0, 4)})
                buf = buf.slice(start)
                start = 0
            }
            let end = buf.indexOf(END_RECORD)
            if(end < 0) break
            records.push(buf.slice(start + BEGIN_RECORD.length, end))
            buf = buf.slice(end + END_RECORD.length)
        }
        
        this.buffer = buf
        logger.debug('buffer-data', {buffer: this.buffer})
        return records.map(r => r.split(SEPARATOR).map(parseRecord).filter(x => x))
    }
}