// Require the necessary discord.js classes
const { Client, Intents, MessageAttachment, MessageEmbed } = require('discord.js');
//const { userMention } = require('@discordjs/builders')
const { token } = require('./config.json');
const fetch = require('node-fetch');
const sharp = require('sharp');

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
    
    interaction.reply({content: `*\`...loading\`*`, fetchReply: true })
      .then(lastMsg=> {
	//console.log(lastMsg);
	// inital performance take
	let initTime = performance.now();
	promptImage(msgreq)
	  .then(res => {
	    return res.json()
	  })
	  .then((arr)=>{
		let buffers = []
	    let files = arr.images
						.map((img)=>{
							return new Buffer.from(img, "base64");
						})
						.map((buff,index)=>{
							buffers.push(buff);
							return new MessageAttachment(buff,`output${index}.png`);
						});
						
		let promptGrid = [];
		
		sharp({
			create:{
				width: 768,
				height: 768,
				channels: 3,
				background: {r:150,g:150,b:150}
			}
		}).composite([
			{input:buffers[0], top:0,    left:0   },
			{input:buffers[1], top:0,    left:256 },
			{input:buffers[2], top:0,    left:512 },
			{input:buffers[3], top:256,  left:0   },
			{input:buffers[4], top:256,  left:256 },
			{input:buffers[5], top:256,  left:512 },
			{input:buffers[6], top:512,  left:0   },
			{input:buffers[7], top:512,  left:256 },
			{input:buffers[8], top:512,  left:512 },
		])
		.toFormat('png')
		//.toFile("./result.png")
		.toBuffer((err, data, info)=>{
			//console.log(info);
			promptGrid = [new MessageAttachment(data,`promptGrid.png`)];
		});
		
		 
		

	    // let embeds = files   
		// 				.map((file,index)=>{
		// 					switch(index){
		// 						case 0 :
		// 							return new MessageEmbed()
		// 							.setTitle(msgreq)
		// 							.setURL("https://www.google.com")
		// 							.setImage(`attachment://output${index}.png`)
		// 							break;
		// 						case 1 :
		// 						case 2 :
		// 						case 3 :
		// 						case 4 :
		// 							return new MessageEmbed()
		// 							.setURL("https://huggingface.co/spaces/dalle-mini/dalle-mini")
		// 							.setImage(`attachment://output${index}.png`)
		// 							break;
		// 						case 5 :
		// 						case 6 :
		// 						case 7 :
		// 						case 8 :
		// 							return new MessageEmbed()
		// 							.setURL("https://www.craiyon.com/")
		// 							.setImage(`attachment://output${index}.png`)
		// 							break;
		// 						default :
		// 							console.log("no images")
		// 					}      
		// 				})
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
	    interaction.editReply({ content: `*\`formatting\`*`, embeds: [], files: files, fetchReply: true })
			.then((lastMsg) => {
				console.log(lastMsg.attachments.map(k=>k.proxyURL));
				console.log(lastMsg.attachments);
				console.log(interaction.user.id);
				let lastAttachURL = lastMsg.attachments.map(k=>k.proxyURL);
				let numLit = ["one","two","three","four","five","six","seven","eight","nine"];
				let linksField = lastAttachURL.map((k,index)=>{
					console.log(`[:${numLit[index]}:](${k})`);
					return `[:${numLit[index]}:](${k})`
				}).join(' ');
				resultEmbed = new MessageEmbed()
									.setAuthor({name:"DALL•E Mini",iconURL:"https://raw.githubusercontent.com/borisdayma/dalle-mini/main/img/logo.png"})
									.setTitle('Prompt')
									.setDescription(`*"${msgreq}"*`)
									.setColor('#252525')
									.addFields({
										name: "Files",
										value: linksField
									})
									.setImage(`attachment://promptGrid.png`)
									.setFooter({	text: `requested by ${interaction.user.username}`, 
													iconURL: `https://cdn.discordapp.com/avatars/${interaction.user.id}/${interaction.user.avatar}.jpg`})

				// Calculate Performace
				let finalTime = performance.now();
				var timeDiff = finalTime - initTime; 
				timeDiff /= 1000; 
				var seconds = Math.round(timeDiff);
				interaction.editReply({ content: `*\`${seconds} sec elapsed\`*`, embeds:[resultEmbed], files: promptGrid,  fetchReply: true })
			});
	  })
	})
  }
});

// Login to Discord with your client's token
client.login(token);
