'use strict'
require('dotenv').config()
const fastify = require('fastify')({ logger: true })
fastify.register(require('@fastify/basic-auth'), { validate })
const axios = require('axios');

// INSECURE! use a password library
async function validate(username, password) {
	if (process.env.PROXY_USER !== username || process.env.PROXY_PASS !== password) { 
		return new Error('Invalid Auth')
	}
}

async function sendRequestToAvalara (requestSubdirectory, request) {
	const fullURL = `${process.env.AVALARA_URL}${requestSubdirectory}` 	// BASE_URL + REQUEST_SUBDIRECTORIES
	return axios.post(fullURL, request, {
		auth: {
			username: process.env.AVALARA_USER,
			password: process.env.AVALARA_PASS,
		}
	})
}

fastify.after(() => {
	// USAGE: https://localhost:3000/avalara/api/v2/transactions/create
	fastify.route({
		method: 'POST',
		url: '/avalara/*',
		onRequest: fastify.basicAuth,
		handler: async (req, reply) => {			
			const requestSubdirectory = req.params['*']
			try {
				const avalaraResponse = await sendRequestToAvalara(requestSubdirectory, req.body)
				console.log(JSON.stringify(avalaraResponse)) // Log to datadog/cloudwatch

				reply.header('Content-Type', 'application/json').code(200)
				return avalaraResponse
			}
			catch (ex) {
				reply.header('Content-Type', 'application/json').code(500)
				return 'unexpected server error'
			}
		}
	})
})

fastify.listen({ port: 3000 }, err => {
	if (err) throw err
})