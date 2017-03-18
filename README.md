# About this
A normalized format for webpack's errors and warnings. 

Webpack's error output is very verbose. However, I found it is diffcult to match it when I was using vscode. So I create this package to reformat the webpack's errors and warnings.

# Install

```
npm install --save-dev format-webpack-stats-errors-warnings
```

# How to use:

It is really simple, just use it in your webpack's callback function. Here is an example:

```js
webpack(webpackConfig, function (err, stats) {
    if (err) {
        console.error(err)
        throw err
    }
    
    // add this package here:
    console.log(require('format-webpack-stats-errors-warnings')(stats, config.PROJECT_ROOT))

    // You can still output the verbose default webpack's output
    process.stdout.write(stats.toString({
            colors: !!+process.env.DISABLE_OUTPUT_COLOR,
            modules: false,
            children: false,
            chunks: false,
            chunkModules: false
        }) + '\n')
})
```

## parameters: 

- stats: The second parameter of webpack callback function.
- projectRoot: The root path of your project. It is used to make output path be relative. If omitted, the output path will be absolute. 

## return:

- A formatted string. You must output it yourself.

# Difference with webpack's default output 

Webpack's:

```
Module not found: Error: Can't resolve 'something-not-exists' in 'xxxx\src'
 @ D:/workspaces/admin.mainaer/~/.6.4.0@babel-loader/lib!./~/.11.1.4@vue-loader/lib/selector.js?type=script&index=0!./src/App.vue 11:0-30
 @ ./src/App.vue
 @ ./src/main.js
```

This package's:

```
!>error: src\App.vue:32:0: Module not found: Error: Can't resolve 'something-not-exists' in 'xxxx\src'
```

Note: this package combined all errors into one line, and add line number and column number.


# problemMatcher for vscode:

You can use the following as `problemMatcher` in your `tasks.json` of vscode

```
{
    "owner": "webpack",
    "fileLocation": [
        "relative",
        "${workspaceRoot}"
    ],
    "pattern": {
        "regexp": "^!>(\\w+): (\\S+)?:(\\d+):(\\d+): (.*)$",
        "severity": 1,
        "file": 2,
        "line": 3,
        "column": 4,
        "message": 5
    }
}
```
