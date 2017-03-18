module.exports = function (data, key, defaultValue){
    let keys = key.split('.')

    for (let i = 0, n = keys.length; i < n; i++){
        let k = keys[i]

        if (!data){
            return defaultValue
        }

        data = data[k]
    }

    return typeof data === 'undefined' ? defaultValue : data
}