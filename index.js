require('./helper')
let path = require('path')
let originalfs = require('fs')
let fs = require('fs').promise
let express = require('express')
let morgan = require('morgan')
let trycatch = require('trycatch')
let wrap = require('co-express')
let bodyParser = require('simple-bodyparser')
let mime = require('mime-types')
let rimraf = require('rimraf-promise')
let mkdirp = require('mkdirp-promise')
let archiver = require('archiver')
let net = require('net')
let JsonSocket = require('json-socket')
let chokidar = require('chokidar')
let argv = require('yargs')
			.usage('node $0 [options]')
			.option('d', {
				alias: 'dir',
				description: 'Directory of files',
				default: process.cwd()
			}).argv

const ROOT_DIR = path.resolve(argv.dir)

let clientSockets = []

function* main() {
	let app = express()
	app.use(morgan('dev'))

	app.use((req, res, next) => {
		trycatch(next, e => {
			console.log(e.stack)
			res.writeHead(500)
			res.end(e.stack)
		})
	})

	let tcpServer = net.createServer()
	tcpServer.on('connection', function(socket) {
		socket = new JsonSocket(socket)
		clientSockets.push(socket)
	})



	app.get('*', wrap(setFileMeta), checkFile, wrap(setHeaders), wrap(read))
	app.head('*', wrap(setFileMeta), checkFile, wrap(setHeaders), (req, res) => res.end())
	app.delete('*', wrap(setFileMeta), checkFile, setDirDetails, wrap(remove), notifyFileDeleted)
	app.put('*', wrap(setFileMeta), setDirDetails, wrap(create), notifyFileModified)
	app.post('*', wrap(setFileMeta), checkFile, setDirDetails, wrap(update), notifyFileModified)

	app.all('*', (req, res) => res.end('hello world\n'))

	let port = 8000
	let tcpPort = 8001
	app.listen(port)
	console.log(`LISTENING @ http://127.0.0.1:${port}`)

	tcpServer.listen(tcpPort)
	console.log(`TCP LISTENING @ http://127.0.0.1:${tcpPort}`)

	chokidar.watch(ROOT_DIR, {presistent: true})
		.on('addDir', (path) => notifyModified(path, true))
		.on('add', (path) => notifyModified(path))
		.on('change', (path) => notifyModified(path))
		.on('unlink', (path) => {
			for(let socket of clientSockets) {
				socket.sendMessage(
					{
						"action" : "delete", 
						"type" : "file",
						"file" : path.substring(ROOT_DIR.length)
					}
				)
			}
		})
		.on('unlinkDir', (path) => {
			for(let socket of clientSockets) {
				socket.sendMessage(
					{
						"action" : "delete", 
						"type" : "dir",
						"file" : path.substring(ROOT_DIR.length)
					}
				)
			}
		})
}

function notifyFileDeleted(req, res) {
	for(let socket of clientSockets) {
		socket.sendMessage(
			{
				"action" : "delete", 
				"file" : req.filePath.substring(ROOT_DIR.length),
				"type" : req.isDir ? "dir" : "file"
			}
		)
	}
}

function notifyFileModified(req, res) {
	notifyModified(req.filePath, req.isDir)
}

function notifyModified(filePath, isDirectory) {
	for(let socket of clientSockets) {
		socket.sendMessage(
			{
				"action" : "write", 
				"type" : isDirectory ? "dir" : "file",
				// "update" : fileStat.mtime.getTime(),
				"file" : filePath.substring(ROOT_DIR.length),
			}
		)
	}
}

function* read(req, res) {
	if(res.body) {
		res.json(res.body)
		return
	}
	if(req.fileStat.isDirectory()) {
		return
	}

	let data = yield fs.readFile(req.filePath)
	res.write(data)
	// originalfs.createReadStream(req.filePath).pipe(res)
	res.end()
}

function* remove(req, res, next) {
	if(req.fileStat.isDirectory) {
		let r = yield rimraf(req.filePath)
	} else {
		yield fs.unlink(req.filePath)
	}
	res.end()
	next()
}

function* create(req, res, next) {
	if(req.fileStat) {
		res.status(405).send('File exist')
		return
	}
	yield mkdirp(req.dirPath)
	if(!req.isDir) req.pipe(originalfs.createWriteStream(req.filePath))
	res.end()
	next()
}

function* update(req, res, next) {
	if(req.isDir) return res.status(405).send('Path is a Directory')
	yield fs.truncate(req.filePath, 0)
	req.pipe(originalfs.createWriteStream(req.filePath))
	res.end()
	next()
}

function setDirDetails(req, res, next) {
	let endsWithSlash = req.filePath.charAt(req.filePath.length - 1) === path.sep
	let hasExt = path.extname(req.filePath) !== ''
	req.isDir = endsWithSlash || !hasExt
	req.dirPath = req.isDir ? req.filePath : path.dirname(req.filePath)	
	next()
}

function* setFileMeta(req, res, next) {
	req.filePath = path.resolve(path.join(ROOT_DIR, req.url))
	if(req.filePath.indexOf(ROOT_DIR) !== 0) {
		res.send(400, 'Invalid path')
		return
	}
	try {
		req.fileStat = yield fs.stat(req.filePath)
	} catch (e) {
	}
	next()
}

function checkFile(req, res, next) {
	if(!req.fileStat) {
		res.status(400).send('Invalid path')
		return
	}
	next()
}

function* setHeaders(req, res, next) {
	if(req.fileStat.isDirectory()) {
		if(req.headers['accept'] === 'application/x-gtar') {
			let archive = archiver('tar')
			archive.pipe(res)
			archive.bulk([
				{ expand: true, cwd: req.filePath, src: ['**']}
			])
			archive.finalize()
			// return res.end()			
		} else {
			let files = yield fs.readdir(req.filePath)
			res.body = JSON.stringify(files)
			res.header('Content-Lenght', res.body.length)
			res.header('Content-Type', 'application/json')			
		}
	} else {
		res.header('Content-Lenght', req.fileStat.size)
		res.header('Content-Type', mime.contentType(path.extname(req.filePath)))		
	}
	next()
}

module.exports = main
