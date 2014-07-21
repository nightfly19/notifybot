var irc = require("irc");
var amqp = require ("amqp");
var settings = {
  rabbit:{
    server:{
      host: "amqp.server",
      port: 5672,
      login: "notifications",
      vhost: "VHOST",
      password: "password",
    },
    queue:{
      name:'notifications',
      options: {
        autoDelete: false,
        durable: true
      }
    }
  },
  irc:{
    server: 'irc.server',
    nick: 'NotifyBot',
    options:{
      port: 6697,
      secure: true,
    },
    channel: "channel",
    channelKey: "password",
    floodDelay: 1000
  }
};

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
          irc_conn.say(settings.irc.channel, message.data.toString());
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
