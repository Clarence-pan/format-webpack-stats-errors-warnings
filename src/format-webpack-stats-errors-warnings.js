const path = require('path')
const fs = require('fs')
const data_get = require('./data-get')

const MODULE_NOT_FOUND_ERR_MSG_PATTERN = /Can't resolve ['"](\S+?)['"]/

/**
 * Format webpack's errors and warnings in webpack stats for better matching in editors like vscode
 * @param {*} stats         - the stats parameter of webpack callback
 * @param {*} projectRoot   - the root directory of your project - which is the base path of the output path. If omitted, the output path will be absolute.
 */
module.exports = function formatWebpackStatsErrorsWarnings(stats, projectRoot){
    if (!stats || !stats.compilation){
        return ''
    }

    let {errors, warnings} = stats.compilation
    let errorsStr = _formatErrorsWarnings('error', errors, projectRoot) 
    let warningsStr = _formatErrorsWarnings('warning', warnings, projectRoot)

    return "\n" + errorsStr + "\n" + warningsStr
}

/**
 * Format errors or warnings
 * @param {string} level 
 * @param {Array<Error>} list 
 * @param {String|null} projectRoot 
 */
function _formatErrorsWarnings(level, list, projectRoot){
    return list.map(x => {
        let file, line, col, endLine, endCol, message
        try{
            // resolve  the relative path 
            let fullFilePath = data_get(x, 'module.resource')
            file = fullFilePath && projectRoot ? path.relative(projectRoot, fullFilePath) : ''
            // file = file.replace(/[\\//]/g, '/')

            line = data_get(x, 'error.error.loc.line') || 0
            col = data_get(x, 'error.error.loc.column') || 0

            // only need first line of message
            let fullMessage = (x.message + '').trim()
            let crPos = fullMessage.indexOf("\n")
            if (crPos >= 0){
                message = fullMessage.substring(0, crPos)
            } else {
                message = fullMessage
            }

            if (!line){
                let linesColsInfo
                let m
                if (x.name === 'ModuleNotFoundError'
                    && (m = fullMessage.match(MODULE_NOT_FOUND_ERR_MSG_PATTERN))){
                    linesColsInfo = _resolveLineColNumInFile(fullFilePath, m[1])
                } else if (fullMessage.indexOf('component lists rendered with v-for should have explicit keys') > 0
                    && (m = fullMessage.match(/([a-zA-Z-_]+)\s+(v-for=['"].*?['"])/))){
                    linesColsInfo = _resolveLineColNumInFile(fullFilePath, m[2], {after: m[1]})
                } else if (m = fullMessage.match(/export ['"](\S+?)['"] was not found/)){
                    linesColsInfo = _resolveLineColNumInFile(fullFilePath, m[1], {after: 'import'})
                } else if (m = fullMessage.match(/Error compiling template:((?:.|[\r\n])*)- Component template/m)){
                    linesColsInfo = _resolveLineColNumInFile(fullFilePath, m[1].trim())
                    message = fullMessage.replace(/\n/g, ' ')
                }

                if (linesColsInfo){
                    line = linesColsInfo.line || 0
                    col = linesColsInfo.col || 0
                    endLine = linesColsInfo.endLine
                    endCol = linesColsInfo.endCol
                }
            }

            let endLinesCols = (endLine || endCol) ? ('~' + (endLine || '') + (endLine ? ',' : '') + (endCol || '0')) : ''

            return `!>${level}: ${file}:${line},${col}${endLinesCols}: ${message || '@see output window'}`            
        } catch (e){
            console.warn(e)
            return ''
        }
    }).join("\n")
}

/**
 * Resolve the line num of a message in a file
 */
function _resolveLineColNumInFile(file, message, options={}){
    if (!message){
        return {line: 0, col: 0}
    }

    let fileContent = fs.readFileSync(file, 'utf8')

    let beyondPos = 0

    switch (typeof options.after){
        case 'string':
            beyondPos = fileContent.indexOf(options.after)
            break
        case 'number':
            beyondPos = options.after
            break
        default:
            break
    }

    let pos = fileContent.indexOf(message, beyondPos >= 0 ? beyondPos : 0)
    if (pos <= 0){
        return {line: 0, col: 0}
    }

    let lineNum = 1
    let linePos = 0
    for (let i = 0; i < pos; i++){
        if (fileContent.charCodeAt(i) === 10){ // 10: "\n"
            lineNum++
            linePos = i
        }
    }
    
    return {line: lineNum, col: pos - linePos, endCol: pos - linePos + message.length}
}