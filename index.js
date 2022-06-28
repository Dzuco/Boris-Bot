// Require the necessary discord.js classes
const { Client, Intents, MessageAttachment, MessageEmbed } = require('discord.js');
const { token } = require('./config.json');
const fetch = require('node-fetch');

// Create a new client instance
const client = new Client({ intents: [Intents.FLAGS.GUILDS] });

// When the client is ready, run this code (only once)
client.once('ready', () => {
	console.log('Ready!');
});

// this function request craiyon's backend for images
// backends:
// https://bf.dallemini.ai/generate
// https://backend.craiyon.com/generate
function promptImage(promptMsg){
  return fetch("https://bf.dallemini.ai/generate",
          { method: 'POST',
            headers: {  
                Accept: "application/json",
                "Content-Type": "application/json"
                      },
            body: JSON.stringify({prompt: promptMsg.trim()})
          })
}

// This listens to interactions
client.on('interactionCreate', interaction => {
  if(!interaction.isCommand()) return;

  const { commandName } = interaction;

  if(commandName=='showme') {
    
    //obtain the prompt
    let msgreq = interaction.options.getString('prompt');
    
    //print the request to console
    console.log(`---${interaction.user.username} requested "${msgreq}"`)
    
    interaction.reply({content: "loading...", fetchReply: true })
      .then(lastMsg=> {
	//console.log(lastMsg);
	promptImage(msgreq)
	  .then(res => {
	    return res.json()
	  })
	  .then((arr)=>{
	    let files = arr.images
	      .map((img)=>{
		return new Buffer.from(img, "base64");
	      })
	      .map((buff,index)=>{
		return new MessageAttachment(buff,`output${index}.png`);
	      });
	    let embeds = files   
	      .map((file,index)=>{
		switch(index){
		  case 0 :
		    return new MessageEmbed()
		      .setTitle(msgreq)
		      .setURL("https://www.google.com")
		      .setImage(`attachment://output${index}.png`)
		    break;
		  case 1 :
		  case 2 :
		  case 3 :
		  case 4 :
		    return new MessageEmbed()
		      .setURL("https://huggingface.co/spaces/dalle-mini/dalle-mini")
		      .setImage(`attachment://output${index}.png`)
		    break;
		  case 5 :
		  case 6 :
		  case 7 :
		  case 8 :
		    return new MessageEmbed()
		      .setURL("https://www.craiyon.com/")
		      .setImage(`attachment://output${index}.png`)
		    break;
		  default :
		    console.log("no images")
		}      
	      })
	    // .map((file,index)=>{
	    //   return (index == 0)?
	    //   new discord.MessageEmbed()
	    //     .setTitle(msgreq)
	    //     .setURL("https://huggingface.co/spaces/dalle-mini/dalle-mini")
	    //     .setImage(`attachment://output${index}.png`)
	    //   :
	    //   new discord.MessageEmbed()
	    //     .setURL("https://huggingface.co/spaces/dalle-mini/dalle-mini")
	    //     .setImage(`attachment://output${index}.png`)
	    // })

	    //return { embeds: embeds, files: files };

	    interaction.editReply({ content:"result:", embeds: embeds, files: files });
	  })
      })
  }
});

// Login to Discord with your client's token
client.login(token);
