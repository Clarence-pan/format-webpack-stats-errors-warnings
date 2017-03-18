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

    return "\n" + _formatErrorsWarnings('error', errors, projectRoot) 
        + "\n" + _formatErrorsWarnings('warning', warnings, projectRoot)
}

/**
 * Format errors or warnings
 * @param {string} level 
 * @param {Array<Error>} list 
 * @param {String|null} projectRoot 
 */
function _formatErrorsWarnings(level, list, projectRoot){
    return list.map(x => {
        let file, line, col, message
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

            if (x.name === 'ModuleNotFoundError' && !line){
                line = _resolveModuleNotFoundErrorLineNum(x)
            }

            return `!>${level}: ${file}:${line}:${col}: ${message}`            
        } catch (e){
            console.warn(e)
            return ''
        }
    }).join("\n")
}

/**
 * Resolve the line num of ModuleNotFoundError
 * @param {ModuleNotFoundError} e  - the "ModuleNotFoundError"  of webpack
 */
function _resolveModuleNotFoundErrorLineNum(e){
    try{
        let m = e.message.match(MODULE_NOT_FOUND_ERR_MSG_PATTERN)
        if (!m){
            return 0
        }

        let targetModule = m[1]
        let sourceModuleContent = fs.readFileSync(e.module.resource, 'utf8')
        let requirePos = sourceModuleContent.indexOf(targetModule)
        if (requirePos <= 0){
            return 0
        }

        let lineNum = 1
        for (let i = 0; i < requirePos; i++){
            if (sourceModuleContent.charCodeAt(i) === 10){ // 10: "\n"
                lineNum++
            }
        }
        
        return lineNum
    } catch (e) {
        console.warn(e)
        return 0
    }
}