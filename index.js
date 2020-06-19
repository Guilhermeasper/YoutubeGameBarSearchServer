
/**
 * This file represents Youtube Game Bar Overlay's Search Server. It anonymously makes searches on YouTube 
 * by the given term using TimeForANinja's node-ytsr lib, parsing its results to the minimal useful JSON
 * which will be returned to YTGBO.
 * 
 * @author: Marconi Gomes (marconi.gomes7@gmail.com)
 */

const ytsr = require('ytsr');
const winston = require('winston');
var YTGBss = require('express')();
var bodyParser = require('body-parser');
var http = require('http').createServer(YTGBss);

/**
 * Creates a Logger instance.
 */
const logger = winston.createLogger({
  level: 'http',
  format: winston.format.prettyPrint(),
  transports: [
    new winston.transports.File({ filename: 'status.log'}),
    new winston.transports.Console()
  ]
});;

/**
 * Listens for connections on port 54522.
 */
http.listen(54522, () => {
  logger.log({timestamp: new Date().toUTCString(), level: 'info', message: 'Ready.'});
});

/**
 * Parses the bodyrequest body into JSON format.
 */
YTGBss.use(bodyParser.json());

/**
 * Handles POST requests on /search route. 
 * It makes the search by the term available on the request body.
 * 
 * We can expect the following results:
 * 200 OK - The search was sucessful. The result will be returned to requester.
 * 400 BAD REQUEST - The request body wasn't in the expected format. The status code is returned.
 * 500 INTERNAL SERVER ERROR - Something went wrong with search. The status code is returned.
 */
YTGBss.post('/search', (request, response, next) => {
  logger.log({timestamp: new Date().toUTCString(), level: 'http', message: 'Got search request...'});

  if (request.body.term !== undefined) {
    doSearch(request.body.term).then( function(parsedResults) {
      logger.log({level: 'info', message: 'Sucess.'})
      response.send(parsedResults);
    }).catch( function(errorData) {
      next({message: '500 INTERNAL SERVER ERROR', details: errorData});
    });
  } 
  else {
    next({message: '400 BAD REQUEST', details: 'Missing or malfunct body.'});
  }
});

/**
 * Uses the specified error handler.
 */
YTGBss.use(errorHandler);

/**
 * Handles the errors provided by the server, answering them accordingly to the client.
 */
function errorHandler(error, request, response, next) {
  logger.log({timestamp: new Date().toUTCString(), level: 'error', message: error.details})

  if (error.message.startsWith('500')) {
    response.status(500).send({error: 'Internal Server Error!'})
  } 
  else {
    response.status(400).send({error: 'Bad request!'})
  }
}

/**
 * Searchs for YouTube's videos results using node-ytsr lib.
 * 
 * @param {string} term The term to search results for.
 */
function doSearch(term) {
  return new Promise((resolve, reject) => {
    ytsr.getFilters(term, function (err, filters) {
      if (err) {
        reject(err);
      };
  
      filter = filters.get('Type').find(o => o.name === 'Video');
      var options = {
        limit: 5,
        nextpageRef: filter.ref
      };
  
      ytsr(null, options, function (err, searchResults) {
        if (err) {
          reject(err);
        };
  
        let parsedResults = parseResults(searchResults.items);
        resolve(parsedResults);
      });
    });
  });
}

/**
 * Parses and returns the search results with necessary information used by YTGBO.
 * 
 * @param {Array} results 
 */
function parseResults(results) {
  var parsedResults = [];

  for (let result of results) {
    var parsed = {};
    parsed.videoTitle = result.title;
    parsed.channelTitle = result.author.name;
    parsed.mediaUrl = result.link;

    parsedResults.push(parsed);
  }

  return parsedResults;
}