name 'ai-doorlock'
author 'TGIANN'
version '0.1.0'
license 'GPL-3.0-only'
description 'Door locks: doors from the admin panel, job access, synced lock state'
repository 'https://github.com/TGIANN/ai-doorlock'
fx_version 'cerulean'
game 'gta5'
node_version '22'

client_script 'dist/client.js'
server_script 'dist/server.js'


dependencies {
	'/onesync',
	'ai-core',
}

files {
	'locales/*.json',
	'data/doors.json',
}
