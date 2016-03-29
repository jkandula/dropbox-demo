require('./helper')
let request = require('http').request
let path = require('path')
let originalfs = require('fs')
let fs = require('fs').promise
let rimraf = require('rimraf-promise')
let mkdirp = require('mkdirp-promise')
let net = require('net')
let JsonSocket = require('json-socket')
let tar = require('tar-stream')
let argv = require('yargs')
			.usage('node $0 [options]')
			.option('d', {
				alias: 'dir',
				description: 'Directory of files',
				default: process.cwd()
			})
			.option('s', {
				alias: 'server',
				description: 'TCP Server',
				default: 'http://127.0.0.1:8001'
			})
			.argv

const ROOT_DIR = path.resolve(argv.dir)
const SERVER_URL = path.resolve(argv.server)

function copyFilesFromRemote(filePath) {
	console.log('Fetching folder:' + filePath)
	let extract = tar.extract()
	extract.on('entry', function(header, stream, callback) {
		let filePath = path.resolve(path.join(ROOT_DIR, header.name))
		console.log(filePath)
		if(header.type === 'directory') {
			mkdirp(filePath)
		}
		stream.on('data', function(data) {
			originalfs.createWriteStream(filePath, {
				flags: 'w',
				path: filePath,
				mode: header.mode
			}).write(data)
		})
		stream.on('end', function() {

			callback()
		})
		stream.resume()
	})
	let option = {
		host: '127.0.0.1',
		port: '8000',
		path: filePath,
		headers : {'Accept':'application/x-gtar'}
	}
	request(option, function(res) {
		res.pipe(extract, {end: true})
	}).end()
}

function* main() {
	copyFilesFromRemote('/')

	let socket = new JsonSocket(new net.Socket());
	socket.connect(8001, '127.0.0.1')
	socket.on('message', function(message) {
		if(message.action === 'write') {
			if(message.type === 'dir') {
				copyFilesFromRemote(message.file)
			} else {
				let filePath = path.resolve(path.join(ROOT_DIR, message.file))
				let option = {
					host: '127.0.0.1',
					port: '8000',
					path: message.file,
				}
				let fstream = originalfs.createWriteStream(filePath, {
					flags: 'w',
					path: filePath,
				})

				request(option, function(res) {
					res.pipe(fstream, {end: true})
				}).end()	
			}
		} else if (message.action === 'delete') {
			rimraf(path.resolve(path.join(ROOT_DIR, message.file)))
		}
	})
}

module.exports = main
