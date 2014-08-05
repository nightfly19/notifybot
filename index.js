var irc = require("irc");
var amqp = require ("amqp");
var _ = require("underscore");
var settings = require("./settings.json");
var irc_conn;
var rconn = amqp.createConnection(settings.rabbit.server);

var queue;

var firstJoined = true;

rconn.on('ready', function(){
  console.log("Connection is ready");
  queue = rconn.queue(settings.rabbit.queue.name, settings.rabbit.queue.options, function(queue){
    irc_conn = new irc.Client(settings.irc.server, settings.irc.nick, settings.irc.options);

    irc_conn.on('registered', function(){
      irc_conn.join(settings.irc.channel + " " + settings.irc.channelKey);
    });

    irc_conn.on('join', function(channel){
      if(firstJoined){
        firstJoined = false;
        queue.subscribe({ack: true}, function(message){
          console.log("Got a message: " + message.data.toString());
          var formatFancy = function(message){
            console.log("Formatting: " + JSON.stringify(message));
            if(_.isArray(message)){
              console.log("array")
              return message.map(function(subMessage){ return formatFancy(subMessage);}).join("");
            }
            if(_.isObject(message)){
              console.log("object")
              return irc.colors.wrap(message.color, message.message);
            }
            else{
              console.log("other")
              return message;
            }
          };
          try{
            var jsonMessage = JSON.parse(message.data.toString());
            irc_conn.say(settings.irc.channel, formatFancy(jsonMessage));
          }
          catch(err){
            console.log("Not a json message");
            console.log(err);
            irc_conn.say(settings.irc.channel, message.data.toString());
          }
          setTimeout(function(){
            queue.shift();
          }, settings.irc.floodDelay);
        });
      };
      console.log("Joined: " + channel);
    });

    irc_conn.on('error', function(error){
      console.log("IRC error");
    });

    console.log("Queue is ready");
  });
});

rconn.on('error', function(error){
  console.log("derp");
  console.log(error);
});
