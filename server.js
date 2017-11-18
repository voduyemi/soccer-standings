'use strict'

const Hapi = require('hapi');
const request = require('request');
const news_req = require('request');
const Vision = require('vision');
const Handlebars = require('handlebars');
const LodashFilter = require('lodash.filter');
const LodashTake = require('lodash.take');

const server = new Hapi.Server();

server.connection({
	port: process.env.PORT || 3000
});

// Register vision for our views
server.register(Vision, (err) => {
	server.views({
		engines: {
			html: Handlebars
		},
		relativeTo: __dirname,
		path: './views',
	});
});

let req = request.defaults({
	headers: {
		'X-Auth-Token': 'd9f5a7e44bcd43fa9c8e6f9688662eb5',
	}
});

// Show teams standings
server.route({
	method: 'GET',
	path: '/',
	handler: function (request, reply) {
		req.get('http://api.football-data.org/v1/competitions/445/leagueTable', function (error, response, body) {
			if (error) {
				throw error;
			}

			const data = JSON.parse(body);

			news_req.get('https://newsapi.org/v2/top-headlines?sources=four-four-two&apiKey=e9bc5216f5ac463fa3759e0cab6fabae', function(error, response, body){
				if(error){
					console.log(`I encountered an Error retrieving the league news!!! : `+ error)
					throw error;
				}
				const articles = JSON.parse(body);
				reply.view('index', { result: data, articles: articles });
			});
			
		});
	}
});

// Show a particular team
server.route({
	method: 'GET',
	path: '/teams/{id}',
	handler: function (request, reply) {
		const teamID = encodeURIComponent(request.params.id);

		req.get(`http://api.football-data.org/v1/teams/${teamID}`, function (error, response, body) {
			if (error) {
				throw error;
			}
			
			const result = JSON.parse(body);

			req.get(`http://api.football-data.org/v1/teams/${teamID}/fixtures`, function (error, response, body) {
				if (error) {
					throw error;
				}

				const fixtures = LodashTake(LodashFilter(JSON.parse(body).fixtures, function (match) {
					return match.status === 'SCHEDULED';
				}), 5);
				
				req.get(`http://api.football-data.org/v1/teams/${teamID}/players`, function (error, response, body) {
					if (error) {
						throw error;
						console.log(`I failed to get the players :` + error);
					}

					const players = JSON.parse(body);
					reply.view('team', { result: result, fixtures: fixtures, players: players });

				});
				
			});

			
		});
	}
});

// A simple helper function that extracts team ID from team URL
Handlebars.registerHelper('teamID', function (teamUrl) {
	return teamUrl.slice(38);
});

server.start((err) => {
	if (err) {
		throw err;
	}

	console.log(`Server running at: ${server.info.uri}`);
});

