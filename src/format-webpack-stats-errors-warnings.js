const path = require('path')
const fs = require('fs')
const data_get = require('./data-get')

const MODULE_NOT_FOUND_ERR_MSG_PATTERN = /Can't resolve ['"](\S+?)['"]/
const VUE_V_FOR_EXPRESSION = /v-for=['"].*?['"]/

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
            file = data_get(x, 'module.resource')
            file = file && projectRoot ? path.relative(projectRoot, file) : ''
            // file = file.replace(/[\\//]/g, '/')

            line = data_get(x, 'error.error.loc.line') || 0
            col = data_get(x, 'error.error.loc.column') || 0

            // only need first line of message
            message = x.message + ''
            let crPos = message.indexOf("\n")
            if (crPos >= 0){
                message = message.substring(0, crPos)
            }

            if (!line){
                let linesColsInfo
                let m
                if (x.name === 'ModuleNotFoundError'
                    && (m = x.message.match(MODULE_NOT_FOUND_ERR_MSG_PATTERN))){
                    linesColsInfo = _resolveLineColNumInFile(x.module.resource, m[1])
                } else if (x.message.indexOf('component lists rendered with v-for should have explicit keys') > 0
                    && (m = x.message.match(VUE_V_FOR_EXPRESSION))){
                    linesColsInfo = _resolveLineColNumInFile(x.module.resource, m[0])
                }

                if (linesColsInfo){
                    line = linesColsInfo.line || 0
                    col = linesColsInfo.col || 0
                    endLine = linesColsInfo.endLine
                    endCol = linesColsInfo.endCol
                }
            }

            let endLinesCols = (endLine || endCol) ? ('~' + (endLine || '') + (endLine ? ',' : '') + (endCol || '0')) : ''

            return `!>${level}: ${file}:${line},${col}${endLinesCols}: ${message}`            
        } catch (e){
            console.warn(e)
            return ''
        }
    }).join("\n")
}

/**
 * Resolve the line num of a message in a file
 */
function _resolveLineColNumInFile(file, message){
    if (!message){
        return {line: 0, col: 0}
    }

    let fileContent = fs.readFileSync(file, 'utf8')
    let pos = fileContent.indexOf(message)
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